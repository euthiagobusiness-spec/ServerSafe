import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { emptyOwnerState, type OwnerState } from "./types";
import { AI_LIMITS } from "./config";

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

const stateKey = (owner: string) => `ssai:v1:owner:${owner}:state`;
const lockKey = (owner: string) => `ssai:v1:owner:${owner}:lock`;

export async function readOwnerState(owner: string): Promise<OwnerState> {
  return (await getRedis().get<OwnerState>(stateKey(owner))) ?? emptyOwnerState();
}

export async function mutateOwnerState<T>(owner: string, mutation: (state: OwnerState) => T | Promise<T>): Promise<T> {
  const client = getRedis();
  const token = randomUUID();
  let acquired = false;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    acquired = Boolean(await client.set(lockKey(owner), token, { nx: true, ex: 8 }));
    if (acquired) break;
    await new Promise((resolve) => setTimeout(resolve, 40 + attempt * 25));
  }
  if (!acquired) throw new Error("STORAGE_BUSY");
  try {
    const state = await readOwnerState(owner);
    const result = await mutation(state);
    if (JSON.stringify(state).length > AI_LIMITS.ownerStorageChars) throw new StorageLimitError();
    await client.set(stateKey(owner), state);
    return result;
  } finally {
    await client.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      [lockKey(owner)],
      [token],
    ).catch(() => undefined);
  }
}

export async function consumeRateLimit(owner: string) {
  const client = getRedis();
  const minute = Math.floor(Date.now() / 60_000);
  const key = `ssai:v1:rate:${owner}:${minute}`;
  const count = await client.incr(key);
  if (count === 1) await client.expire(key, 90);
  return count;
}

export async function acquireConversationLock(owner: string, conversationId: string) {
  const client = getRedis();
  const key = `ssai:v1:chat-lock:${owner}:${conversationId}`;
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
  const key = "ssai:v1:harness-slots";
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
