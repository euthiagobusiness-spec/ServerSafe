import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { isConfiguredSlug } from "@/features/server-safe-ai/config";
import { ServerSafeAIClient } from "@/features/server-safe-ai/ServerSafeAIClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ServerSafe AI",
  description: "Interface privada ServerSafe AI.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#07111f" };

export default async function PrivateAIPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isConfiguredSlug(slug)) notFound();
  return <ServerSafeAIClient basePath={`/${slug}`} />;
}
