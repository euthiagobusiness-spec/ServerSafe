import { type NextRequest, NextResponse } from "next/server";
import { configuredSlug, isConfiguredSlug } from "@/features/server-safe-ai/config";
import { shouldRefreshSupabaseSession, updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const slug = configuredSlug();
  if (!shouldRefreshSupabaseSession(request.nextUrl.pathname, slug) || !isConfiguredSlug(slug)) {
    return NextResponse.next();
  }

  try {
    return await updateSession(request);
  } catch {
    // A página e as APIs validam a configuração e falham fechadas.
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
