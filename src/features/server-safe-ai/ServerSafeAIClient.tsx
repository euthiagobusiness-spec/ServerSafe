"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";
import { performLogout } from "./auth";
import { isAbortError } from "./chat-stream";
import { ServerSafeAIComposer, type Notice, type PendingAttachment } from "./ServerSafeAIComposer";
import { ServerSafeAIDialog, type DialogOption, type DialogState } from "./ServerSafeAIDialog";
import { ServerSafeAIHeader } from "./ServerSafeAIHeader";
import { ServerSafeAIMessageList } from "./ServerSafeAIMessageList";
import { ServerSafeAISidebar, type ConversationSummary } from "./ServerSafeAISidebar";
import styles from "./server-safe-ai.module.css";
import type { AttachmentMetadata, ChatAttachment, ChatMessage, Conversation, Project } from "./types";

const MAX_FILES_PER_UPLOAD = 3;
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const SIDEBAR_PREFERENCE_KEY = "ssai-sidebar-collapsed:v1";
const SIDEBAR_PREFERENCE_EVENT = "ssai-sidebar-preference";

function readSidebarPreference() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeSidebarPreference(onStoreChange: () => void) {
  const handleChange = (event: Event) => {
    if (event instanceof StorageEvent && event.key !== SIDEBAR_PREFERENCE_KEY) return;
    onStoreChange();
  };
  window.addEventListener("storage", handleChange);
  window.addEventListener(SIDEBAR_PREFERENCE_EVENT, handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(SIDEBAR_PREFERENCE_EVENT, handleChange);
  };
}

function saveSidebarPreference(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_PREFERENCE_KEY, collapsed ? "1" : "0");
    window.dispatchEvent(new Event(SIDEBAR_PREFERENCE_EVENT));
  } catch {
    // A preferência visual é opcional; storage pode estar indisponível.
  }
}

function messageAttachment(metadata: AttachmentMetadata): ChatAttachment {
  return {
    attachment_id: metadata.attachment_id,
    name: metadata.name,
    media_type: metadata.media_type,
    size_bytes: metadata.size_bytes,
  };
}

