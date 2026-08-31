import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedIdentity } from "@/features/server-safe-ai/auth";
import { AI_LIMITS, assertRuntimeConfiguration, isConfiguredSlug } from "@/features/server-safe-ai/config";
import {
  AttachmentProblem, buildChatPrompt, extractAttachments, isStoredAttachment,
  type StoredAttachment,
} from "@/features/server-safe-ai/attachments";
import { buildRecentHistory, canStoreTurn, normalizedTitle } from "@/features/server-safe-ai/core";
import {
  createConversationRecord, InvalidModelKeyError, PUBLIC_MODEL_METADATA, requireModelKey,
  resolveConversationModelKey, setConversationModel,
} from "@/features/server-safe-ai/models";
import { runOpenHarness } from "@/features/server-safe-ai/sandbox";
import {
  executeCancellableTurn, linkedAbortController, onceAsync, throwIfAborted,
} from "@/features/server-safe-ai/chat-stream";
import {
  chatErrorPayload, createRuntimeContext, logRuntimeEvent,
} from "@/features/server-safe-ai/observability";
import {
  isSameOriginMutation,
} from "@/features/server-safe-ai/security";
import type { CanonicalOwnerId } from "@/features/server-safe-ai/security";
import {
  acquireConversationLock, acquireHarnessSlot, consumeRateLimit,
  consumeAttachmentRateLimit, mutateOwnerState, readAttachmentRecords, readOwnerState, StorageLimitError,
} from "@/features/server-safe-ai/storage";
import type { AttachmentMetadata, ChatAttachment } from "@/features/server-safe-ai/types";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

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
  owner: CanonicalOwnerId,
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
  let persistedMetadata = metadata;

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
    if (conversation.permanence_enabled) {
      persistedMetadata = metadata.map((item): AttachmentMetadata => ({ ...item, expires_at: null }));
    }
    const records: StoredAttachment[] = persistedMetadata.map((item, index) => ({
      ...item,
      conversation_id: conversationId,
      text: extracted[index].text,
    }));
    conversation.attachments = [...activeMetadata, ...persistedMetadata];
    conversation.updated_at = createdAt;
    attachments.store(records);
  });

  return persistedMetadata;
}

export async function setConversationPermanence(
  owner: CanonicalOwnerId,
  conversationId: string,
  enabled: boolean,
  now = Date.now(),
) {
  return mutateOwnerState(owner, async (state, attachments) => {
    const conversation = state.conversations.find((item) => item.conversation_id === conversationId);
    if (!conversation) throw new RequestProblem(404, "Conversa não encontrada.");
    const currentMetadata = conversation.attachments ?? [];
    const storedValues = await readAttachmentRecords(
      owner,
      currentMetadata.map((item) => item.attachment_id),
    );
    const expiresAt = enabled
      ? null
      : new Date(now + AI_LIMITS.attachmentTtlSeconds * 1000).toISOString();
    const retainedMetadata: AttachmentMetadata[] = [];
    const retainedRecords: StoredAttachment[] = [];
    const missingIds: string[] = [];

    currentMetadata.forEach((metadata, index) => {
      const stored = storedValues[index];
      if (!isStoredAttachment(stored, metadata.attachment_id, conversationId)) {
        missingIds.push(metadata.attachment_id);
        return;
      }
      const updatedMetadata: AttachmentMetadata = { ...metadata, expires_at: expiresAt };
      retainedMetadata.push(updatedMetadata);
      retainedRecords.push({ ...stored, ...updatedMetadata, expires_at: expiresAt });
    });

    if (missingIds.length) attachments.delete(missingIds);
    if (retainedRecords.length) attachments.store(retainedRecords);
    const retainedIds = new Set(retainedMetadata.map((item) => item.attachment_id));
    conversation.messages.forEach((message) => {
      if (!message.attachments?.length) return;
      const retained = message.attachments.filter((item) => retainedIds.has(item.attachment_id));
      if (retained.length) message.attachments = retained;
      else delete message.attachments;
    });
    conversation.attachments = retainedMetadata;
    conversation.permanence_enabled = enabled;
    conversation.updated_at = new Date(now).toISOString();
    return conversation;
  });
}

