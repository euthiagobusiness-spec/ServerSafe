import { FileText } from "lucide-react";
import { memo, type RefObject } from "react";
import Markdown, { type Components } from "react-markdown";
import { safeMarkdownUrl } from "./markdown";
import styles from "./server-safe-ai.module.css";
import type { ChatAttachment, ChatMessage, Conversation } from "./types";

const MARKDOWN_COMPONENTS: Components = {
  a: ({ children, href }) => href
    ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    : <span>{children}</span>,
  img: ({ alt }) => <span>{alt || "Imagem não exibida"}</span>,
};

function MessageAttachments({ attachments }: { attachments?: ChatAttachment[] }) {
  if (!attachments?.length) return null;
  return (
    <div className={styles.messageAttachments} aria-label="Documentos anexados à mensagem">
      {attachments.map((attachment) => (
        <span key={attachment.attachment_id} title={attachment.name}>
          <FileText size={14} aria-hidden />
          <span>{attachment.name}</span>
        </span>
      ))}
    </div>
  );
}

const MessageItem = memo(function MessageItem({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className={`${styles.messageRow} ${styles.user}`}>
        <article className={styles.userBubble} aria-label="Mensagem enviada por você">
          <span className={styles.messageAuthor}>Você</span>
          <MessageAttachments attachments={message.attachments} />
          <div className={styles.plainText}>{message.text}</div>
        </article>
      </div>
    );
  }

  return (
    <div className={`${styles.messageRow} ${styles.assistant}`}>
      <article className={styles.assistantContent} aria-label="Resposta da AI Teste">
        <span className={styles.messageAuthor}>AI Teste</span>
        <MessageAttachments attachments={message.attachments} />
        <div className={styles.markdown}>
          <Markdown
            skipHtml
            urlTransform={safeMarkdownUrl}
            components={MARKDOWN_COMPONENTS}
          >
            {message.text}
          </Markdown>
        </div>
      </article>
    </div>
  );
});

export function ServerSafeAIMessageList({
  active,
  sending,
  bottomRef,
}: {
  active: Conversation | null;
  sending: boolean;
  bottomRef: RefObject<HTMLDivElement | null>;
}) {
  const messages = active?.messages ?? [];
  const waitingForFirstResponseChunk = sending && messages.at(-1)?.role !== "assistant";

  return (
    <main className={styles.messages} aria-label="Conversa">
      <div className={styles.messageColumn}>
        {!messages.length ? (
          <div className={styles.welcome}>
            <div className={styles.mark} aria-hidden>AI</div>
            <h1>Como posso ajudar?</h1>
            <p>Converse com a AI Teste, pesquise na web e organize seu trabalho em projetos.</p>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <MessageItem key={`${message.role}-${index}`} message={message} />
        ))}

        {waitingForFirstResponseChunk ? (
          <div className={`${styles.messageRow} ${styles.assistant}`}>
            <div className={styles.assistantContent}>
              <span className={styles.messageAuthor}>AI Teste</span>
              <div className={styles.processing} role="status" aria-label="Processando resposta">
                <i /><i /><i />
              </div>
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
    </main>
  );
}
