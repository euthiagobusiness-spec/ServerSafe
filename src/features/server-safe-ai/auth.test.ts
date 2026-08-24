import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { handleAuthCallback } from "@/app/[slug]/auth/callback/route";
import { SUPABASE_PUBLIC_ENV_NAMES, validateSupabasePublicConfig } from "@/lib/supabase/config";
import { shouldRefreshSupabaseSession } from "@/lib/supabase/proxy";
import {
  buildRecoveryRedirect,
  ensureOwnProfile,
  performLogin,
  performLogout,
  requestPasswordRecovery,
  resolveAuthenticatedIdentity,
  safeAuthRedirect,
  updatePassword,
} from "./auth";

const userId = "d9428888-122b-4a08-a3ce-73c7a0c0a214";
const slug = "serversafe_auth_private";
const basePath = `/${slug}`;

function claimsClient(claims: Record<string, unknown> | null) {
  return {
    auth: {
      getClaims: async () => ({ data: claims ? { claims } : null, error: null }),
    },
  } as unknown as Pick<SupabaseClient, "auth">;
}

test("rota privada sem sessão permanece não autenticada", async () => {
  assert.equal(await resolveAuthenticatedIdentity(claimsClient(null)), null);
});

test("sessão autenticada usa sub verificado como auth.uid", async () => {
  const identity = await resolveAuthenticatedIdentity(claimsClient({
    sub: userId,
    email: "pessoa@example.com",
    is_anonymous: false,
  }));
  assert.deepEqual(identity, { id: userId, email: "pessoa@example.com" });
});

test("sessão anônima ou claims malformadas não autorizam", async () => {
  assert.equal(await resolveAuthenticatedIdentity(claimsClient({ sub: userId, email: "pessoa@example.com", is_anonymous: true })), null);
  assert.equal(await resolveAuthenticatedIdentity(claimsClient({ sub: "cliente", email: "pessoa@example.com" })), null);
});

test("profile próprio é garantido por upsert idempotente sob RLS", async () => {
  let observed: unknown = null;
  const client = {
    from(table: string) {
      assert.equal(table, "profiles");
      return {
        upsert: async (value: unknown, options: unknown) => {
          observed = { value, options };
          return { error: null };
        },
      };
    },
  } as unknown as SupabaseClient;
  assert.equal(await ensureOwnProfile(client, userId), true);
  assert.deepEqual(observed, {
    value: { id: userId },
    options: { onConflict: "id", ignoreDuplicates: true },
  });
});

test("env ausente e chave secreta falham fechadas", () => {
  assert.throws(() => validateSupabasePublicConfig({}), /SUPABASE_CONFIGURATION_INVALID/);
  assert.throws(() => validateSupabasePublicConfig({
    url: "https://project.supabase.co",
    publishableKey: "sb_secret_proibida",
  }), /SUPABASE_CONFIGURATION_INVALID/);
  assert.deepEqual(SUPABASE_PUBLIC_ENV_NAMES, [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ]);
});

