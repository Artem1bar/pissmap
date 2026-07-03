// Tiny shared helpers for the review route handlers: consistent JSON envelopes
// and the one CDN cache policy the read endpoints share. Kept driver-free so it
// imports cleanly anywhere.

/** CDN cache for read endpoints: fresh 30s, serve-stale-while-revalidating 2min. */
export const REVIEWS_CACHE = "s-maxage=30, stale-while-revalidate=120";

interface JsonInit {
  status?: number;
  cache?: string;
}

export function jsonResponse(data: unknown, init: JsonInit = {}): Response {
  const headers: Record<string, string> = {};
  if (init.cache) headers["cache-control"] = init.cache;
  return Response.json(data, { status: init.status ?? 200, headers });
}

/** The honest 503 every review endpoint returns when no DATABASE_URL is set. */
export function notConfigured(): Response {
  return jsonResponse({ ok: false, reason: "reviews-not-configured" }, { status: 503 });
}
