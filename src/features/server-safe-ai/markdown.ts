const SAFE_ABSOLUTE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function safeMarkdownUrl(value: string) {
  const url = value.trim();
  if (!url) return "";
  if (url.startsWith("#") || (url.startsWith("/") && !url.startsWith("//"))) return url;
  try {
    return SAFE_ABSOLUTE_PROTOCOLS.has(new URL(url).protocol.toLowerCase()) ? url : "";
  } catch {
    return "";
  }
}
