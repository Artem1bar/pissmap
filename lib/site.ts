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

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
