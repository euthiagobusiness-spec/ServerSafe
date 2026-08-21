import { ArrowUp, FileText, Paperclip, Square, X } from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./server-safe-ai.module.css";

export type PendingAttachment = { id: string; file: File };
export type Notice = { message: string; kind: "status" | "success" | "error" };

type ServerSafeAIComposerProps = {
  value: string;
  sending: boolean;
  pendingAttachments: PendingAttachment[];
  notice: Notice | null;
  onValueChange: (value: string) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSend: () => void | Promise<void>;
  onInterrupt: () => void;
};

function displayBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function ServerSafeAIComposer({
  value,
  sending,
  pendingAttachments,
  notice,
  onValueChange,
  onAddFiles,
  onRemoveAttachment,
  onSend,
  onInterrupt,
}: ServerSafeAIComposerProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const computedMaxHeight = Number.parseFloat(window.getComputedStyle(textarea).maxHeight);
    const maxHeight = Number.isFinite(computedMaxHeight) ? computedMaxHeight : 200;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > nextHeight + 1 ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

  useEffect(() => {
    window.addEventListener("resize", resizeTextarea);
    return () => window.removeEventListener("resize", resizeTextarea);
  }, [resizeTextarea]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onAddFiles(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    onAddFiles(Array.from(event.dataTransfer.files));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void onSend();
    }
  }

  return (
    <footer
      className={`${styles.composer} ${dragActive ? styles.dragActive : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setDragActive(false);
        }
      }}
      onDrop={handleDrop}
    >
      <div className={styles.composerInner}>
        {notice ? (
          <div
            className={`${styles.notice} ${notice.kind === "error" ? styles.noticeError : ""} ${notice.kind === "success" ? styles.noticeSuccess : ""}`}
            role={notice.kind === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {notice.message}
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          className={styles.fileInput}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={handleFileChange}
          disabled={sending}
        />

        {pendingAttachments.length > 0 ? (
          <div className={styles.pendingAttachments} aria-label="Documentos selecionados">
            {pendingAttachments.map((item) => (
              <div key={item.id} className={styles.pendingAttachment}>
                <FileText size={16} aria-hidden />
                <span>
                  <strong title={item.file.name}>{item.file.name}</strong>
                  <small>{displayBytes(item.file.size)}</small>
                </span>
                <button
                  type="button"
                  aria-label={`Remover ${item.file.name}`}
                  onClick={() => onRemoveAttachment(item.id)}
                  disabled={sending}
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className={styles.composerBox}>
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
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem…"
            aria-label="Mensagem para a AI Teste"
            disabled={sending}
          />
          {sending ? (
            <button
              type="button"
              className={styles.interruptButton}
              onClick={onInterrupt}
              aria-label="Interromper resposta"
            >
              <Square size={13} fill="currentColor" aria-hidden />
              <span>Interromper</span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.sendButton}
              onClick={() => { void onSend(); }}
              disabled={!value.trim() && !pendingAttachments.length}
              aria-label="Enviar mensagem"
            >
              <ArrowUp size={18} strokeWidth={2.4} aria-hidden />
              <span>Enviar</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
