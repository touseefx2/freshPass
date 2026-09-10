/** Resolve relative API image paths with EXPO_PUBLIC_API_BASE_URL. */
export function resolveApiImageUrl(image?: string | null): string | null {
  if (!image?.trim()) return null;

  const trimmed = image.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(
    /\/$/,
    "",
  );
  if (!baseUrl) return trimmed;

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${baseUrl}${path}`;
}

/** Old AI host removed after CDN migration — these URLs never load. */
export function isLegacyAiMediaUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return host === "ai.getfreshpass.com" || host.endsWith(".ai.getfreshpass.com");
  } catch {
    return /ai\.getfreshpass\.com/i.test(url);
  }
}
