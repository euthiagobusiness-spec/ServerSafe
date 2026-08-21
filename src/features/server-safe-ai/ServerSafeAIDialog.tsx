import { useEffect, useId } from "react";
import styles from "./server-safe-ai.module.css";

export type DialogOption = { value: string; label: string };
export type DialogState =
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

export function ServerSafeAIDialog({
  dialog,
  value,
  onValueChange,
  onCancel,
  onConfirm,
}: {
  dialog: DialogState;
  value: string;
  onValueChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const previousFocus = document.activeElement;
    return () => {
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <div
      className={styles.dialogBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onSubmit={(event) => { event.preventDefault(); onConfirm(); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
            return;
          }
          if (event.key !== "Tab") return;
          const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
          ));
          const first = focusable[0];
          const last = focusable.at(-1);
          if (!first || !last) return;
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <h2 id={titleId}>{dialog.title}</h2>
        <p id={descriptionId}>{dialog.description}</p>
        {dialog.kind === "text" ? (
          <input
            autoFocus
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            maxLength={80}
          />
        ) : null}
        {dialog.kind === "select" ? (
          <select autoFocus value={value} onChange={(event) => onValueChange(event.target.value)}>
            {dialog.options.map((option) => (
              <option value={option.value} key={option.value || "unfiled"}>{option.label}</option>
            ))}
          </select>
        ) : null}
        <div className={styles.dialogActions}>
          <button
            type="button"
            className={styles.dialogCancel}
            onClick={onCancel}
            autoFocus={dialog.kind === "confirm"}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={dialog.kind === "confirm" && dialog.destructive
              ? styles.dialogDanger
              : styles.dialogConfirm}
            disabled={dialog.kind === "text" && !value.trim()}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
