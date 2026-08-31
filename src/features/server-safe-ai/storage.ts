import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { emptyOwnerState, type OwnerState } from "./types";
import { AI_LIMITS } from "./config";
import type { StoredAttachment } from "./attachments";
import { throwIfAborted } from "./chat-stream";
import { canonicalOwnerId, type CanonicalOwnerId } from "./security";

export class StorageLimitError extends Error {
  constructor() { super("STORAGE_LIMIT"); }
}

let redis: Redis | null = null;
function getRedis() {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error("STORAGE_NOT_CONFIGURED");
    redis = new Redis({ url, token });
  }
  return redis;
}

export function setRedisClientForTests(client: Redis | null) {
  if (process.env.NODE_ENV === "production") throw new Error("TEST_STORAGE_CLIENT_NOT_ALLOWED");
  redis = client;
}

const ownerV2Prefix = (owner: CanonicalOwnerId) => `ssai:v2:user:${canonicalOwnerId(owner)}`;
const safeKeySegment = (value: string, label: string) => {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error(`${label}_INVALID`);
  return value;
};
const minuteKeySegment = (minute: number) => {
  if (!Number.isSafeInteger(minute) || minute < 0) throw new Error("RATE_WINDOW_INVALID");
  return String(minute);
};

/** Versioned v2 builders. They only derive from the validated auth UUID. */
export const ownerStateKeyV2 = (owner: CanonicalOwnerId) => `${ownerV2Prefix(owner)}:state`;
export const ownerMutationLockKeyV2 = (owner: CanonicalOwnerId) => `${ownerV2Prefix(owner)}:lock`;
export const attachmentStorageKeyV2 = (owner: CanonicalOwnerId, attachmentId: string) => (
  `${ownerV2Prefix(owner)}:attachment:${safeKeySegment(attachmentId, "ATTACHMENT_ID")}`
);
export const conversationChatLockKeyV2 = (owner: CanonicalOwnerId, conversationId: string) => (
  `${ownerV2Prefix(owner)}:chat-lock:${safeKeySegment(conversationId, "CONVERSATION_ID")}`
);
export const ownerRateLimitKeyV2 = (owner: CanonicalOwnerId, minute: number) => (
  `${ownerV2Prefix(owner)}:rate:${minuteKeySegment(minute)}`
);
export const ownerAttachmentRateLimitKeyV2 = (owner: CanonicalOwnerId, minute: number) => (
  `${ownerV2Prefix(owner)}:attachment-rate:${minuteKeySegment(minute)}`
);

/** The harness slot pool is global and must not be duplicated per owner/version. */
export const harnessSlotsKey = "ssai:v1:harness-slots";

type AttachmentChanges = {
  store(records: StoredAttachment[]): void;
  delete(attachmentIds: string[]): void;
};

function pruneExpiredAttachments(state: OwnerState, now = Date.now()) {
  const expiredIds = new Set<string>();
  let changed = false;

  state.conversations.forEach((conversation) => {
    const current = conversation.attachments ?? [];
    const active = current.filter((attachment) => {
      const expiresAt = attachment.expires_at ? Date.parse(attachment.expires_at) : Number.NaN;
      const keep = conversation.permanence_enabled === true
        || (Number.isFinite(expiresAt) && expiresAt > now);
      if (!keep) expiredIds.add(attachment.attachment_id);
      return keep;
    });
    if (active.length !== current.length) {
      conversation.attachments = active;
      changed = true;
    }

    const activeIds = new Set(active.map((attachment) => attachment.attachment_id));
    conversation.messages.forEach((message) => {
      if (!message.attachments?.length) return;
      const retained = message.attachments.filter((attachment) => activeIds.has(attachment.attachment_id));
      if (retained.length === message.attachments.length) return;
      if (retained.length) message.attachments = retained;
      else delete message.attachments;
      changed = true;
    });
  });

  return { changed, expiredIds: [...expiredIds] };
}

async function readRawOwnerState(client: Redis, owner: CanonicalOwnerId) {
  return (await client.get<OwnerState>(ownerStateKeyV2(owner))) ?? emptyOwnerState();
}

export async function readOwnerState(owner: CanonicalOwnerId): Promise<OwnerState> {
  const state = await readRawOwnerState(getRedis(), owner);
  if (!pruneExpiredAttachments(state).changed) return state;
  return mutateOwnerState(owner, (fresh) => fresh);
}