test("login sanitiza credenciais inválidas sem ecoar erro interno", async () => {
  const result = await performLogin({
    signInWithPassword: async () => ({ error: { code: "invalid_credentials" } }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
    updateUser: async () => ({ error: null }),
  }, "pessoa@example.com", "segredo-local");
  assert.deepEqual(result, { ok: false, message: "Email ou senha inválidos." });
  assert.doesNotMatch(JSON.stringify(result), /segredo-local|invalid_credentials/);
});

test("logout encerra somente a sessão Supabase", async () => {
  let calls = 0;
  let observedScope = "";
  const result = await performLogout({
    signInWithPassword: async () => ({ error: null }),
    signOut: async (options) => { calls += 1; observedScope = options.scope; return { error: null }; },
    resetPasswordForEmail: async () => ({ error: null }),
    updateUser: async () => ({ error: null }),
  });
  assert.equal(calls, 1);
  assert.equal(observedScope, "local");
  assert.deepEqual(result, { ok: true });
});

test("recovery usa callback privado e resposta não enumera usuário", async () => {
  let observedRedirect = "";
  const redirectTo = buildRecoveryRedirect("https://preview.example", basePath);
  const result = await requestPasswordRecovery({
    signInWithPassword: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async (_email, options) => { observedRedirect = options.redirectTo; return { error: { code: "user_not_found" } }; },
    updateUser: async () => ({ error: null }),
  }, "pessoa@example.com", redirectTo);
  assert.equal(new URL(observedRedirect).pathname, `${basePath}/auth/callback`);
  assert.equal(result.ok, true);
  assert.doesNotMatch(result.message ?? "", /não encontrado|user_not_found/i);
});

test("nova senha exige confirmação local antes da chamada remota", async () => {
  let calls = 0;
  const auth = {
    signInWithPassword: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
    updateUser: async () => { calls += 1; return { error: null }; },
  };
  assert.equal((await updatePassword(auth, "senha-forte", "outra-senha")).ok, false);
  assert.equal(calls, 0);
  assert.equal((await updatePassword(auth, "senha-forte", "senha-forte")).ok, true);
  assert.equal(calls, 1);
});

test("redirect externo nunca sai da rota privada", () => {
  assert.equal(safeAuthRedirect(basePath, "https://evil.example"), basePath);
  assert.equal(safeAuthRedirect(basePath, "//evil.example"), basePath);
  assert.equal(safeAuthRedirect(basePath, `${basePath}/auth/update-password`), `${basePath}/auth/update-password`);
});

test("callback inválido não troca code nem preserva destino externo", async () => {
  const previousSlug = process.env.SERVERSAFE_AI_SLUG;
  process.env.SERVERSAFE_AI_SLUG = slug;
  let exchanges = 0;
  try {
    const request = new NextRequest(`https://preview.example${basePath}/auth/callback?code=code-local&next=${encodeURIComponent("https://evil.example")}`);
    const response = await handleAuthCallback(
      request,
      { params: Promise.resolve({ slug }) },
      async () => ({ auth: { exchangeCodeForSession: async () => { exchanges += 1; return { error: null }; } } }),
    );
    assert.equal(response.status, 303);
    assert.equal(exchanges, 0);
    assert.equal(new URL(response.headers.get("location") ?? "").origin, "https://preview.example");
    assert.equal(new URL(response.headers.get("location") ?? "").pathname, basePath);
  } finally {
    if (previousSlug === undefined) delete process.env.SERVERSAFE_AI_SLUG;
    else process.env.SERVERSAFE_AI_SLUG = previousSlug;
  }
});

test("callback PKCE válido troca code e remove token da URL final", async () => {
  const previousSlug = process.env.SERVERSAFE_AI_SLUG;
  process.env.SERVERSAFE_AI_SLUG = slug;
  let exchanges = 0;
  try {
    const next = `${basePath}/auth/update-password`;
    const request = new NextRequest(`https://preview.example${basePath}/auth/callback?code=code-local&next=${encodeURIComponent(next)}`);
    const response = await handleAuthCallback(
      request,
      { params: Promise.resolve({ slug }) },
      async () => ({ auth: { exchangeCodeForSession: async () => { exchanges += 1; return { error: null }; } } }),
    );
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(exchanges, 1);
    assert.equal(location.pathname, next);
    assert.equal(location.search, "");
  } finally {
    if (previousSlug === undefined) delete process.env.SERVERSAFE_AI_SLUG;
    else process.env.SERVERSAFE_AI_SLUG = previousSlug;
  }
});

test("proxy renova somente a rota privada e não decide redirects", () => {
  assert.equal(shouldRefreshSupabaseSession(`${basePath}/auth/callback`, slug), true);
  assert.equal(shouldRefreshSupabaseSession("/", slug), false);
  assert.equal(shouldRefreshSupabaseSession("/migracao-vmware-hyper-v", slug), false);
});
