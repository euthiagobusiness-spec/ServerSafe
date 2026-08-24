export const SUPABASE_PUBLIC_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export class SupabaseConfigurationError extends Error {
  constructor() {
    super("SUPABASE_CONFIGURATION_INVALID");
    this.name = "SupabaseConfigurationError";
  }
}

function validProjectUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch {
    return false;
  }
}

export function validateSupabasePublicConfig(input: {
  url?: string;
  publishableKey?: string;
}): SupabasePublicConfig {
  const url = input.url?.trim() ?? "";
  const publishableKey = input.publishableKey?.trim() ?? "";

  if (!validProjectUrl(url) || !publishableKey.startsWith("sb_publishable_")) {
    throw new SupabaseConfigurationError();
  }

  return { url, publishableKey };
}

export function getSupabasePublicConfig() {
  return validateSupabasePublicConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
