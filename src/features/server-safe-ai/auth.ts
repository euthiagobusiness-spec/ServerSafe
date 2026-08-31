import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalOwnerId, type CanonicalOwnerId } from "./security";

export type AuthenticatedIdentity = {
  id: CanonicalOwnerId;
  email: string;
};
export type AuthIdentity = AuthenticatedIdentity;

export type PublicAuthResult = {
  ok: boolean;
  message?: string;
};

type AuthErrorLike = {
  code?: string;
};

type BrowserAuthApi = {
  signInWithPassword(credentials: { email: string; password: string }): Promise<{ error: AuthErrorLike | null }>;
  signOut(options: { scope: "local" }): Promise<{ error: AuthErrorLike | null }>;
  resetPasswordForEmail(email: string, options: { redirectTo: string }): Promise<{ error: AuthErrorLike | null }>;
  updateUser(attributes: { password: string }): Promise<{ error: AuthErrorLike | null }>;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePrivateBasePath(value: string) {
  if (!/^\/[A-Za-z0-9_-]{12,128}$/.test(value)) throw new Error("AUTH_BASE_PATH_INVALID");
  return value;
}

export function safeAuthRedirect(basePath: string, candidate: string | null) {
  const safeBasePath = normalizePrivateBasePath(basePath);
  const allowed = new Set([safeBasePath, `${safeBasePath}/auth/update-password`]);
  return candidate && allowed.has(candidate) ? candidate : safeBasePath;
}

export function isExplicitlyAllowedAuthRedirect(basePath: string, candidate: string | null) {
  if (!candidate) return true;
  return safeAuthRedirect(basePath, candidate) === candidate;
}

export function buildRecoveryRedirect(origin: string, basePath: string) {
  const safeBasePath = normalizePrivateBasePath(basePath);
  const safeOrigin = new URL(origin).origin;
  const callback = new URL(`${safeBasePath}/auth/callback`, safeOrigin);
  callback.searchParams.set("next", `${safeBasePath}/auth/update-password`);
  return callback.toString();
}

export async function resolveAuthenticatedIdentity(
  supabase: Pick<SupabaseClient, "auth">,
): Promise<AuthenticatedIdentity | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims || claims.is_anonymous === true) return null;

  const rawId = typeof claims.sub === "string" ? claims.sub : "";
  const email = typeof claims.email === "string" ? claims.email.trim() : "";
  if (!EMAIL_PATTERN.test(email)) return null;
  try {
    return { id: canonicalOwnerId(rawId), email };
  } catch {
    return null;
  }
}

export async function ensureOwnProfile(supabase: SupabaseClient, userId: string) {
  let canonicalId: string;
  try {
    canonicalId = canonicalOwnerId(userId);
  } catch {
    return false;
  }
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: canonicalId }, { onConflict: "id", ignoreDuplicates: true });
  return !error;
}

export async function performLogin(
  auth: BrowserAuthApi,
  emailInput: string,
  password: string,
): Promise<PublicAuthResult> {
  const email = emailInput.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || password.length < 1 || password.length > 1024) {
    return { ok: false, message: "Email ou senha inválidos." };
  }
  const { error } = await auth.signInWithPassword({ email, password });
  if (!error) return { ok: true };
  if (error.code === "email_not_confirmed") {
    return { ok: false, message: "Usuário não autorizado. Confirme o email recebido no convite." };
  }
  return { ok: false, message: "Email ou senha inválidos." };
}

export async function performLogout(auth: BrowserAuthApi): Promise<PublicAuthResult> {
  const { error } = await auth.signOut({ scope: "local" });
  return error
    ? { ok: false, message: "Não foi possível encerrar a sessão." }
    : { ok: true };
}

export async function requestPasswordRecovery(
  auth: BrowserAuthApi,
  emailInput: string,
  redirectTo: string,
): Promise<PublicAuthResult> {
  const email = emailInput.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { ok: false, message: "Informe um email válido." };
  await auth.resetPasswordForEmail(email, { redirectTo });
  return {
    ok: true,
    message: "Se o email estiver autorizado, você receberá as instruções de recuperação.",
  };
}

export async function updatePassword(
  auth: BrowserAuthApi,
  password: string,
  confirmation: string,
): Promise<PublicAuthResult> {
  if (password.length < 8) return { ok: false, message: "Use uma senha com pelo menos 8 caracteres." };
  if (password !== confirmation) return { ok: false, message: "As senhas não coincidem." };
  const { error } = await auth.updateUser({ password });
  return error
    ? { ok: false, message: "Não foi possível atualizar a senha. Solicite um novo link." }
    : { ok: true, message: "Senha atualizada com segurança." };
}

export function authCallbackNotice(value: string | string[] | undefined) {
  return value === "callback"
    ? "O link de autenticação é inválido ou expirou. Solicite um novo link."
    : undefined;
}
