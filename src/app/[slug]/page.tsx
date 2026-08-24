import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { authCallbackNotice, ensureOwnProfile, resolveAuthenticatedIdentity } from "@/features/server-safe-ai/auth";
import { isConfiguredSlug } from "@/features/server-safe-ai/config";
import { ServerSafeAIAuth } from "@/features/server-safe-ai/ServerSafeAIAuth";
import { ServerSafeAIClient } from "@/features/server-safe-ai/ServerSafeAIClient";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "AI Teste",
  description: "Interface privada AI Teste.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#202124" };

type PrivateAIPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ auth_error?: string | string[] }>;
};

export default async function PrivateAIPage({ params, searchParams }: PrivateAIPageProps) {
  const { slug } = await params;
  if (!isConfiguredSlug(slug)) notFound();
  const basePath = `/${slug}`;

  try {
    getSupabasePublicConfig();
  } catch {
    return <ServerSafeAIAuth basePath={basePath} mode="configuration" />;
  }

  const supabase = await createClient();
  let identity = null;
  try {
    identity = await resolveAuthenticatedIdentity(supabase);
  } catch {
    const query = await searchParams;
    return (
      <ServerSafeAIAuth
        basePath={basePath}
        mode="login"
        initialMessage={authCallbackNotice(query.auth_error) ?? "Não foi possível validar a sessão agora."}
      />
    );
  }

  if (!identity) {
    const query = await searchParams;
    return (
      <ServerSafeAIAuth
        basePath={basePath}
        mode="login"
        initialMessage={authCallbackNotice(query.auth_error)}
      />
    );
  }

  if (!await ensureOwnProfile(supabase, identity.id)) {
    return <ServerSafeAIAuth basePath={basePath} mode="unauthorized" />;
  }

  return <ServerSafeAIClient basePath={basePath} userEmail={identity.email} />;
}
