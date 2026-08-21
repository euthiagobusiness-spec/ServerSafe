import { Menu } from "lucide-react";
import styles from "./server-safe-ai.module.css";

type ServerSafeAIHeaderProps = {
  conversationTitle: string;
  hasActiveConversation: boolean;
  permanenceEnabled: boolean;
  disabled: boolean;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  onTogglePermanence: () => void;
};

export function ServerSafeAIHeader({
  conversationTitle,
  hasActiveConversation,
  permanenceEnabled,
  disabled,
  sidebarVisible,
  onToggleSidebar,
  onTogglePermanence,
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
