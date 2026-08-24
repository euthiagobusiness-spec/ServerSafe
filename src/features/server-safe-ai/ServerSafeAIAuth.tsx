"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildRecoveryRedirect,
  performLogin,
  performLogout,
  requestPasswordRecovery,
  updatePassword,
} from "./auth";
import styles from "./server-safe-ai.module.css";

type AuthMode = "login" | "recover" | "update" | "unauthorized" | "configuration";

type ServerSafeAIAuthProps = {
  basePath: string;
  mode: AuthMode;
  initialMessage?: string;
};

export function ServerSafeAIAuth({ basePath, mode, initialMessage }: ServerSafeAIAuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [loading, setLoading] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const result = await performLogin(createClient().auth, email, password);
      if (!result.ok) setMessage(result.message ?? "Não foi possível entrar.");
      else window.location.replace(basePath);
    } catch {
      setMessage("AI Teste ainda não está configurada para autenticação.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const redirectTo = buildRecoveryRedirect(window.location.origin, basePath);
      const result = await requestPasswordRecovery(createClient().auth, email, redirectTo);
      setMessage(result.message ?? "Não foi possível solicitar a recuperação.");
    } catch {
      setMessage("Não foi possível solicitar a recuperação agora.");
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const result = await updatePassword(createClient().auth, password, confirmation);
      setMessage(result.message ?? "Não foi possível atualizar a senha.");
      if (result.ok) window.location.replace(basePath);
    } catch {
      setMessage("Não foi possível atualizar a senha. Solicite um novo link.");
    } finally {
      setLoading(false);
    }
  }

  async function leaveUnauthorizedSession() {
    setLoading(true);
    try {
      await performLogout(createClient().auth);
    } finally {
      window.location.replace(basePath);
    }
  }

  const title = mode === "recover"
    ? "Recuperar acesso"
    : mode === "update"
      ? "Definir nova senha"
      : mode === "unauthorized"
        ? "Usuário não autorizado"
        : mode === "configuration"
          ? "Autenticação indisponível"
          : "Entrar na AI Teste";

  return (
    <main className={styles.authShell}>
      <section className={styles.authCard} aria-labelledby="auth-title">
        <div className={styles.authBrand} aria-hidden>SS</div>
        <p className={styles.authEyebrow}>ServerSafe</p>
        <h1 id="auth-title">{title}</h1>

        {mode === "login" ? (
          <form onSubmit={submitLogin} className={styles.authForm}>
            <label htmlFor="ssai-auth-email">Email</label>
            <input
              id="ssai-auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
            />
            <label htmlFor="ssai-auth-password">Senha</label>
            <input
              id="ssai-auth-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
            <a href={`${basePath}/auth/recover`}>Esqueci minha senha</a>
          </form>
        ) : null}

        {mode === "recover" ? (
          <form onSubmit={submitRecovery} className={styles.authForm}>
            <p>Informe o email autorizado para receber as instruções.</p>
            <label htmlFor="ssai-recovery-email">Email</label>
            <input
              id="ssai-recovery-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading}>{loading ? "Solicitando..." : "Solicitar recuperação"}</button>
            <a href={basePath}>Voltar para entrar</a>
          </form>
        ) : null}

        {mode === "update" ? (
          <form onSubmit={submitPassword} className={styles.authForm}>
            <label htmlFor="ssai-new-password">Nova senha</label>
            <input
              id="ssai-new-password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />
            <label htmlFor="ssai-confirm-password">Confirmar nova senha</label>
            <input
              id="ssai-confirm-password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading}>{loading ? "Atualizando..." : "Atualizar senha"}</button>
          </form>
        ) : null}

        {mode === "unauthorized" ? (
          <div className={styles.authStatic}>
            <p>A sessão não tem autorização para acessar esta aplicação.</p>
            <button type="button" onClick={() => { void leaveUnauthorizedSession(); }} disabled={loading}>
              Encerrar sessão
            </button>
          </div>
        ) : null}

        {mode === "configuration" ? (
          <div className={styles.authStatic}>
            <p>AI Teste ainda não está configurada para autenticação.</p>
          </div>
        ) : null}

        {message ? <p className={styles.authNotice} role="status">{message}</p> : null}
        <small>O endereço privado continua obrigatório.</small>
      </section>
    </main>
  );
}
