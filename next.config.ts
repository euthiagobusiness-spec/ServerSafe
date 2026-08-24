import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const aiSlug = /^[A-Za-z0-9_-]{12,128}$/.test(process.env.SERVERSAFE_AI_SLUG ?? "")
  ? process.env.SERVERSAFE_AI_SLUG!
  : "__serversafe_ai_disabled__";

const supabaseOrigin = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
})();

const aiHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Content-Security-Policy", value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}; frame-ancestors 'none'; base-uri 'none'; form-action 'self'` },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [
      { source: `/${aiSlug}`, headers: aiHeaders },
      { source: `/${aiSlug}/:path*`, headers: aiHeaders },
    ];
  },
};

export default nextConfig;
