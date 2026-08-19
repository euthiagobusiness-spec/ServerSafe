"use client";

import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import styles from "./server-safe-ai.module.css";
import type { ChatMessage, Conversation, Project } from "./types";

type Summary = Omit<Conversation, "messages"> & { message_count: number };
type Activity = { label: string; time: string; error?: boolean };

export function ServerSafeAIClient({ basePath }: { basePath: string }) {
  const apiBase = `${basePath}/api`;
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Summary[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activity, setActivity] = useState<Activity[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${apiBase}/${path}`, {
      ...init,
      cache: "no-store",
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), "X-ServerSafe-Request": "1", ...init.headers },
    });
    const data = await response.json().catch(() => ({ error: "Resposta inválida." }));
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir a solicitação.");
    return data;
  }, [apiBase]);

  const refresh = useCallback(async () => {
    const [projectData, conversationData] = await Promise.all([request("projects"), request("conversations")]);
    setProjects(projectData.projects);
    setConversations(conversationData.conversations);
  }, [request]);

  useEffect(() => {
    request("session")
      .then(() => refresh())
      .catch((error) => {
        setActivity((items) => [
          ...items.slice(-39),
          {
            label: error instanceof Error
              ? error.message
              : "Falha ao carregar dados.",
            error: true,
            time: new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      });
  }, [request, refresh]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages, sending]);

  const chatsByProject = useMemo(() => new Map(projects.map((p) => [p.project_id, conversations.filter((c) => c.project_id === p.project_id)])), [projects, conversations]);
  const normalChats = conversations.filter((c) => !c.project_id);
  const addActivity = (label: string, error = false) => setActivity((items) => [...items.slice(-39), { label, error, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }]);

  async function openConversation(id: string) {
    try { const data = await request(`conversations/${encodeURIComponent(id)}`); setActive(data.conversation); localStorage.setItem("ssai-last-conversation", id); }
    catch (error) { addActivity(error instanceof Error ? error.message : "Falha ao abrir conversa.", true); }
  }

  async function createConversation(open = true) {
    const data = await request("conversations", { method: "POST", body: "{}" });
    await refresh(); if (open) setActive(data.conversation); return data.conversation as Conversation;
  }

  async function createProject() {
    const name = window.prompt("Nome do projeto:")?.trim(); if (!name) return;
    await request("projects", { method: "POST", body: JSON.stringify({ name }) }); await refresh();
  }

  async function renameConversation(item: Summary) {
    const title = window.prompt("Novo título da conversa:", item.title)?.trim(); if (!title) return;
    await request(`conversations/${item.conversation_id}`, { method: "PATCH", body: JSON.stringify({ title }) }); await refresh();
    if (active?.conversation_id === item.conversation_id) setActive({ ...active, title });
  }

  async function moveConversation(item: Summary) {
    const options = ["0 - Chats", ...projects.map((p, index) => `${index + 1} - ${p.name}`)].join("\n");
    const value = window.prompt(`Mover para:\n${options}`); if (value === null) return;
    const index = Number(value.trim()); if (!Number.isInteger(index) || index < 0 || index > projects.length) return;
    await request(`conversations/${item.conversation_id}/project`, { method: "PATCH", body: JSON.stringify({ project_id: index === 0 ? null : projects[index - 1].project_id }) }); await refresh();
  }

  async function removeConversation(item: Summary) {
    if (!window.confirm(`Excluir a conversa “${item.title}”?`)) return;
    await request(`conversations/${item.conversation_id}`, { method: "DELETE", body: "{}" });
    if (active?.conversation_id === item.conversation_id) setActive(null); await refresh();
  }

  async function renameProject(project: Project) {
    const name = window.prompt("Novo nome do projeto:", project.name)?.trim(); if (!name) return;
    await request(`projects/${project.project_id}`, { method: "PATCH", body: JSON.stringify({ name }) }); await refresh();
  }

  async function removeProject(project: Project) {
    if (!window.confirm(`Excluir o projeto “${project.name}”? As conversas voltarão para Chats.`)) return;
    await request(`projects/${project.project_id}`, { method: "DELETE", body: "{}" }); await refresh();
  }

  function ConversationRow({ item }: { item: Summary }) {
    return <div className={`${styles.conversationRow} ${active?.conversation_id === item.conversation_id ? styles.active : ""}`}>
      <button className={styles.conversationTitle} onClick={() => openConversation(item.conversation_id)}>{item.title}</button>
      <div className={styles.rowActions}>
        <button aria-label="Renomear conversa" onClick={() => renameConversation(item)}>✎</button>
        <button aria-label="Mover conversa" onClick={() => moveConversation(item)}>↗</button>
        <button aria-label="Excluir conversa" onClick={() => removeConversation(item)}>×</button>
      </div>
    </div>;
  }

  async function send() {
    const text = message.trim(); if (!text || sending) return;
    setSending(true); setMessage(""); setActivity([]); setActivityOpen(true); addActivity("Solicitação enviada");
    let conversation = active;
    try {
      if (!conversation) conversation = await createConversation(false);
      const optimistic: Conversation = { ...conversation, messages: [...conversation.messages, { role: "user", text }] };
      setActive(optimistic);
      const response = await fetch(`${apiBase}/chat/stream`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-ServerSafe-Request": "1" },
        body: JSON.stringify({ message: text, conversation_id: conversation.conversation_id }),
      });
      if (!response.ok || !response.body) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "Não foi possível processar a mensagem."); }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let answer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n"); buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const event = frame.match(/^event: (.+)$/m)?.[1]; const raw = frame.match(/^data: (.+)$/m)?.[1]; if (!raw) continue;
          const data = JSON.parse(raw);
          if (event === "activity") addActivity(data.label);
          if (event === "delta") { answer += data.text; setActive({ ...optimistic, messages: [...optimistic.messages, { role: "assistant", text: answer }] }); }
          if (event === "error") throw new Error(data.message);
          if (event === "done") addActivity("Processamento concluído");
        }
      }
      await refresh(); await openConversation(conversation.conversation_id);
    } catch (error) { addActivity(error instanceof Error ? error.message : "Ocorreu um erro.", true); }
    finally { setSending(false); }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }

  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <Image src="/assets/brand/server-safe-lockup-transparent.png" alt="ServerSafe AI" width={220} height={72} className={styles.logo} priority />
      <button className={styles.newChat} onClick={() => { setActive(null); setMessage(""); }}>+ Nova conversa</button>
      <div className={styles.sectionHeader}><span>Projetos</span><button onClick={createProject} aria-label="Novo projeto">+</button></div>
      <div className={styles.list}>{projects.map((project) => <div key={project.project_id} className={styles.project}>
        <div className={styles.projectHeader}><span>▾ {project.name}</span><div className={styles.rowActions}><button onClick={() => renameProject(project)}>✎</button><button onClick={() => removeProject(project)}>×</button></div></div>
        {(chatsByProject.get(project.project_id) ?? []).map((item) => <ConversationRow item={item} key={item.conversation_id} />)}
      </div>)}</div>
      <div className={styles.sectionHeader}><span>Chats</span></div>
      <div className={styles.list}>{normalChats.map((item) => <ConversationRow item={item} key={item.conversation_id} />)}</div>
    </aside>
    <section className={styles.chat}>
      <header><div><span className={styles.statusDot} /> ServerSafe AI</div><strong>{active?.title ?? "Nova conversa"}</strong><button onClick={() => setActivityOpen(!activityOpen)}>Atividade</button></header>
      <main className={styles.messages}>
        {!active?.messages.length && <div className={styles.welcome}><div className={styles.mark}>S</div><h1>Como posso ajudar?</h1><p>Converse com o ServerSafe AI, pesquise na web e organize seu trabalho em projetos.</p></div>}
        {active?.messages.map((item: ChatMessage, index) => <div key={index} className={`${styles.messageRow} ${item.role === "user" ? styles.user : styles.assistant}`}><div className={styles.bubble}><b>{item.role === "user" ? "Você" : "ServerSafe AI"}</b><div>{item.text}</div></div></div>)}
        {sending && <div className={`${styles.messageRow} ${styles.assistant}`}><div className={styles.processing}><i /><i /><i /></div></div>}
        <div ref={bottomRef} />
      </main>
      <footer className={styles.composer}><textarea value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={onKeyDown} placeholder="Digite sua mensagem…" disabled={sending} /><button onClick={send} disabled={sending || !message.trim()}>{sending ? "Processando" : "Enviar"}</button><small>Enter envia · Shift+Enter cria uma nova linha</small></footer>
    </section>
    {activityOpen && <aside className={styles.activity}><header><strong>Atividade</strong><button onClick={() => setActivityOpen(false)}>×</button></header><div>{activity.length ? activity.map((item, index) => <div className={`${styles.activityItem} ${item.error ? styles.activityError : ""}`} key={`${item.time}-${index}`}><span>{item.label}</span><time>{item.time}</time></div>) : <p>Nenhuma atividade nesta conversa.</p>}</div></aside>}
  </div>;
}
