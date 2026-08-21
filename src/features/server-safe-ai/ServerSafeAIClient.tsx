"use client";

import {
  ChangeEvent, DragEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  ChevronDown, FileText, FolderInput, MessageSquarePlus, Paperclip, Pencil, Plus, Trash2, X,
} from "lucide-react";
import Markdown from "react-markdown";
import { isAbortError } from "./chat-stream";
import { safeMarkdownUrl } from "./markdown";
import styles from "./server-safe-ai.module.css";
import type { AttachmentMetadata, ChatAttachment, ChatMessage, Conversation, Project } from "./types";

type Summary = Omit<Conversation, "messages"> & { message_count: number; attachment_count: number };
type PendingAttachment = { id: string; file: File };
type Notice = { message: string; kind: "status" | "success" | "error" };
type DialogOption = { value: string; label: string };
type DialogState =
  | {
    kind: "text";
    title: string;
    description: string;
    confirmLabel: string;
    initialValue: string;
    resolve: (value: string | null) => void;
  }
  | {
    kind: "select";
    title: string;
    description: string;
    confirmLabel: string;
    initialValue: string;
    options: DialogOption[];
    resolve: (value: string | null) => void;
  }
  | {
    kind: "confirm";
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    resolve: (value: boolean) => void;
  };

const MAX_FILES_PER_UPLOAD = 3;
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

function displayBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function messageAttachment(metadata: AttachmentMetadata): ChatAttachment {
  return {
    attachment_id: metadata.attachment_id,
    name: metadata.name,
    media_type: metadata.media_type,
    size_bytes: metadata.size_bytes,
  };
}

