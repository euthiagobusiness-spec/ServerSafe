import { LogOut, Menu } from "lucide-react";
import styles from "./server-safe-ai.module.css";
import type { ModelKey, ModelMetadata } from "./types";

type ServerSafeAIHeaderProps = {
  conversationTitle: string;
  hasActiveConversation: boolean;
  permanenceEnabled: boolean;
  disabled: boolean;
  models: ModelMetadata[];
  modelKey: ModelKey | null;
  modelChanging: boolean;
  userEmail: string;
  loggingOut: boolean;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  onTogglePermanence: () => void;
  onModelChange: (modelKey: ModelKey) => void;
  onLogout: () => void;
};

export function ServerSafeAIHeader({
  conversationTitle,
  hasActiveConversation,
  permanenceEnabled,
  disabled,
  models,
  modelKey,
  modelChanging,
  userEmail,
  loggingOut,
  sidebarVisible,
  onToggleSidebar,
  onTogglePermanence,
  onModelChange,
  onLogout,
}: ServerSafeAIHeaderProps) {
  return (
    <>
      <header className={styles.chatHeader}>
        <button
          type="button"
          className={styles.sidebarMenuButton}
          onClick={onToggleSidebar}
          aria-controls="ssai-sidebar"
          aria-expanded={sidebarVisible}
          aria-label="Alternar menu lateral"
          title="Alternar menu lateral"
        >
          <Menu size={19} aria-hidden />
        </button>
        <div className={styles.onlineLabel}>
          <span className={styles.statusDot} aria-hidden />
          <span>AI Teste</span>
        </div>
        <strong title={conversationTitle}>{conversationTitle}</strong>
        <label className={styles.modelControl}>
          <span>Modelo</span>
          <select
            value={modelKey ?? ""}
            onChange={(event) => onModelChange(event.target.value as ModelKey)}
            disabled={disabled || modelChanging || !models.length}
            aria-label="Modelo da conversa"
          >
            {!models.length ? <option value="">Indisponível</option> : null}
            {models.map((model) => (
              <option key={model.key} value={model.key}>{model.displayName}</option>
            ))}
          </select>
        </label>
        <div className={styles.permanenceControl}>
          <span>Permanência</span>
          <button
            type="button"
            role="switch"
            aria-checked={permanenceEnabled}
            aria-label={`Permanência do chat ${permanenceEnabled ? "ativada" : "desativada"}`}
            className={`${styles.switch} ${permanenceEnabled ? styles.switchOn : ""}`}
            onClick={onTogglePermanence}
            disabled={!hasActiveConversation || disabled}
          >
            <i aria-hidden />
          </button>
          <b aria-hidden>{permanenceEnabled ? "ON" : "OFF"}</b>
        </div>
        <div className={styles.authIdentity}>
          <span title={userEmail}>{userEmail}</span>
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            aria-label="Sair da AI Teste"
            title="Sair"
          >
            <LogOut size={17} aria-hidden />
          </button>
        </div>
      </header>

      {hasActiveConversation ? (
        <div className={styles.retentionInfo}>
          <span><strong>Mensagens:</strong> sem expiração automática.</span>
          <span>
            <strong>Documentos:</strong>{" "}
            {permanenceEnabled
              ? "sem expiração automática enquanto a permanência estiver ativa."
              : "expiram 7 dias após o upload."}
          </span>
        </div>
      ) : null}
    </>
  );
}
