import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isConfiguredSlug } from "@/features/server-safe-ai/config";
import { ServerSafeAIAuth } from "@/features/server-safe-ai/ServerSafeAIAuth";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recuperar acesso | AI Teste", robots: { index: false, follow: false } };

export default async function RecoverPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isConfiguredSlug(slug)) notFound();
  const basePath = `/${slug}`;
  try {
    getSupabasePublicConfig();
  } catch {
    return <ServerSafeAIAuth basePath={basePath} mode="configuration" />;
  }
  return <ServerSafeAIAuth basePath={basePath} mode="recover" />;
}
