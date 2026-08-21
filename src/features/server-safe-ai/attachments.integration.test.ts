import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import type { Redis } from "@upstash/redis";
import { persistAttachmentUpload } from "../../app/[slug]/api/[...segments]/route";
import { isStoredAttachment } from "./attachments";
import { AI_LIMITS } from "./config";
import {
  attachmentStorageKey, mutateOwnerState, readAttachmentRecords, readOwnerState, setRedisClientForTests,
} from "./storage";
import type { Conversation, OwnerState } from "./types";

type Entry = { value: unknown; expiresAt?: number };
type SetOptions = { nx?: boolean; ex?: number; pxat?: number };
type TransactionCommand =
  | { type: "set"; key: string; value: unknown; options?: SetOptions }
  | { type: "del"; keys: string[] };

class MemoryRedis {
  private entries = new Map<string, Entry>();
  now = Date.now();
  transactionCount = 0;

  private purge(target: Map<string, Entry>, key: string) {
    const entry = target.get(key);
    if (entry?.expiresAt !== undefined && entry.expiresAt <= this.now) target.delete(key);
  }

  private applySet(target: Map<string, Entry>, key: string, value: unknown, options?: SetOptions) {
    this.purge(target, key);
    if (options?.nx && target.has(key)) return null;
    const expiresAt = options?.pxat ?? (options?.ex ? this.now + options.ex * 1000 : undefined);
    target.set(key, { value: structuredClone(value), expiresAt });
    return "OK";
  }

  async set(key: string, value: unknown, options?: SetOptions) {
    return this.applySet(this.entries, key, value, options);
  }

  async get<T>(key: string): Promise<T | null> {
    this.purge(this.entries, key);
    const entry = this.entries.get(key);
    return entry ? structuredClone(entry.value) as T : null;
  }

  async mget<T>(...keys: string[]): Promise<T> {
    const values = await Promise.all(keys.map((key) => this.get(key)));
    return values as T;
  }

  async del(...keys: string[]) {
    let deleted = 0;
    keys.forEach((key) => { if (this.entries.delete(key)) deleted += 1; });
    return deleted;
  }

  async eval(_script: string, keys: string[], args: unknown[]) {
    if (await this.get(keys[0]) === args[0]) return this.del(keys[0]);
    return 0;
  }

  multi() {
    const commands: TransactionCommand[] = [];
    const transaction = {
      set: (key: string, value: unknown, options?: SetOptions) => {
        commands.push({ type: "set", key, value, options });
        return transaction;
      },
      del: (...keys: string[]) => {
        commands.push({ type: "del", keys });
        return transaction;
      },
      exec: async () => {
        const snapshot = new Map<string, Entry>();
        this.entries.forEach((entry, key) => snapshot.set(key, structuredClone(entry)));
        commands.forEach((command) => {
          if (command.type === "set") this.applySet(snapshot, command.key, command.value, command.options);
          else command.keys.forEach((key) => snapshot.delete(key));
        });
        this.entries = snapshot;
        this.transactionCount += 1;
        return commands.map(() => "OK");
      },
    };
    return transaction;
  }

  advance(milliseconds: number) {
    this.now += milliseconds;
  }

  peek<T>(key: string) {
    return this.get<T>(key);
  }
}

function conversation(conversationId: string): Conversation {
  const now = new Date().toISOString();
  return {
    conversation_id: conversationId,
    project_id: null,
    title: "Teste de anexos",
    created_at: now,
    updated_at: now,
    messages: [],
    attachments: [],
  };
}

function useMemoryRedis(context: TestContext) {
  const memory = new MemoryRedis();
  setRedisClientForTests(memory as unknown as Redis);
  context.after(() => setRedisClientForTests(null));
  return memory;
}

test("integra upload, armazenamento, leitura, isolamento e exclusão atômica", async (context) => {
  const memory = useMemoryRedis(context);
  const owner = "owner-a";
  const conversationId = "conversation-a";
  await mutateOwnerState(owner, (state) => { state.conversations.push(conversation(conversationId)); });

  const beforeUpload = memory.transactionCount;
  const metadata = await persistAttachmentUpload(
    owner,
    conversationId,
    [new File(["Conteúdo jurídico integral."], "contrato.txt", { type: "text/plain" })],
    memory.now,
  );
  assert.equal(memory.transactionCount, beforeUpload + 1);

  const [stored] = await readAttachmentRecords(owner, [metadata[0].attachment_id]);
  assert.equal(isStoredAttachment(stored, metadata[0].attachment_id, conversationId), true);
  assert.deepEqual(await readAttachmentRecords("owner-b", [metadata[0].attachment_id]), [null]);
  assert.equal(isStoredAttachment(stored, metadata[0].attachment_id, "conversation-b"), false);

  const beforeDelete = memory.transactionCount;
  await mutateOwnerState(owner, (state, attachments) => {
    const index = state.conversations.findIndex((item) => item.conversation_id === conversationId);
    assert.notEqual(index, -1);
    attachments.delete((state.conversations[index].attachments ?? []).map((item) => item.attachment_id));
    state.conversations.splice(index, 1);
  });
  assert.equal(memory.transactionCount, beforeDelete + 1);
  assert.deepEqual(await readAttachmentRecords(owner, [metadata[0].attachment_id]), [null]);
  assert.equal((await readOwnerState(owner)).conversations.length, 0);
});

test("expiração remove conteúdo, metadados, contador e referências de mensagens", async (context) => {
  const memory = useMemoryRedis(context);
  context.mock.method(Date, "now", () => memory.now);
  const owner = "owner-expiration";
  const conversationId = "conversation-expiration";
  await mutateOwnerState(owner, (state) => { state.conversations.push(conversation(conversationId)); });
  const [metadata] = await persistAttachmentUpload(
    owner,
    conversationId,
    [new File(["Documento temporário."], "temporario.txt", { type: "text/plain" })],
    memory.now,
  );
  await mutateOwnerState(owner, (state) => {
    const active = state.conversations[0];
    active.messages.push({
      role: "user",
      text: "Analise o documento.",
      attachments: [{
        attachment_id: metadata.attachment_id,
        name: metadata.name,
        media_type: metadata.media_type,
        size_bytes: metadata.size_bytes,
      }],
    });
  });

  memory.advance(AI_LIMITS.attachmentTtlSeconds * 1000 + 1);
  assert.deepEqual(await readAttachmentRecords(owner, [metadata.attachment_id]), [null]);
  const cleaned = await readOwnerState(owner);
  assert.deepEqual(cleaned.conversations[0].attachments, []);
  assert.equal(cleaned.conversations[0].messages[0].attachments, undefined);

  const persisted = await memory.peek<OwnerState>(`ssai:v1:owner:${owner}:state`);
  assert.deepEqual(persisted?.conversations[0].attachments, []);
  assert.equal(persisted?.conversations[0].messages[0].attachments, undefined);
  assert.equal(await memory.peek(attachmentStorageKey(owner, metadata.attachment_id)), null);
});

test("margem multipart não altera o limite documental de 4 MiB", () => {
  assert.equal(AI_LIMITS.attachmentRequestBytes, 4 * 1024 * 1024);
  assert.equal(AI_LIMITS.attachmentMultipartBodyBytes, AI_LIMITS.attachmentRequestBytes + 256 * 1024);
});