export async function mutateOwnerState<T>(
  owner: CanonicalOwnerId,
  mutation: (state: OwnerState, attachments: AttachmentChanges) => T | Promise<T>,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  const client = getRedis();
  const token = randomUUID();
  let acquired = false;
  throwIfAborted(options.signal);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    acquired = Boolean(await client.set(ownerMutationLockKeyV2(owner), token, { nx: true, ex: 8 }));
    if (acquired) break;
    await new Promise((resolve) => setTimeout(resolve, 40 + attempt * 25));
    throwIfAborted(options.signal);
  }
  if (!acquired) throw new Error("STORAGE_BUSY");
  try {
    const state = await readRawOwnerState(client, owner);
    const records = new Map<string, StoredAttachment>();
    const attachmentIdsToDelete = new Set<string>();
    const changes: AttachmentChanges = {
      store(values) {
        values.forEach((record) => {
          attachmentIdsToDelete.delete(record.attachment_id);
          records.set(record.attachment_id, record);
        });
      },
      delete(attachmentIds) {
        attachmentIds.forEach((attachmentId) => {
          records.delete(attachmentId);
          attachmentIdsToDelete.add(attachmentId);
        });
      },
    };
    const expired = pruneExpiredAttachments(state);
    changes.delete(expired.expiredIds);
    const result = await mutation(state, changes);
    if (JSON.stringify(state).length > AI_LIMITS.ownerStorageChars) throw new StorageLimitError();
    throwIfAborted(options.signal);

    if (records.size || attachmentIdsToDelete.size) {
      const transaction = client.multi();
      records.forEach((record) => {
        if (record.expires_at === null) {
          transaction.set(attachmentStorageKeyV2(owner, record.attachment_id), record);
          return;
        }
        const expiresAt = Date.parse(record.expires_at);
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error("ATTACHMENT_EXPIRATION_INVALID");
        transaction.set(attachmentStorageKeyV2(owner, record.attachment_id), record, { pxat: expiresAt });
      });
      if (attachmentIdsToDelete.size) {
        transaction.del(...[...attachmentIdsToDelete].map((attachmentId) => attachmentStorageKeyV2(owner, attachmentId)));
      }
      transaction.set(ownerStateKeyV2(owner), state);
      await transaction.exec();
    } else {
      await client.set(ownerStateKeyV2(owner), state);
    }
    return result;
  } finally {
    await client.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      [ownerMutationLockKeyV2(owner)],
      [token],
    ).catch(() => undefined);
  }
}

export async function consumeRateLimit(owner: CanonicalOwnerId) {
  const client = getRedis();
  const minute = Math.floor(Date.now() / 60_000);
  const key = ownerRateLimitKeyV2(owner, minute);
  const count = await client.incr(key);
  if (count === 1) await client.expire(key, 90);
  return count;
}

export async function consumeAttachmentRateLimit(owner: CanonicalOwnerId) {
  const client = getRedis();
  const minute = Math.floor(Date.now() / 60_000);
  const key = ownerAttachmentRateLimitKeyV2(owner, minute);
  const count = await client.incr(key);
  if (count === 1) await client.expire(key, 90);
  return count;
}

export async function readAttachmentRecords(owner: CanonicalOwnerId, attachmentIds: string[]) {
  if (!attachmentIds.length) return [];
  return getRedis().mget<Array<StoredAttachment | null>>(
    ...attachmentIds.map((attachmentId) => attachmentStorageKeyV2(owner, attachmentId)),
  );
}

export async function acquireConversationLock(owner: CanonicalOwnerId, conversationId: string) {
  const client = getRedis();
  const key = conversationChatLockKeyV2(owner, conversationId);
  const token = randomUUID();
  const ok = Boolean(await client.set(key, token, { nx: true, ex: 70 }));
  return {
    ok,
    async release() {
      if (!ok) return;
      await client.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        [key], [token],
      ).catch(() => undefined);
    },
  };
}

export async function acquireHarnessSlot(maxConcurrency: number) {
  const client = getRedis();
  const key = harnessSlotsKey;
  const token = randomUUID();
  const now = Date.now();
  const expires = now + 70_000;
  const acquired = Number(await client.eval(
    "redis.call('zremrangebyscore', KEYS[1], '-inf', ARGV[1]); if redis.call('zcard', KEYS[1]) >= tonumber(ARGV[2]) then return 0 end; redis.call('zadd', KEYS[1], ARGV[3], ARGV[4]); redis.call('expire', KEYS[1], 90); return 1",
    [key], [now, maxConcurrency, expires, token],
  )) === 1;
  return {
    ok: acquired,
    async release() { if (acquired) await client.zrem(key, token).catch(() => undefined); },
  };
}
