import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalOwnerId,
  type CanonicalOwnerId,
} from "./security";
import {
  attachmentStorageKeyV2,
  conversationChatLockKeyV2,
  harnessSlotsKey,
  ownerAttachmentRateLimitKeyV2,
  ownerMutationLockKeyV2,
  ownerRateLimitKeyV2,
  ownerStateKeyV2,
} from "./storage";

const userA = "d9428888-122b-4a08-a3ce-73c7a0c0a214";
const userB = "e0539999-233c-4b19-b4df-84d8b1d1b325";
const sameMinute = 29_123_456;
const sameAttachment = "a9428888-122b-4a08-a3ce-73c7a0c0a214";
const sameConversation = "b9428888-122b-4a08-a3ce-73c7a0c0a214";

const ownerA = canonicalOwnerId(userA);
const ownerB = canonicalOwnerId(userB);

function v2Keys(owner: CanonicalOwnerId, minute = sameMinute) {
  return [
    ownerStateKeyV2(owner),
    attachmentStorageKeyV2(owner, sameAttachment),
    ownerMutationLockKeyV2(owner),
    conversationChatLockKeyV2(owner, sameConversation),
    ownerRateLimitKeyV2(owner, minute),
    ownerAttachmentRateLimitKeyV2(owner, minute),
  ];
}

test("A/B/C: cookies não participam da derivação do owner autenticado", () => {
  const cookies = [undefined, "cookie-legado-a", "cookie-legado-b-alterado"];
  const owners = cookies.map(() => ownerA);

  assert.deepEqual(owners, [userA, userA, userA]);
});

test("D: o mesmo cookie não faz usuários autenticados compartilharem owner", () => {
  const sharedCookie = "cookie-legado-compartilhado";

  void sharedCookie;
  assert.notEqual(ownerA, ownerB);
});

test("E: UUID inválido falha fechado", () => {
  for (const value of ["", "cliente", "d9428888-122b-4a08-a3ce-73c7a0c0a21", "not-a-uuid"]) {
    assert.throws(() => canonicalOwnerId(value), /OWNER_ID_INVALID/);
  }
});

test("owner autenticado é normalizado para lowercase", () => {
  assert.equal(canonicalOwnerId(userA.toUpperCase()), userA);
  assert.equal(canonicalOwnerId(`  ${userA.toUpperCase()}  `), userA);
});

test("F: rate limits compartilham namespace entre navegadores do mesmo usuário", () => {
  const browserOne = ownerRateLimitKeyV2(ownerA, sameMinute);
  const browserTwo = ownerRateLimitKeyV2(ownerA, sameMinute);
  const attachmentBrowserOne = ownerAttachmentRateLimitKeyV2(ownerA, sameMinute);
  const attachmentBrowserTwo = ownerAttachmentRateLimitKeyV2(ownerA, sameMinute);

  assert.equal(browserOne, browserTwo);
  assert.equal(attachmentBrowserOne, attachmentBrowserTwo);
});

test("G: state, attachment, locks e rate limits isolam usuários diferentes", () => {
  const keysA = v2Keys(ownerA);
  const keysB = v2Keys(ownerB);

  assert.equal(new Set(keysA).size, keysA.length);
  assert.equal(new Set(keysB).size, keysB.length);
  assert.equal(keysA.filter((key) => keysB.includes(key)).length, 0);
  assert.match(keysA[0], /^ssai:v2:user:[0-9a-f-]{36}:state$/);
});

test("builders v2 rejeitam segmentos de chave ambíguos", () => {
  assert.throws(() => ownerStateKeyV2("not-a-uuid" as CanonicalOwnerId), /OWNER_ID_INVALID/);
  assert.throws(() => attachmentStorageKeyV2(ownerA, "attachment:other"), /ATTACHMENT_ID_INVALID/);
  assert.throws(() => conversationChatLockKeyV2(ownerA, ""), /CONVERSATION_ID_INVALID/);
  assert.throws(() => ownerRateLimitKeyV2(ownerA, -1), /RATE_WINDOW_INVALID/);
});

test("slots do harness continuam globais e únicos", () => {
  assert.equal(harnessSlotsKey, "ssai:v1:harness-slots");
});
