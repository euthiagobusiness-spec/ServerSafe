const integer = (name: string, fallback: number, max: number) => {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isInteger(value) && value > 0 ? Math.min(value, max) : fallback;
};

export const AI_LIMITS = {
  bodyBytes: 64 * 1024,
  attachmentRequestBytes: 4 * 1024 * 1024,
  attachmentMultipartBodyBytes: 4 * 1024 * 1024 + 256 * 1024,
  attachmentBytes: 3 * 1024 * 1024,
  attachmentExtractedChars: 80_000,
  conversationAttachmentChars: 100_000,
  attachmentTtlSeconds: 7 * 24 * 60 * 60,
  attachmentUploadsPerMinute: 6,
  maxAttachmentsPerUpload: 3,
  maxAttachmentsPerConversation: 8,
  maxPdfPages: 200,
  maxDocxEntries: 256,
  maxDocxEntryBytes: 4 * 1024 * 1024,
  maxDocxUncompressedBytes: 12 * 1024 * 1024,
  maxDocxCompressionRatio: 100,
  messageChars: integer("OPENHARNESS_MAX_MESSAGE_CHARS", 12_000, 32_000),
  historyChars: integer("OPENHARNESS_MAX_HISTORY_CHARS", 30_000, 60_000),
  responseChars: integer("OPENHARNESS_MAX_RESPONSE_CHARS", 60_000, 100_000),
  conversationChars: integer("SERVERSAFE_MAX_CONVERSATION_CHARS", 500_000, 900_000),
  ownerStorageChars: integer("SERVERSAFE_MAX_OWNER_STORAGE_CHARS", 800_000, 900_000),
  maxConversations: integer("SERVERSAFE_MAX_CONVERSATIONS", 100, 200),
  maxProjects: integer("SERVERSAFE_MAX_PROJECTS", 50, 100),
  streamBufferChars: integer("OPENHARNESS_MAX_STREAM_BUFFER_CHARS", 262_144, 524_288),
  ratePerMinute: integer("OPENHARNESS_RATE_LIMIT_PER_MINUTE", 20, 60),
  maxConcurrency: integer("OPENHARNESS_MAX_CONCURRENCY", 2, 4),
  maxTurns: integer("OPENHARNESS_MAX_TURNS", 4, 8),
  sandboxTimeoutMs: integer("OPENHARNESS_TIMEOUT_MS", 50_000, 55_000),
} as const;

export const AI_MODEL = "anthropic.claude-haiku-4-5";
export const AI_REGION = "us-east-1";
export const AI_BASE_URL = `https://bedrock-mantle.${AI_REGION}.api.aws/anthropic`;
export const AI_SLUG_PATTERN = /^[A-Za-z0-9_-]{12,128}$/;

export function configuredSlug() {
  return String(process.env.SERVERSAFE_AI_SLUG ?? "").trim();
}

export function isConfiguredSlug(slug: string) {
  const expected = configuredSlug();
  return AI_SLUG_PATTERN.test(expected) && slug === expected;
}

export function assertRuntimeConfiguration() {
  const required = [
    "SERVERSAFE_AI_SLUG",
    "SERVERSAFE_SESSION_SECRET",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "SERVERSAFE_BEDROCK_API_KEY",
    "SERVERSAFE_AI_SANDBOX_SNAPSHOT_ID",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`CONFIGURATION_MISSING:${missing.join(",")}`);
  if (!AI_SLUG_PATTERN.test(configuredSlug())) throw new Error("CONFIGURATION_INVALID:SERVERSAFE_AI_SLUG");
  if ((process.env.SERVERSAFE_SESSION_SECRET?.length ?? 0) < 32) throw new Error("CONFIGURATION_INVALID:SERVERSAFE_SESSION_SECRET");
}
