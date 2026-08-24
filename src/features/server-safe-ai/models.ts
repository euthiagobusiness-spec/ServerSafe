import type { Conversation, ModelKey, ModelMetadata } from "./types";

type ModelDefinition = ModelMetadata & {
  providerModelId: string;
};

export const DEFAULT_MODEL_KEY: ModelKey = "opus-5";

const MODEL_REGISTRY = {
  "haiku-4-5": {
    key: "haiku-4-5",
    displayName: "Claude Haiku 4.5",
    default: false,
    providerModelId: "anthropic.claude-haiku-4-5",
  },
  "sonnet-5": {
    key: "sonnet-5",
    displayName: "Claude Sonnet 5",
    default: false,
    providerModelId: "anthropic.claude-sonnet-5",
  },
  "opus-5": {
    key: "opus-5",
    displayName: "Claude Opus 5",
    default: true,
    providerModelId: "anthropic.claude-opus-5",
  },
} as const satisfies Record<ModelKey, ModelDefinition>;

export const PUBLIC_MODEL_METADATA: readonly ModelMetadata[] = Object.freeze(
  Object.values(MODEL_REGISTRY).map(({ key, displayName, default: isDefault }) => Object.freeze({
    key,
    displayName,
    default: isDefault,
  })),
);

export class InvalidModelKeyError extends Error {
  constructor() {
    super("MODEL_KEY_INVALID");
    this.name = "InvalidModelKeyError";
  }
}

export function isModelKey(value: unknown): value is ModelKey {
  return typeof value === "string" && Object.hasOwn(MODEL_REGISTRY, value);
}

export function requireModelKey(value: unknown): ModelKey {
  if (!isModelKey(value)) throw new InvalidModelKeyError();
  return value;
}

export function modelKeyForNewConversation(value: unknown): ModelKey {
  return value === undefined ? DEFAULT_MODEL_KEY : requireModelKey(value);
}

export function createConversationRecord(
  conversationId: string,
  modelKey: unknown,
  timestamp = new Date().toISOString(),
): Conversation {
  return {
    conversation_id: conversationId,
    project_id: null,
    model_key: modelKeyForNewConversation(modelKey),
    title: "Nova conversa",
    created_at: timestamp,
    updated_at: timestamp,
    messages: [],
    attachments: [],
    permanence_enabled: false,
  };
}

export function resolveConversationModelKey(conversation: Pick<Conversation, "model_key">): ModelKey {
  return conversation.model_key === undefined
    ? DEFAULT_MODEL_KEY
    : requireModelKey(conversation.model_key);
}

export function setConversationModel(
  conversation: Conversation,
  value: unknown,
  updatedAt = new Date().toISOString(),
) {
  const modelKey = requireModelKey(value);
  conversation.model_key = modelKey;
  conversation.updated_at = updatedAt;
  return conversation;
}

export function providerModelIdForKey(value: unknown) {
  return MODEL_REGISTRY[requireModelKey(value)].providerModelId;
}
