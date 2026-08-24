import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveAuthenticatedIdentity } from "@/features/server-safe-ai/auth";
import { isConfiguredSlug } from "@/features/server-safe-ai/config";
import { ServerSafeAIAuth } from "@/features/server-safe-ai/ServerSafeAIAuth";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nova senha | AI Teste", robots: { index: false, follow: false } };

export default async function UpdatePasswordPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isConfiguredSlug(slug)) notFound();
  const basePath = `/${slug}`;
  try {
    getSupabasePublicConfig();
  } catch {
    return <ServerSafeAIAuth basePath={basePath} mode="configuration" />;
  }

  const supabase = await createClient();
  const identity = await resolveAuthenticatedIdentity(supabase).catch(() => null);
  return identity
    ? <ServerSafeAIAuth basePath={basePath} mode="update" />
    : <ServerSafeAIAuth basePath={basePath} mode="login" initialMessage="Solicite um novo link de recuperação." />;
}