export function ServerSafeAIClient({ basePath, userEmail }: { basePath: string; userEmail: string }) {
  const apiBase = `${basePath}/api`;
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogValue, setDialogValue] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileViewport, setMobileViewport] = useState(false);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebarPreference,
    readSidebarPreference,
    () => false,
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${apiBase}/${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        "X-ServerSafe-Request": "1",
        ...init.headers,
      },
    });
    const data = await response.json().catch(() => ({ error: "Resposta inválida." }));
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir a solicitação.");
    return data;
  }, [apiBase]);

  const refresh = useCallback(async () => {
    const [projectData, conversationData] = await Promise.all([
      request("projects"),
      request("conversations"),
    ]);
    setProjects(projectData.projects);
    setConversations(conversationData.conversations);
  }, [request]);

  useEffect(() => {
    request("session")
      .then(() => refresh())
      .catch((error) => setNotice({
        message: error instanceof Error ? error.message : "Falha ao carregar dados.",
        kind: "error",
      }));
  }, [request, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: sending ? "auto" : "smooth", block: "end" });
  }, [active?.messages, sending]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const updateViewport = () => {
      setMobileViewport(media.matches);
      if (!media.matches) setMobileSidebarOpen(false);
    };
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileSidebarOpen]);

  const permanenceEnabled = active?.permanence_enabled === true;

  function showNotice(messageValue: string, kind: Notice["kind"] = "status") {
    setNotice({ message: messageValue, kind });
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    abortRef.current?.abort();
    try {
      const result = await performLogout(createSupabaseBrowserClient().auth);
      if (!result.ok) {
        showNotice(result.message ?? "Não foi possível encerrar a sessão.", "error");
        setLoggingOut(false);
        return;
      }
      setProjects([]);
      setConversations([]);
      setActive(null);
      setPendingAttachments([]);
      window.location.replace(basePath);
    } catch {
      showNotice("Não foi possível encerrar a sessão.", "error");
      setLoggingOut(false);
    }
  }

  function askText(title: string, description: string, initialValue = "", confirmLabel = "Salvar") {
    return new Promise<string | null>((resolve) => {
      setDialogValue(initialValue);
      setDialog({ kind: "text", title, description, initialValue, confirmLabel, resolve });
    });
  }

  function askSelect(
    title: string,
    description: string,
    options: DialogOption[],
    initialValue: string,
    confirmLabel = "Mover",
  ) {
    return new Promise<string | null>((resolve) => {
      setDialogValue(initialValue);
      setDialog({ kind: "select", title, description, options, initialValue, confirmLabel, resolve });
    });
  }

  function askConfirm(
    title: string,
    description: string,
    confirmLabel: string,
    destructive = false,
  ) {
    return new Promise<boolean>((resolve) => {
      setDialog({ kind: "confirm", title, description, confirmLabel, destructive, resolve });
    });
  }

  function cancelDialog() {
    if (!dialog) return;
    if (dialog.kind === "confirm") dialog.resolve(false);
    else dialog.resolve(null);
    setDialog(null);
  }

  function confirmDialog() {
    if (!dialog) return;
    if (dialog.kind === "confirm") dialog.resolve(true);
    else if (dialog.kind === "select") dialog.resolve(dialogValue);
    else {
      const value = dialogValue.trim();
      if (!value) return;
      dialog.resolve(value);
    }
    setDialog(null);
  }

  function toggleSidebarCollapsed() {
    saveSidebarPreference(!sidebarCollapsed);
  }

  function toggleSidebar() {
    if (mobileViewport) {
      setMobileSidebarOpen((current) => !current);
      return;
    }
    toggleSidebarCollapsed();
  }

  function startNewConversation() {
    setActive(null);
    setMessage("");
    setPendingAttachments([]);
    setNotice(null);
    setMobileSidebarOpen(false);
  }

  function addFiles(files: File[]) {
    if (sending || !files.length) return;
    const accepted: PendingAttachment[] = [];
    let totalBytes = pendingAttachments.reduce((total, item) => total + item.file.size, 0);
    for (const file of files) {
      const dot = file.name.lastIndexOf(".");
      const ext = dot > 0 ? file.name.slice(dot).toLowerCase() : "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        showNotice(`${file.name}: formato não permitido. Use PDF, DOCX ou TXT.`, "error");
        continue;
      }
      if (file.size <= 0) {
        showNotice(`${file.name}: o arquivo está vazio.`, "error");
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        showNotice(`${file.name}: cada arquivo pode ter no máximo 3 MB.`, "error");
        continue;
      }
      if (pendingAttachments.length + accepted.length >= MAX_FILES_PER_UPLOAD) {
        showNotice(`Envie no máximo ${MAX_FILES_PER_UPLOAD} arquivos por vez.`, "error");
        break;
      }
      if (totalBytes + file.size > MAX_UPLOAD_BYTES) {
        showNotice("O total selecionado excede 4 MB por envio.", "error");
        continue;
      }
      const duplicate = [...pendingAttachments, ...accepted].some((item) => item.file.name === file.name
        && item.file.size === file.size
        && item.file.lastModified === file.lastModified);
      if (duplicate) continue;
      accepted.push({ id: crypto.randomUUID(), file });
      totalBytes += file.size;
    }
    if (accepted.length) setPendingAttachments((items) => [...items, ...accepted]);
  }

  async function openConversation(id: string, clearNotice = true) {
    try {
      const data = await request(`conversations/${encodeURIComponent(id)}`);
      setActive(data.conversation);
      setMobileSidebarOpen(false);
      try { localStorage.setItem("ssai-last-conversation:v1", id); } catch { /* storage pode estar indisponível */ }
      if (clearNotice) setNotice(null);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Falha ao abrir conversa.", "error");
    }
  }

  async function createConversation(open = true, signal?: AbortSignal) {
    const data = await request("conversations", { method: "POST", body: "{}", signal });
    await refresh();
    if (open) setActive(data.conversation);
    return data.conversation as Conversation;
  }

  async function createProject() {
    const name = await askText("Novo projeto", "Digite um nome para organizar suas conversas.");
    if (!name) return;
    try {
      await request("projects", { method: "POST", body: JSON.stringify({ name }) });
      await refresh();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Falha ao criar projeto.", "error");
    }
  }

  async function renameConversation(item: ConversationSummary) {
    const title = await askText(
      "Renomear conversa",
      "Escolha um título curto e fácil de identificar.",
      item.title,
    );
    if (!title) return;
    try {
      await request(`conversations/${item.conversation_id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      await refresh();
      if (active?.conversation_id === item.conversation_id) setActive({ ...active, title });
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Falha ao renomear conversa.", "error");
    }
  }

  async function moveConversation(item: ConversationSummary) {
    const projectId = await askSelect(
      "Mover conversa",
      "Selecione o destino desta conversa.",
      [{ value: "", label: "Chats" }, ...projects.map((project) => ({
        value: project.project_id,
        label: project.name,
      }))],
      item.project_id ?? "",
    );
    if (projectId === null) return;
    try {
      await request(`conversations/${item.conversation_id}/project`, {
        method: "PATCH",
        body: JSON.stringify({ project_id: projectId || null }),
      });
      await refresh();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Falha ao mover conversa.", "error");
    }
  }

  async function removeConversation(item: ConversationSummary) {
    const confirmed = await askConfirm(
      "Excluir conversa",
      `A conversa “${item.title}” e seus documentos serão removidos. Esta ação não pode ser desfeita.`,
      "Excluir conversa",
      true,
    );
    if (!confirmed) return;
    try {
      await request(`conversations/${item.conversation_id}`, { method: "DELETE", body: "{}" });
      if (active?.conversation_id === item.conversation_id) setActive(null);
      await refresh();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Falha ao excluir conversa.", "error");
    }
  }

  async function renameProject(project: Project) {
    const name = await askText(
      "Renomear projeto",
      "Escolha o novo nome do projeto.",
      project.name,
    );
    if (!name) return;
    try {
      await request(`projects/${project.project_id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await refresh();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Falha ao renomear projeto.", "error");
    }
  }

  async function removeProject(project: Project) {
    const confirmed = await askConfirm(
      "Excluir projeto",
      `O projeto “${project.name}” será excluído. As conversas voltarão para Chats.`,
      "Excluir projeto",
      true,
    );
    if (!confirmed) return;
    try {
      await request(`projects/${project.project_id}`, { method: "DELETE", body: "{}" });
      await refresh();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Falha ao excluir projeto.", "error");
    }
  }

  async function updatePermanence() {
    if (!active || sending) return;
    const nextEnabled = !permanenceEnabled;
    if (nextEnabled) {
      const confirmed = await askConfirm(
        "Ativar permanência do chat",
        "As mensagens já ficam salvas sem expiração automática. Ao ativar, os documentos sensíveis atuais e novos desta conversa também permanecerão no Redis sem expiração automática enquanto a opção estiver ligada.",
        "Ativar permanência",
      );
      if (!confirmed) return;
    }
    try {
      const data = await request(`conversations/${active.conversation_id}/permanence`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      setActive(data.conversation);
      await refresh();
      showNotice(
        nextEnabled
          ? "Permanência ativada: documentos atuais e novos ficam sem expiração automática."
          : "Permanência desativada: os documentos passam a expirar em 7 dias a partir de agora.",
        "success",
      );
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Falha ao alterar permanência.", "error");
    }
  }

  function interrupt() {
    const controller = abortRef.current;
    if (!controller) return;
    abortRef.current = null;
    controller.abort();
    setSending(false);
    showNotice("Solicitação interrompida. A resposta parcial não foi salva.", "status");
  }

  async function send() {
    const typedText = message.trim();
    if ((!typedText && !pendingAttachments.length) || sending) return;
    const text = typedText || "Analise os documentos anexados.";
    const selectedAttachments = pendingAttachments;
    const controller = new AbortController();
    abortRef.current = controller;
    setSending(true);
    setMessage("");
    showNotice("Preparando solicitação...");
    let conversation = active;
    try {
      if (!conversation) conversation = await createConversation(false, controller.signal);
      let uploaded: AttachmentMetadata[] = [];
      if (selectedAttachments.length) {
        showNotice("Enviando e processando documentos...");
        const form = new FormData();
        form.append("conversation_id", conversation.conversation_id);
        selectedAttachments.forEach((item) => form.append("files", item.file, item.file.name));
        const upload = await request("attachments", {
          method: "POST",
          body: form,
          signal: controller.signal,
        });
        uploaded = upload.attachments as AttachmentMetadata[];
        setPendingAttachments([]);
        conversation = {
          ...conversation,
          attachments: [...(conversation.attachments ?? []), ...uploaded],
        };
        showNotice(`${uploaded.length} documento(s) processado(s) com segurança.`);
      }
      const userMessage: ChatMessage = {
        role: "user",
        text,
        ...(uploaded.length ? { attachments: uploaded.map(messageAttachment) } : {}),
      };
      const optimistic: Conversation = {
        ...conversation,
        messages: [...conversation.messages, userMessage],
      };
      setActive(optimistic);
      const response = await fetch(`${apiBase}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-ServerSafe-Request": "1" },
        body: JSON.stringify({
          message: text,
          conversation_id: conversation.conversation_id,
          attachment_ids: uploaded.map((item) => item.attachment_id),
        }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível processar a mensagem.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      let completed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const event = frame.match(/^event: (.+)$/m)?.[1];
          const raw = frame.match(/^data: (.+)$/m)?.[1];
          if (!raw) continue;
          const data = JSON.parse(raw) as Record<string, unknown>;
          if (event === "activity" && typeof data.label === "string") showNotice(data.label);
          if (event === "delta" && typeof data.text === "string") {
            answer += data.text;
            setActive({
              ...optimistic,
              messages: [...optimistic.messages, { role: "assistant", text: answer }],
            });
          }
          if (event === "error") throw new Error(
            typeof data.message === "string" ? data.message : "A solicitação não pôde ser concluída.",
          );
          if (event === "done") completed = true;
        }
      }
      if (!completed) throw new Error("A conexão foi encerrada antes da conclusão.");
      showNotice("Processamento concluído.", "success");
      await refresh();
      await openConversation(conversation.conversation_id, false);
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        if (conversation) setActive(conversation);
        if (typedText) setMessage(typedText);
        showNotice("Solicitação interrompida. A resposta parcial não foi salva.", "status");
      } else {
        if (typedText) setMessage(typedText);
        showNotice(error instanceof Error ? error.message : "Ocorreu um erro.", "error");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setSending(false);
    }
  }

  return (
    <div className={`${styles.shell} ${sidebarCollapsed ? styles.shellSidebarCollapsed : ""}`}>
      <ServerSafeAISidebar
        projects={projects}
        conversations={conversations}
        activeConversationId={active?.conversation_id ?? null}
        collapsed={sidebarCollapsed}
        mobileViewport={mobileViewport}
        mobileOpen={mobileSidebarOpen}
        disabled={sending}
        onToggleCollapsed={toggleSidebarCollapsed}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onNewConversation={startNewConversation}
        onCreateProject={() => { void createProject(); }}
        onOpenConversation={(conversationId) => { void openConversation(conversationId); }}
        onRenameConversation={(conversation) => { void renameConversation(conversation); }}
        onMoveConversation={(conversation) => { void moveConversation(conversation); }}
        onDeleteConversation={(conversation) => { void removeConversation(conversation); }}
        onRenameProject={(project) => { void renameProject(project); }}
        onDeleteProject={(project) => { void removeProject(project); }}
      />

      <section className={styles.chat} inert={mobileSidebarOpen ? true : undefined}>
        <ServerSafeAIHeader
          conversationTitle={active?.title ?? "Nova conversa"}
          hasActiveConversation={active !== null}
          permanenceEnabled={permanenceEnabled}
          disabled={sending}
          userEmail={userEmail}
          loggingOut={loggingOut}
          sidebarVisible={mobileViewport ? mobileSidebarOpen : !sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onTogglePermanence={() => { void updatePermanence(); }}
          onLogout={() => { void logout(); }}
        />

        <ServerSafeAIMessageList active={active} sending={sending} bottomRef={bottomRef} />

        <ServerSafeAIComposer
          value={message}
          sending={sending}
          pendingAttachments={pendingAttachments}
          notice={notice}
          onValueChange={setMessage}
          onAddFiles={addFiles}
          onRemoveAttachment={(attachmentId) => {
            setPendingAttachments((items) => items.filter((item) => item.id !== attachmentId));
          }}
          onSend={send}
          onInterrupt={interrupt}
        />
      </section>

      {dialog ? (
        <ServerSafeAIDialog
          dialog={dialog}
          value={dialogValue}
          onValueChange={setDialogValue}
          onCancel={cancelDialog}
          onConfirm={confirmDialog}
        />
      ) : null}
    </div>
  );
}