async function dispatch(request: NextRequest, context: Context) {
  const { slug, segments } = await context.params;
  if (!isConfiguredSlug(slug)) return json({ ok: false, error: "Não encontrado." }, 404);
  try { getSupabasePublicConfig(); }
  catch { return json({ ok: false, error: "AI Teste ainda não está configurada para autenticação." }, 503); }

  let identity;
  try {
    identity = await resolveAuthenticatedIdentity(await createSupabaseServerClient());
  } catch {
    return json({ ok: false, error: "Não foi possível validar a sessão." }, 503);
  }
  if (!identity) return json({ ok: false, error: "Autenticação necessária." }, 401);

  try { assertRuntimeConfiguration(); }
  catch { return json({ ok: false, error: "AI Teste ainda não está configurada." }, 503); }

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
      models: PUBLIC_MODEL_METADATA,
    });
    return response;
  }

  // Authenticated identity is the only owner source for all v2 state.
  const owner = identity.id;

  if (path === "projects" && request.method === "GET") {
    const state = await readOwnerState(owner);
    const projects = state.projects.map((project) => ({ ...project, conversation_count: state.conversations.filter((c) => c.project_id === project.project_id).length }));
    return json({ ok: true, projects });
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
    return json({ ok: true, project }, 201);
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
    return json({ ok: true, project });
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
    return json({ ok: true, moved_conversations: moved });
  }

  if (path === "conversations" && request.method === "GET") {
    const state = await readOwnerState(owner);
    const conversations = state.conversations.map(({ messages, attachments, ...conversation }) => ({
      ...conversation,
      model_key: resolveConversationModelKey(conversation),
      message_count: messages.length,
      attachment_count: attachments?.length ?? 0,
    }));
    return json({ ok: true, conversations });
  }
  if (path === "conversations" && request.method === "POST") {
    const data = await body(request);
    const conversation = await mutateOwnerState(owner, (state) => {
      if (state.conversations.length >= AI_LIMITS.maxConversations) throw new StorageLimitError();
      const now = new Date().toISOString();
      const value = createConversationRecord(randomUUID(), data.model_key, now);
      state.conversations.unshift(value); return value;
    });
    return json({ ok: true, conversation }, 201);
  }

  const modelMatch = path.match(/^conversations\/([^/]+)\/model$/);
  if (modelMatch && request.method === "PATCH") {
    const data = await body(request);
    const modelKey = requireModelKey(data.model_key);
    const lock = await acquireConversationLock(owner, modelMatch[1]);
    if (!lock.ok) throw new RequestProblem(409, "Aguarde a geração atual terminar para trocar o modelo.");
    try {
      const conversation = await mutateOwnerState(owner, (state) => {
        const value = state.conversations.find((item) => item.conversation_id === modelMatch[1]);
        if (!value) throw new RequestProblem(404, "Conversa não encontrada.");
        return setConversationModel(value, modelKey);
      });
      return json({ ok: true, conversation });
    } finally {
      await lock.release();
    }
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
    return json({ ok: true, attachments: metadata }, 201);
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
    return json({ ok: true, conversation });
  }

  const permanenceMatch = path.match(/^conversations\/([^/]+)\/permanence$/);
  if (permanenceMatch && request.method === "PATCH") {
    const data = await body(request);
    if (typeof data.enabled !== "boolean") {
      throw new RequestProblem(400, "A preferência de permanência deve ser verdadeira ou falsa.");
    }
    const conversation = await setConversationPermanence(
      owner,
      permanenceMatch[1],
      data.enabled,
    );
    return json({ ok: true, conversation });
  }

  const conversationMatch = path.match(/^conversations\/([^/]+)$/);
  if (conversationMatch && request.method === "GET") {
    const state = await readOwnerState(owner);
    const conversation = state.conversations.find((c) => c.conversation_id === conversationMatch[1]);
    if (!conversation) throw new RequestProblem(404, "Conversa não encontrada.");
    return json({
      ok: true,
      conversation: { ...conversation, model_key: resolveConversationModelKey(conversation) },
    });
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
    return json({ ok: true, conversation });
  }
  if (conversationMatch && request.method === "DELETE") {
    await mutateOwnerState(owner, (state, attachments) => {
      const index = state.conversations.findIndex((c) => c.conversation_id === conversationMatch[1]);
      if (index < 0) throw new RequestProblem(404, "Conversa não encontrada.");
      attachments.delete((state.conversations[index].attachments ?? []).map((item) => item.attachment_id));
      state.conversations.splice(index, 1);
    });
    return json({ ok: true });
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
    resolveConversationModelKey(active);
    if (!canStoreTurn(active, message)) throw new RequestProblem(409, "Esta conversa atingiu o limite de armazenamento. Crie uma nova conversa.");
    const now = Date.now();
    const allMetadata = active.attachments ?? [];
    const activeMetadata = allMetadata.filter((item) => active.permanence_enabled === true
      || (item.expires_at !== null && Date.parse(item.expires_at) > now));
    const storedValues = await readAttachmentRecords(owner, activeMetadata.map((item) => item.attachment_id));
    const documents: StoredAttachment[] = [];
    const unavailableNames = allMetadata
      .filter((item) => active.permanence_enabled !== true
        && (item.expires_at === null || Date.parse(item.expires_at) <= now))
      .map((item) => item.name);
    activeMetadata.forEach((metadata, index) => {
      const value = storedValues[index];
      const retentionMatches = active.permanence_enabled === true
        ? value?.expires_at === null
        : typeof value?.expires_at === "string" && Date.parse(value.expires_at) > now;
      if (isStoredAttachment(value, metadata.attachment_id, conversationId) && retentionMatches) {
        documents.push(value);
      } else unavailableNames.push(metadata.name);
    });
    if (attachmentIds.some((attachmentId) => !documents.some((document) => document.attachment_id === attachmentId))) {
      throw new RequestProblem(410, "Um dos documentos anexados expirou ou não está mais disponível. Anexe-o novamente.");
    }
    const messageAttachments = activeMetadata
      .filter((metadata) => attachmentIds.includes(metadata.attachment_id))
      .map(chatAttachment);
    const history = buildRecentHistory(active.messages);
    const prompt = buildChatPrompt(history, message, documents, unavailableNames);
    const runtime = createRuntimeContext();
    logRuntimeEvent(runtime, "CHAT_ACCEPTED", {});
    const lock = await acquireConversationLock(owner, conversationId);
    if (!lock.ok) throw new RequestProblem(409, "Já existe uma solicitação em andamento nesta conversa.");
    let modelKey;
    try {
      const lockedState = await readOwnerState(owner);
      const lockedConversation = lockedState.conversations.find((item) => item.conversation_id === conversationId);
      if (!lockedConversation) throw new RequestProblem(404, "Conversa não encontrada.");
      modelKey = resolveConversationModelKey(lockedConversation);
      runtime.modelKey = modelKey;
    } catch (error) {
      await lock.release();
      throw error;
    }
    if (await consumeRateLimit(owner) > AI_LIMITS.ratePerMinute) { await lock.release(); throw new RequestProblem(429, "Limite temporário de solicitações atingido."); }
    const harnessSlot = await acquireHarnessSlot(AI_LIMITS.maxConcurrency);
    if (!harnessSlot.ok) { await lock.release(); throw new RequestProblem(429, "O servidor está processando o limite de solicitações simultâneas."); }
    const encoder = new TextEncoder();
    const execution = linkedAbortController(request.signal);
    const cleanup = onceAsync(async () => {
      execution.dispose();
      await Promise.all([lock.release(), harnessSlot.release()]);
    });
    let streamClosed = false;
    let turnPromise: Promise<unknown> | null = null;
    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, payload: unknown) => {
          if (streamClosed || execution.controller.signal.aborted) return;
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
          } catch {
            streamClosed = true;
            execution.controller.abort();
          }
        };
        const close = () => {
          if (streamClosed) return;
          streamClosed = true;
          try { controller.close(); } catch { /* o consumidor já cancelou o stream */ }
        };
        send("activity", { label: "Processando..." });
        turnPromise = executeCancellableTurn({
          signal: execution.controller.signal,
          run: () => runOpenHarness(
            prompt,
            modelKey,
            (event) => send(event.type, event.type === "delta" ? { text: event.text } : { label: event.label }),
            execution.controller.signal,
            runtime,
          ),
          persist: async (answer) => {
            throwIfAborted(execution.controller.signal);
            const completedAt = new Date().toISOString();
            await mutateOwnerState(owner, (fresh) => {
              const conversation = fresh.conversations.find((c) => c.conversation_id === conversationId);
              if (!conversation) throw new Error("CONVERSATION_REMOVED");
              throwIfAborted(execution.controller.signal);
              conversation.messages.push(
                { role: "user", text: message, ...(messageAttachments.length ? { attachments: messageAttachments } : {}) },
                { role: "assistant", text: answer },
              );
              if (conversation.title === "Nova conversa" || conversation.messages.length === 2) conversation.title = normalizedTitle(message).slice(0, 60);
              conversation.updated_at = completedAt;
            }, { signal: execution.controller.signal });
          },
          onDone: () => send("done", { conversation_id: conversationId }),
          onError: () => send("error", chatErrorPayload(runtime.requestId)),
          cleanup,
          runtime,
        });
        void turnPromise.finally(close);
      },
      async cancel(reason) {
        streamClosed = true;
        execution.controller.abort(reason);
        if (turnPromise) await turnPromise;
        else await cleanup();
      },
    });
    const response = new Response(stream, { headers: { ...secureHeaders, "Content-Type": "text/event-stream; charset=utf-8", "X-Accel-Buffering": "no" } });
    return response;
  }

  return json({ ok: false, error: "Não encontrado." }, 404);
}

async function handle(request: NextRequest, context: Context) {
  try { return await dispatch(request, context); }
  catch (error) {
    if (error instanceof RequestProblem) return json({ ok: false, error: error.message }, error.status);
    if (error instanceof InvalidModelKeyError) return json({ ok: false, error: "Modelo inválido." }, 400);
    if (error instanceof AttachmentProblem) return json({ ok: false, error: error.message, code: error.code }, error.status);
    if (error instanceof StorageLimitError) return json({ ok: false, error: "O limite de armazenamento desta sessão foi atingido." }, 409);
    return json({ ok: false, error: "Não foi possível concluir a solicitação." }, 500);
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
