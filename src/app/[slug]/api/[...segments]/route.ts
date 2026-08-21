import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { AI_LIMITS, assertRuntimeConfiguration, isConfiguredSlug } from "@/features/server-safe-ai/config";
import {
  AttachmentProblem, buildChatPrompt, extractAttachments, isStoredAttachment,
  type StoredAttachment,
} from "@/features/server-safe-ai/attachments";
import { buildRecentHistory, canStoreTurn, normalizedTitle } from "@/features/server-safe-ai/core";
import { runOpenHarness } from "@/features/server-safe-ai/sandbox";
import {
  isSameOriginMutation, ownerId,
} from "@/features/server-safe-ai/security";
import {
  acquireConversationLock, acquireHarnessSlot, consumeRateLimit,
  consumeAttachmentRateLimit, mutateOwnerState, readAttachmentRecords, readOwnerState, StorageLimitError,
} from "@/features/server-safe-ai/storage";
import type { AttachmentMetadata, ChatAttachment } from "@/features/server-safe-ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Context = { params: Promise<{ slug: string; segments: string[] }> };
class RequestProblem extends Error { constructor(public status: number, message: string) { super(message); } }

const secureHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: secureHeaders });
}

async function body(request: NextRequest) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new RequestProblem(415, "Content-Type deve ser application/json.");
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > AI_LIMITS.bodyBytes) throw new RequestProblem(413, "Corpo da requisição excede o limite permitido.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > AI_LIMITS.bodyBytes) throw new RequestProblem(413, "Corpo da requisição excede o limite permitido.");
  try { return JSON.parse(raw || "{}") as Record<string, unknown>; }
  catch { throw new RequestProblem(400, "JSON inválido."); }
}

async function multipartBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;\s*boundary=/i.test(contentType)) {
    throw new RequestProblem(415, "Content-Type deve ser multipart/form-data.");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > AI_LIMITS.attachmentMultipartBodyBytes) {
    throw new RequestProblem(413, "O upload excede o limite de 4 MB por requisição.");
  }
  if (!request.body) throw new RequestProblem(400, "Upload vazio.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > AI_LIMITS.attachmentMultipartBodyBytes) {
      await reader.cancel().catch(() => undefined);
      throw new RequestProblem(413, "O upload excede o limite de 4 MB por requisição.");
    }
    chunks.push(value);
  }
  const raw = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => { raw.set(chunk, offset); offset += chunk.byteLength; });
  try {
    const parserRequest = new Request(request.url, {
      method: "POST",
      headers: { "content-type": contentType },
      body: raw.buffer,
    });
    return await parserRequest.formData();
  } catch {
    throw new RequestProblem(400, "Upload multipart inválido.");
  }
}

function chatAttachment(metadata: AttachmentMetadata): ChatAttachment {
  return {
    attachment_id: metadata.attachment_id,
    name: metadata.name,
    media_type: metadata.media_type,
    size_bytes: metadata.size_bytes,
  };
}

export async function persistAttachmentUpload(
  owner: string,
  conversationId: string,
  files: File[],
  now = Date.now(),
) {
  const extracted = await extractAttachments(files);
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + AI_LIMITS.attachmentTtlSeconds * 1000).toISOString();
  const metadata: AttachmentMetadata[] = extracted.map((item) => ({
    attachment_id: randomUUID(),
    name: item.name,
    media_type: item.media_type,
    size_bytes: item.size_bytes,
    extracted_chars: item.text.length,
    created_at: createdAt,
    expires_at: expiresAt,
  }));
  const records: StoredAttachment[] = metadata.map((item, index) => ({
    ...item,
    conversation_id: conversationId,
    text: extracted[index].text,
  }));

  await mutateOwnerState(owner, (state, attachments) => {
    const conversation = state.conversations.find((item) => item.conversation_id === conversationId);
    if (!conversation) throw new RequestProblem(404, "Conversa não encontrada.");
    const activeMetadata = conversation.attachments ?? [];
    if (activeMetadata.length + metadata.length > AI_LIMITS.maxAttachmentsPerConversation) {
      throw new RequestProblem(413, `Cada conversa pode manter no máximo ${AI_LIMITS.maxAttachmentsPerConversation} documentos ativos.`);
    }
    const extractedChars = activeMetadata.reduce((total, item) => total + item.extracted_chars, 0)
      + metadata.reduce((total, item) => total + item.extracted_chars, 0);
    if (extractedChars > AI_LIMITS.conversationAttachmentChars) {
      throw new RequestProblem(
        413,
        `Os documentos ativos excederiam o limite de ${AI_LIMITS.conversationAttachmentChars.toLocaleString("pt-BR")} caracteres por conversa. Nenhum conteúdo foi truncado.`,
      );
    }
    conversation.attachments = [...activeMetadata, ...metadata];
    conversation.updated_at = createdAt;
    attachments.store(records);
  });

  return metadata;
}

