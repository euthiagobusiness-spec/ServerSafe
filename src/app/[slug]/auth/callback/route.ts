import { NextRequest, NextResponse } from "next/server";
import { isExplicitlyAllowedAuthRedirect, safeAuthRedirect } from "@/features/server-safe-ai/auth";
import { isConfiguredSlug } from "@/features/server-safe-ai/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };
type CallbackClient = { auth: { exchangeCodeForSession(code: string): Promise<{ error: unknown }> } };
type CallbackClientFactory = () => Promise<CallbackClient>;

const callbackHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function redirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303, headers: callbackHeaders });
}

export async function handleAuthCallback(
  request: NextRequest,
  context: Context,
  clientFactory: CallbackClientFactory = createClient,
) {
  const { slug } = await context.params;
  if (!isConfiguredSlug(slug)) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404, headers: callbackHeaders });
  }

  const basePath = `/${slug}`;
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const requestedNext = request.nextUrl.searchParams.get("next");
  if (!code || code.length > 4096 || !isExplicitlyAllowedAuthRedirect(basePath, requestedNext)) {
    return redirect(request, `${basePath}?auth_error=callback`);
  }

  try {
    const supabase = await clientFactory();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirect(request, `${basePath}?auth_error=callback`);
    return redirect(request, safeAuthRedirect(basePath, requestedNext));
  } catch {
    return redirect(request, `${basePath}?auth_error=callback`);
  }
}

export const GET = handleAuthCallback;
