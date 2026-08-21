import {
  ChevronDown,
  FolderInput,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import styles from "./server-safe-ai.module.css";
import type { Conversation, Project } from "./types";

export type ConversationSummary = Omit<Conversation, "messages"> & {
  message_count: number;
  attachment_count: number;
};

type ServerSafeAISidebarProps = {
  projects: Project[];
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  collapsed: boolean;
  mobileViewport: boolean;
  mobileOpen: boolean;
  disabled: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  onNewConversation: () => void;
  onCreateProject: () => void;
  onOpenConversation: (conversationId: string) => void;
  onRenameConversation: (conversation: ConversationSummary) => void;
  onMoveConversation: (conversation: ConversationSummary) => void;
  onDeleteConversation: (conversation: ConversationSummary) => void;
  onRenameProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
};

function ConversationRow({
  item,
  active,
  disabled,
  onOpen,
  onRename,
  onMove,
  onDelete,
}: {
  item: ConversationSummary;
  active: boolean;
  disabled: boolean;
  onOpen: (conversationId: string) => void;
  onRename: (conversation: ConversationSummary) => void;
  onMove: (conversation: ConversationSummary) => void;
  onDelete: (conversation: ConversationSummary) => void;
}) {
  return (
    <div className={`${styles.conversationRow} ${active ? styles.active : ""}`}>
      <button
        type="button"
        className={styles.conversationTitle}
        onClick={() => onOpen(item.conversation_id)}
        disabled={disabled}
        aria-current={active ? "page" : undefined}
      >
        <span>{item.title}</span>
        {item.attachment_count > 0 ? (
          <span className={styles.attachmentBadge} title={`${item.attachment_count} anexo(s)`}>
            <Paperclip size={12} aria-hidden /> {item.attachment_count}
          </span>
        ) : null}
      </button>
      <div className={styles.rowActions} aria-label={`Ações da conversa ${item.title}`}>
        <button
          type="button"
          title="Renomear"
          aria-label="Renomear conversa"
          onClick={() => onRename(item)}
          disabled={disabled}
        >
          <Pencil size={15} aria-hidden />
        </button>
        <button
          type="button"
          title="Mover"
          aria-label="Mover conversa"
          onClick={() => onMove(item)}
          disabled={disabled}
        >
          <FolderInput size={15} aria-hidden />
        </button>
        <button
          type="button"
          title="Excluir"
          aria-label="Excluir conversa"
          onClick={() => onDelete(item)}
          disabled={disabled}
        >
          <Trash2 size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function ServerSafeAISidebar({
  projects,
  conversations,
  activeConversationId,
  collapsed,
  mobileViewport,
  mobileOpen,
  disabled,
  onToggleCollapsed,
  onCloseMobile,
  onNewConversation,
  onCreateProject,
  onOpenConversation,
  onRenameConversation,
  onMoveConversation,
  onDeleteConversation,
  onRenameProject,
  onDeleteProject,
}: ServerSafeAISidebarProps) {
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { chatsByProject, unfiledConversations } = useMemo(() => {
    const grouped = new Map(projects.map((project) => [
      project.project_id,
      [] as ConversationSummary[],
    ]));
    const unfiled: ConversationSummary[] = [];
    for (const conversation of conversations) {
      const projectConversations = conversation.project_id
        ? grouped.get(conversation.project_id)
        : undefined;
      if (projectConversations) projectConversations.push(conversation);
      else unfiled.push(conversation);
    }
    return { chatsByProject: grouped, unfiledConversations: unfiled };
  }, [projects, conversations]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const frame = window.requestAnimationFrame(() => mobileCloseRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [mobileOpen]);

  const renderConversation = (conversation: ConversationSummary) => (
    <ConversationRow
      key={conversation.conversation_id}
      item={conversation}
      active={activeConversationId === conversation.conversation_id}
      disabled={disabled}
      onOpen={onOpenConversation}
      onRename={onRenameConversation}
      onMove={onMoveConversation}
      onDelete={onDeleteConversation}
    />
  );

  return (
    <>
      <button
        type="button"
        className={`${styles.sidebarBackdrop} ${mobileOpen ? styles.sidebarBackdropVisible : ""}`}
        aria-label="Fechar menu lateral"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        onClick={onCloseMobile}
      />
      <aside
        id="ssai-sidebar"
        className={`${styles.sidebar} ${collapsed ? styles.sidebarIsCollapsed : ""} ${mobileOpen ? styles.sidebarMobileOpen : ""}`}
        aria-label="Navegação de projetos e conversas"
        aria-hidden={mobileViewport && !mobileOpen}
        inert={mobileViewport && !mobileOpen ? true : undefined}
      >
        <div className={styles.sidebarTop}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden>AI</span>
            <span className={styles.brandText}>AI Teste</span>
          </div>
          <button
            ref={mobileCloseRef}
            type="button"
            className={styles.collapseButton}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed
              ? <PanelLeftOpen size={18} aria-hidden />
              : <PanelLeftClose size={18} aria-hidden />}
          </button>
          <button
            type="button"
            className={styles.mobileCloseButton}
            onClick={onCloseMobile}
            aria-label="Fechar menu lateral"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <button
          type="button"
          className={styles.newChat}
          onClick={onNewConversation}
          disabled={disabled}
          title="Nova conversa"
        >
          <MessageSquarePlus size={18} aria-hidden />
          <span>Nova conversa</span>
        </button>

        <div className={styles.sidebarScroll}>
          <section className={styles.sidebarSection} aria-labelledby="projects-heading">
            <div className={styles.sectionHeader}>
              <h2 id="projects-heading">Projetos</h2>
              <button
                type="button"
                onClick={onCreateProject}
                aria-label="Novo projeto"
                title="Novo projeto"
                disabled={disabled}
              >
                <Plus size={17} aria-hidden />
              </button>
            </div>
            <div className={styles.projectList}>
              {projects.map((project) => (
                <div key={project.project_id} className={styles.project}>
                  <div className={styles.projectHeader}>
                    <span title={project.name}>
                      <ChevronDown size={14} aria-hidden />
                      <span>{project.name}</span>
                    </span>
                    <div className={styles.rowActions} aria-label={`Ações do projeto ${project.name}`}>
                      <button
                        type="button"
                        title="Renomear"
                        aria-label={`Renomear projeto ${project.name}`}
                        onClick={() => onRenameProject(project)}
                        disabled={disabled}
                      >
                        <Pencil size={15} aria-hidden />
                      </button>
                      <button
                        type="button"
                        title="Excluir"
                        aria-label={`Excluir projeto ${project.name}`}
                        onClick={() => onDeleteProject(project)}
                        disabled={disabled}
                      >
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </div>
                  </div>
                  {(chatsByProject.get(project.project_id) ?? []).map(renderConversation)}
                </div>
              ))}
            </div>
          </section>

          <section className={styles.sidebarSection} aria-labelledby="chats-heading">
            <div className={styles.sectionHeader}>
              <h2 id="chats-heading">Chats</h2>
            </div>
            <div className={styles.chatList}>
              {unfiledConversations.map(renderConversation)}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