function transferCookies(source: NextResponse, target: NextResponse | Response) {
  const value = source.headers.get("set-cookie");
  if (value) target.headers.set("set-cookie", value);
  return target;
}

async function dispatch(request: NextRequest, context: Context) {
  const { slug, segments } = await context.params;
  if (!isConfiguredSlug(slug)) return json({ ok: false, error: "Não encontrado." }, 404);
  try { assertRuntimeConfiguration(); }
  catch { return json({ ok: false, error: "ServerSafe AI ainda não está configurado." }, 503); }

  const path = segments.join("/");
  const mutation = request.method !== "GET" && request.method !== "HEAD";
  if (mutation && !isSameOriginMutation(request)) return json({ ok: false, error: "Origem da solicitação não permitida." }, 403);

  if (path === "session" && request.method === "GET") {
    const response = json({
      ok: true,
      attachment_limits: {
        max_files_per_upload: AI_LIMITS.maxAttachmentsPerUpload,
        max_files_per_conversation: AI_LIMITS.maxAttachmentsPerConversation,
        max_file_bytes: AI_LIMITS.attachmentBytes,
        max_request_bytes: AI_LIMITS.attachmentRequestBytes,
        max_extracted_chars_per_file: AI_LIMITS.attachmentExtractedChars,
        max_extracted_chars_per_conversation: AI_LIMITS.conversationAttachmentChars,
        ttl_seconds: AI_LIMITS.attachmentTtlSeconds,
      },
    });
    ownerId(request, response, slug);
    return response;
  }

  const cookieCarrier = json({});
  const owner = ownerId(request, cookieCarrier, slug);

  if (path === "projects" && request.method === "GET") {
    const state = await readOwnerState(owner);
    const projects = state.projects.map((project) => ({ ...project, conversation_count: state.conversations.filter((c) => c.project_id === project.project_id).length }));
    return transferCookies(cookieCarrier, json({ ok: true, projects }));
  }
  if (path === "projects" && request.method === "POST") {
    const data = await body(request);
    const name = normalizedTitle(data.name, "");
    if (!name) throw new RequestProblem(400, "Nome do projeto é obrigatório.");
    const project = await mutateOwnerState(owner, (state) => {
      if (state.projects.length >= AI_LIMITS.maxProjects) throw new StorageLimitError();
      const now = new Date().toISOString();
      const value = { project_id: randomUUID(), name, created_at: now, updated_at: now };
      state.projects.unshift(value);
      return value;
    });
    return transferCookies(cookieCarrier, json({ ok: true, project }, 201));
  }

  const projectMatch = path.match(/^projects\/([^/]+)$/);
  if (projectMatch && request.method === "PATCH") {
    const data = await body(request);
    const name = normalizedTitle(data.name, "");
    if (!name) throw new RequestProblem(400, "Nome do projeto é obrigatório.");
    const project = await mutateOwnerState(owner, (state) => {
      const value = state.projects.find((p) => p.project_id === projectMatch[1]);
      if (!value) throw new RequestProblem(404, "Projeto não encontrado.");
      value.name = name; value.updated_at = new Date().toISOString(); return value;
    });
    return transferCookies(cookieCarrier, json({ ok: true, project }));
  }
  if (projectMatch && request.method === "DELETE") {
    const moved = await mutateOwnerState(owner, (state) => {
      const index = state.projects.findIndex((p) => p.project_id === projectMatch[1]);
      if (index < 0) throw new RequestProblem(404, "Projeto não encontrado.");
      state.projects.splice(index, 1);
      let count = 0;
      state.conversations.forEach((conversation) => { if (conversation.project_id === projectMatch[1]) { conversation.project_id = null; count += 1; } });
      return count;
    });
    return transferCookies(cookieCarrier, json({ ok: true, moved_conversations: moved }));
  }

  if (path === "conversations" && request.method === "GET") {
    const state = await readOwnerState(owner);
    const conversations = state.conversations.map(({ messages, attachments, ...conversation }) => ({
      ...conversation,
      message_count: messages.length,
      attachment_count: attachments?.length ?? 0,
    }));
    return transferCookies(cookieCarrier, json({ ok: true, conversations }));
  }
  if (path === "conversations" && request.method === "POST") {
    const conversation = await mutateOwnerState(owner, (state) => {
      if (state.conversations.length >= AI_LIMITS.maxConversations) throw new StorageLimitError();
      const now = new Date().toISOString();
      const value = { conversation_id: randomUUID(), project_id: null, title: "Nova conversa", created_at: now, updated_at: now, messages: [], attachments: [] };
      state.conversations.unshift(value); return value;
    });
    return transferCookies(cookieCarrier, json({ ok: true, conversation }, 201));
  }

  if (path === "attachments" && request.method === "POST") {
    if (await consumeAttachmentRateLimit(owner) > AI_LIMITS.attachmentUploadsPerMinute) {
      throw new RequestProblem(429, "Limite temporário de uploads atingido. Aguarde um minuto.");
    }
    const form = await multipartBody(request);
    const conversationId = String(form.get("conversation_id") ?? "").trim();
    if (!conversationId) throw new RequestProblem(400, "Conversa obrigatória para anexar documentos.");
    const initialState = await readOwnerState(owner);
    const initialConversation = initialState.conversations.find((conversation) => conversation.conversation_id === conversationId);
    if (!initialConversation) throw new RequestProblem(404, "Conversa não encontrada.");
    const values = form.getAll("files");
    const files = values.filter((value): value is File => typeof value !== "string");
    if (files.length !== values.length) throw new RequestProblem(400, "Upload contém campos de arquivo inválidos.");
    const metadata = await persistAttachmentUpload(owner, conversationId, files);
    return transferCookies(cookieCarrier, json({ ok: true, attachments: metadata }, 201));
  }

  const moveMatch = path.match(/^conversations\/([^/]+)\/project$/);
  if (moveMatch && request.method === "PATCH") {
    const data = await body(request);
    const projectId = data.project_id ? String(data.project_id) : null;
    const conversation = await mutateOwnerState(owner, (state) => {
      const value = state.conversations.find((c) => c.conversation_id === moveMatch[1]);
      if (!value) throw new RequestProblem(404, "Conversa não encontrada.");
      if (projectId && !state.projects.some((p) => p.project_id === projectId)) throw new RequestProblem(404, "Projeto não encontrado.");
      value.project_id = projectId; value.updated_at = new Date().toISOString(); return value;
    });
    return transferCookies(cookieCarrier, json({ ok: true, conversation }));
  }

  const conversationMatch = path.match(/^conversations\/([^/]+)$/);
  if (conversationMatch && request.method === "GET") {
    const state = await readOwnerState(owner);
    const conversation = state.conversations.find((c) => c.conversation_id === conversationMatch[1]);
    if (!conversation) throw new RequestProblem(404, "Conversa não encontrada.");
    return transferCookies(cookieCarrier, json({ ok: true, conversation }));
  }
  if (conversationMatch && request.method === "PATCH") {
    const data = await body(request);
    const title = normalizedTitle(data.title, "");
    if (!title) throw new RequestProblem(400, "Título é obrigatório.");
    const conversation = await mutateOwnerState(owner, (state) => {
      const value = state.conversations.find((c) => c.conversation_id === conversationMatch[1]);
      if (!value) throw new RequestProblem(404, "Conversa não encontrada.");
      value.title = title; value.updated_at = new Date().toISOString(); return value;
    });
    return transferCookies(cookieCarrier, json({ ok: true, conversation }));
  }
  if (conversationMatch && request.method === "DELETE") {
    await mutateOwnerState(owner, (state, attachments) => {
      const index = state.conversations.findIndex((c) => c.conversation_id === conversationMatch[1]);
      if (index < 0) throw new RequestProblem(404, "Conversa não encontrada.");
      attachments.delete((state.conversations[index].attachments ?? []).map((item) => item.attachment_id));
      state.conversations.splice(index, 1);
    });
    return transferCookies(cookieCarrier, json({ ok: true }));
  }

  if (path === "chat/stream" && request.method === "POST") {
    const data = await body(request);
    const message = String(data.message ?? "").trim();
    const conversationId = String(data.conversation_id ?? "").trim();
    const attachmentIds = Array.isArray(data.attachment_ids)
      ? [...new Set(data.attachment_ids.map((value) => String(value).trim()))]
      : [];
    if (!message) throw new RequestProblem(400, "Mensagem vazia.");
    if (message.length > AI_LIMITS.messageChars) throw new RequestProblem(413, "Mensagem excede o limite permitido.");
    if (attachmentIds.length > AI_LIMITS.maxAttachmentsPerUpload
      || attachmentIds.some((value) => !/^[0-9a-f-]{36}$/i.test(value))) {
      throw new RequestProblem(400, "Referências de anexos inválidas.");
    }
    const state = await readOwnerState(owner);
    const active = state.conversations.find((c) => c.conversation_id === conversationId);
    if (!active) throw new RequestProblem(404, "Conversa não encontrada.");
    if (!canStoreTurn(active, message)) throw new RequestProblem(409, "Esta conversa atingiu o limite de armazenamento. Crie uma nova conversa.");
    const now = Date.now();
    const allMetadata = active.attachments ?? [];
    const activeMetadata = allMetadata.filter((item) => Date.parse(item.expires_at) > now);
    const storedValues = await readAttachmentRecords(owner, activeMetadata.map((item) => item.attachment_id));
    const documents: StoredAttachment[] = [];
    const unavailableNames = allMetadata
      .filter((item) => Date.parse(item.expires_at) <= now)
      .map((item) => item.name);
    activeMetadata.forEach((metadata, index) => {
      const value = storedValues[index];
      if (isStoredAttachment(value, metadata.attachment_id, conversationId)) documents.push(value);
      else unavailableNames.push(metadata.name);
    });
    if (attachmentIds.some((attachmentId) => !documents.some((document) => document.attachment_id === attachmentId))) {
      throw new RequestProblem(410, "Um dos documentos anexados expirou ou não está mais disponível. Anexe-o novamente.");
    }
    const messageAttachments = activeMetadata
      .filter((metadata) => attachmentIds.includes(metadata.attachment_id))
      .map(chatAttachment);
    const history = buildRecentHistory(active.messages);
    const prompt = buildChatPrompt(history, message, documents, unavailableNames);
    const lock = await acquireConversationLock(owner, conversationId);
    if (!lock.ok) throw new RequestProblem(409, "Já existe uma solicitação em andamento nesta conversa.");
    if (await consumeRateLimit(owner) > AI_LIMITS.ratePerMinute) { await lock.release(); throw new RequestProblem(429, "Limite temporário de solicitações atingido."); }
    const harnessSlot = await acquireHarnessSlot(AI_LIMITS.maxConcurrency);
    if (!harnessSlot.ok) { await lock.release(); throw new RequestProblem(429, "O servidor está processando o limite de solicitações simultâneas."); }
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, payload: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
        send("activity", { label: "Processando..." });
        runOpenHarness(prompt, (event) => send(event.type, event.type === "delta" ? { text: event.text } : { label: event.label }), request.signal)
          .then(async (answer) => {
            const now = new Date().toISOString();
            await mutateOwnerState(owner, (fresh) => {
              const conversation = fresh.conversations.find((c) => c.conversation_id === conversationId);
              if (!conversation) throw new Error("CONVERSATION_REMOVED");
              conversation.messages.push(
                { role: "user", text: message, ...(messageAttachments.length ? { attachments: messageAttachments } : {}) },
                { role: "assistant", text: answer },
              );
              if (conversation.title === "Nova conversa" || conversation.messages.length === 2) conversation.title = normalizedTitle(message).slice(0, 60);
              conversation.updated_at = now;
            });
            send("done", { conversation_id: conversationId, updated_at: now });
          })
          .catch(() => send("error", { message: "A solicitação não pôde ser concluída." }))
          .finally(async () => { await Promise.all([lock.release(), harnessSlot.release()]); controller.close(); });
      },
      async cancel() { await Promise.all([lock.release(), harnessSlot.release()]); },
    });
    const response = new Response(stream, { headers: { ...secureHeaders, "Content-Type": "text/event-stream; charset=utf-8", "X-Accel-Buffering": "no" } });
    return transferCookies(cookieCarrier, response);
  }

  return json({ ok: false, error: "Não encontrado." }, 404);
}

async function handle(request: NextRequest, context: Context) {
  try { return await dispatch(request, context); }
  catch (error) {
    if (error instanceof RequestProblem) return json({ ok: false, error: error.message }, error.status);
    if (error instanceof AttachmentProblem) return json({ ok: false, error: error.message, code: error.code }, error.status);
    if (error instanceof StorageLimitError) return json({ ok: false, error: "O limite de armazenamento desta sessão foi atingido." }, 409);
    return json({ ok: false, error: "Não foi possível concluir a solicitação." }, 500);
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
