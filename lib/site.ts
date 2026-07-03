// One source of truth for the app's public base URL. The domain isn't bought
// yet, so everything URL-ish (permalinks, OG images, QR codes, share links)
// resolves through here: an explicit NEXT_PUBLIC_SITE_URL wins, then Vercel's
// production URL, then localhost. No trailing slash, ever.

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return stripTrailingSlash(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** True once a real domain (or Vercel URL) is configured — gates the "print me" warnings. */
export function hasRealDomain(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL);
}

/** The shareable permalink path for a spot, e.g. "/spot/erin-rose". */
export function spotPath(id: string): string {
  return `/spot/${encodeURIComponent(id)}`;
}

/** The short scan path a QR code encodes, e.g. "/s/erin-rose". */
export function scanPath(id: string): string {
  return `/s/${encodeURIComponent(id)}`;
}

/** Absolute permalink URL for a spot. */
export function spotUrl(id: string): string {
  return `${siteUrl()}${spotPath(id)}`;
}

/** Absolute scan URL (what a QR sticker encodes). */
export function scanUrl(id: string): string {
  return `${siteUrl()}${scanPath(id)}`;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
