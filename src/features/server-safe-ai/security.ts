import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const OWNER_COOKIE = "ssai_session";
const YEAR = 60 * 60 * 24 * 365;
const AUTHENTICATED_OWNER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CanonicalOwnerId = string & { readonly __brand: "CanonicalOwnerId" };
export type LegacyOwnerLocator = string & { readonly __brand: "LegacyOwnerLocator" };

/**
 * Canonical Redis owner for the authenticated Supabase identity.
 *
 * This value is derived only from the validated Supabase claims.sub UUID.
 * It is deliberately typed separately from the legacy browser locator so a
 * cookie-derived value cannot accidentally become a v2 owner.
 */
export function canonicalOwnerId(value: string): CanonicalOwnerId {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!AUTHENTICATED_OWNER_UUID.test(normalized)) throw new Error("OWNER_ID_INVALID");
  return normalized as CanonicalOwnerId;
}

function secret() {
  const value = process.env.SERVERSAFE_SESSION_SECRET ?? "";
  if (value.length < 32) throw new Error("CONFIGURATION_INVALID:SERVERSAFE_SESSION_SECRET");
  return value;
}

function signature(value: string, purpose: string) {
  return createHmac("sha256", secret()).update(`${purpose}:${value}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function signed(value: string, purpose: string) {
  return `${value}.${signature(value, purpose)}`;
}

function verifySigned(value: string | undefined, purpose: string) {
  if (!value) return null;
  const index = value.lastIndexOf(".");
  if (index < 1) return null;
  const raw = value.slice(0, index);
  return safeEqual(value.slice(index + 1), signature(raw, purpose)) ? raw : null;
}

function cookieOptions(slug: string, maxAge: number) {
  return { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: `/${slug}/`, maxAge };
}

/**
 * Phase A legacy-only locator. This value must never be passed to v2 key
 * builders or used as the authenticated owner.
 */
export function legacyOwnerLocator(request: NextRequest, response: NextResponse, slug: string) {
  let token = verifySigned(request.cookies.get(OWNER_COOKIE)?.value, "owner");
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    token = randomUUID();
    response.cookies.set(OWNER_COOKIE, signed(token, "owner"), cookieOptions(slug, YEAR));
  }
  return createHash("sha256").update(token).digest("hex") as LegacyOwnerLocator;
}

export function isSameOriginMutation(request: NextRequest) {
  if (request.headers.get("x-serversafe-request") !== "1") return false;
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}
