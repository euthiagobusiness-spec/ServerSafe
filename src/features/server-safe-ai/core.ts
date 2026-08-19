import { AI_LIMITS } from "./config";
import type { ChatMessage, Conversation } from "./types";

export function buildRecentHistory(messages: ChatMessage[]) {
  const selected: string[] = [];
  let remaining = AI_LIMITS.historyChars;
  for (const item of messages.slice(-10).reverse()) {
    const prefix = item.role === "user" ? "Usuário: " : "Assistente: ";
    const available = remaining - prefix.length - (selected.length ? 1 : 0);
    if (available <= 0) break;
    const text = String(item.text ?? "");
    const clipped = text.length > available ? text.slice(-available) : text;
    selected.unshift(`${prefix}${clipped}`);
    remaining -= prefix.length + clipped.length + (selected.length > 1 ? 1 : 0);
    if (clipped.length < text.length) break;
  }
  return selected.join("\n");
}

export function canStoreTurn(conversation: Conversation, message: string) {
  const current = conversation.messages.reduce((total, item) => total + item.text.length, 0);
  return current + message.length + AI_LIMITS.responseChars <= AI_LIMITS.conversationChars;
}

export function safeActivityLabel(toolName: unknown, toolInput: unknown) {
  const name = String(toolName ?? "").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
  if (name === "skill") {
    const input = typeof toolInput === "object" && toolInput ? toolInput as Record<string, unknown> : {};
    const skill = String(input.name ?? "").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
    return skill ? `Executando Skill: ${skill}` : "Consultando uma Skill...";
  }
  if (name === "web_search" || name === "web_fetch") return "Pesquisando na Web...";
  return name ? `Executando ferramenta: ${name}` : "Executando ferramenta...";
}

export function normalizedTitle(value: unknown, fallback = "Nova conversa") {
  const title = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return title || fallback;
}