export function ServerSafeAIClient({ basePath }: { basePath: string }) {
  const apiBase = `${basePath}/api`;
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Summary[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogValue, setDialogValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, sending]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const chatsByProject = useMemo(
    () => new Map(projects.map((project) => [
      project.project_id,
      conversations.filter((conversation) => conversation.project_id === project.project_id),
    ])),
    [projects, conversations],
  );
  const normalChats = conversations.filter((conversation) => !conversation.project_id);
  const permanenceEnabled = active?.permanence_enabled === true;

  function showNotice(messageValue: string, kind: Notice["kind"] = "status") {
    setNotice({ message: messageValue, kind });
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

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = "";
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  async function openConversation(id: string, clearNotice = true) {
    try {
      const data = await request(`conversations/${encodeURIComponent(id)}`);
      setActive(data.conversation);
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

  async function renameConversation(item: Summary) {
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

  async function moveConversation(item: Summary) {
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

  async function removeConversation(item: Summary) {
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

  function renderConversationRow(item: Summary) {
    return (
      <div
        key={item.conversation_id}
        className={`${styles.conversationRow} ${active?.conversation_id === item.conversation_id ? styles.active : ""}`}
      >
        <button
          type="button"
          className={styles.conversationTitle}
          onClick={() => openConversation(item.conversation_id)}
          disabled={sending}
        >
          <span>{item.title}</span>
          {item.attachment_count > 0 && (
            <span className={styles.attachmentBadge} title={`${item.attachment_count} anexo(s)`}>
              <Paperclip size={12} aria-hidden /> {item.attachment_count}
            </span>
          )}
        </button>
        <div className={styles.rowActions}>
          <button type="button" title="Renomear" aria-label="Renomear conversa" onClick={() => renameConversation(item)} disabled={sending}>
            <Pencil size={15} aria-hidden />
          </button>
          <button type="button" title="Mover" aria-label="Mover conversa" onClick={() => moveConversation(item)} disabled={sending}>
            <FolderInput size={15} aria-hidden />
          </button>
          <button type="button" title="Excluir" aria-label="Excluir conversa" onClick={() => removeConversation(item)} disabled={sending}>
            <Trash2 size={15} aria-hidden />
          </button>
        </div>
      </div>
    );
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

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>AI Teste</div>
        <button
          type="button"
          className={styles.newChat}
          onClick={() => {
            setActive(null);
            setMessage("");
            setPendingAttachments([]);
            setNotice(null);
          }}
          disabled={sending}
        >
          <MessageSquarePlus size={18} aria-hidden />
          <span>Nova conversa</span>
        </button>
        <div className={styles.sectionHeader}>
          <span>Projetos</span>
          <button type="button" onClick={createProject} aria-label="Novo projeto" title="Novo projeto" disabled={sending}>
            <Plus size={17} aria-hidden />
          </button>
        </div>
        <div className={styles.list}>
          {projects.map((project) => (
            <div key={project.project_id} className={styles.project}>
              <div className={styles.projectHeader}>
                <span><ChevronDown size={14} aria-hidden />{project.name}</span>
                <div className={styles.rowActions}>
                  <button type="button" title="Renomear" aria-label={`Renomear projeto ${project.name}`} onClick={() => renameProject(project)} disabled={sending}>
                    <Pencil size={15} aria-hidden />
                  </button>
                  <button type="button" title="Excluir" aria-label={`Excluir projeto ${project.name}`} onClick={() => removeProject(project)} disabled={sending}>
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              </div>
              {(chatsByProject.get(project.project_id) ?? []).map(renderConversationRow)}
            </div>
          ))}
        </div>
        <div className={styles.sectionHeader}><span>Chats</span></div>
        <div className={styles.list}>
          {normalChats.map(renderConversationRow)}
        </div>
      </aside>

      <section className={styles.chat}>
        <header className={styles.chatHeader}>
          <div className={styles.onlineLabel}><span className={styles.statusDot} />AI Teste</div>
          <strong>{active?.title ?? "Nova conversa"}</strong>
          <div className={styles.permanenceControl}>
            <span>Permanência do chat</span>
            <button
              type="button"
              role="switch"
              aria-checked={permanenceEnabled}
              aria-label={`Permanência do chat ${permanenceEnabled ? "ativada" : "desativada"}`}
              className={`${styles.switch} ${permanenceEnabled ? styles.switchOn : ""}`}
              onClick={updatePermanence}
              disabled={!active || sending}
            >
              <i />
            </button>
            <b>{permanenceEnabled ? "ON" : "OFF"}</b>
          </div>
        </header>

        {active && (
          <div className={styles.retentionInfo}>
            <span><strong>Mensagens:</strong> sem expiração automática.</span>
            <span>
              <strong>Documentos:</strong>{" "}
              {permanenceEnabled
                ? "sem expiração automática enquanto a permanência estiver ativa."
                : "expiram 7 dias após o upload."}
            </span>
          </div>
        )}

        <main className={styles.messages}>
          {!active?.messages.length && (
            <div className={styles.welcome}>
              <div className={styles.mark}>AI</div>
              <h1>Como posso ajudar?</h1>
              <p>Converse com a AI Teste, pesquise na web e organize seu trabalho em projetos.</p>
            </div>
          )}
          {active?.messages.map((item: ChatMessage, index) => (
            <div
              key={index}
              className={`${styles.messageRow} ${item.role === "user" ? styles.user : styles.assistant}`}
            >
              <div className={styles.bubble}>
                <b>{item.role === "user" ? "Você" : "AI Teste"}</b>
                {item.attachments?.length ? (
                  <div className={styles.messageAttachments}>
                    {item.attachments.map((attachment) => (
                      <span key={attachment.attachment_id}>
                        <FileText size={14} aria-hidden />{attachment.name}
                      </span>
                    ))}
                  </div>
                ) : null}
                {item.role === "assistant" ? (
                  <div className={styles.markdown}>
                    <Markdown
                      skipHtml
                      urlTransform={safeMarkdownUrl}
                      components={{
                        a: ({ children, href }) => href
                          ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                          : <span>{children}</span>,
                        img: ({ alt }) => <span>{alt || "Imagem não exibida"}</span>,
                      }}
                    >
                      {item.text}
                    </Markdown>
                  </div>
                ) : <div className={styles.plainText}>{item.text}</div>}
              </div>
            </div>
          ))}
          {sending && (
            <div className={`${styles.messageRow} ${styles.assistant}`}>
              <div className={styles.processing} aria-label="Processando resposta"><i /><i /><i /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        <footer
          className={`${styles.composer} ${dragActive ? styles.dragActive : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            const nextTarget = event.relatedTarget;
            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setDragActive(false);
          }}
          onDrop={onDrop}
        >
          {notice && (
            <div
              className={`${styles.notice} ${notice.kind === "error" ? styles.noticeError : ""} ${notice.kind === "success" ? styles.noticeSuccess : ""}`}
              role={notice.kind === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {notice.message}
            </div>
          )}
          <input
            ref={fileInputRef}
            className={styles.fileInput}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={onFileChange}
            disabled={sending}
          />
          {pendingAttachments.length > 0 && (
            <div className={styles.pendingAttachments}>
              {pendingAttachments.map((item) => (
                <div key={item.id} className={styles.pendingAttachment}>
                  <FileText size={16} aria-hidden />
                  <span><strong>{item.file.name}</strong><small>{displayBytes(item.file.size)}</small></span>
                  <button
                    type="button"
                    aria-label={`Remover ${item.file.name}`}
                    onClick={() => setPendingAttachments((items) => items.filter((candidate) => candidate.id !== item.id))}
                    disabled={sending}
                  >
                    <X size={16} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className={styles.composerRow}>
            <button
              type="button"
              className={styles.attachButton}
              aria-label="Anexar documentos"
              title="Anexar PDF, DOCX ou TXT"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <Paperclip size={20} aria-hidden />
            </button>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Digite sua mensagem…"
              disabled={sending}
            />
            {sending ? (
              <button type="button" className={styles.interruptButton} onClick={interrupt}>Interromper</button>
            ) : (
              <button
                type="button"
                className={styles.sendButton}
                onClick={send}
                disabled={!message.trim() && !pendingAttachments.length}
              >
                Enviar
              </button>
            )}
          </div>
          <small>
            PDF, DOCX ou TXT · até 3 arquivos · 3 MB cada · 4 MB por envio ·{" "}
            {permanenceEnabled ? "documentos sem expiração automática" : "documentos expiram em 7 dias"}
          </small>
        </footer>
      </section>

      {dialog && (
        <div className={styles.dialogBackdrop} onMouseDown={(event) => {
          if (event.target === event.currentTarget) cancelDialog();
        }}>
          <form
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
            onSubmit={(event) => { event.preventDefault(); confirmDialog(); }}
            onKeyDown={(event) => { if (event.key === "Escape") cancelDialog(); }}
          >
            <h2 id="dialog-title">{dialog.title}</h2>
            <p id="dialog-description">{dialog.description}</p>
            {dialog.kind === "text" && (
              <input
                autoFocus
                value={dialogValue}
                onChange={(event) => setDialogValue(event.target.value)}
                maxLength={80}
              />
            )}
            {dialog.kind === "select" && (
              <select autoFocus value={dialogValue} onChange={(event) => setDialogValue(event.target.value)}>
                {dialog.options.map((option) => (
                  <option value={option.value} key={option.value || "unfiled"}>{option.label}</option>
                ))}
              </select>
            )}
            <div className={styles.dialogActions}>
              <button type="button" className={styles.dialogCancel} onClick={cancelDialog}>Cancelar</button>
              <button
                type="submit"
                className={dialog.kind === "confirm" && dialog.destructive ? styles.dialogDanger : styles.dialogConfirm}
                disabled={dialog.kind === "text" && !dialogValue.trim()}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
