import { createHash, timingSafeEqual } from "node:crypto";

// Admin auth is deliberately minimal: one shared ADMIN_SECRET, no accounts. The
// cookie carries a hashed token (never the raw secret), and every check is
// constant-time. Cookies are read/written via plain headers rather than the
// next/headers helper, which keeps the route handlers unit-testable.

export const ADMIN_COOKIE = "pissmap_admin";
/** A week — Artem bookmarks /admin and moderates from a phone. */
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function adminSecret(): string | null {
  return process.env.ADMIN_SECRET || null;
}

/** When false, /admin shows a friendly "disabled" screen and every admin API 503s. */
export function isAdminEnabled(): boolean {
  return Boolean(adminSecret());
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** The value stored in the admin cookie — the hashed secret, not the secret itself. */
export function adminToken(): string | null {
  const secret = adminSecret();
  return secret ? sha(secret) : null;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Constant-time check that a submitted secret matches ADMIN_SECRET. */
export function secretMatches(candidate: string): boolean {
  const token = adminToken();
  if (!token) return false;
  return safeEqual(sha(candidate), token);
}

/** Constant-time check that a cookie value carries the valid admin token. */
export function cookieAuthorized(cookieValue: string | null | undefined): boolean {
  const token = adminToken();
  if (!token || !cookieValue) return false;
  return safeEqual(cookieValue, token);
}

/** Pull a single cookie out of a raw Cookie header. */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

/** True when the request carries a valid admin cookie. */
export function requestAuthorized(request: Request): boolean {
  return cookieAuthorized(readCookie(request.headers.get("cookie"), ADMIN_COOKIE));
}

/** A Set-Cookie value for the admin session (Secure only in production so localhost works). */
export function adminCookie(token: string, maxAge: number = ADMIN_COOKIE_MAX_AGE): string {
  const attrs = [`${ADMIN_COOKIE}=${token}`, "HttpOnly", "SameSite=Lax", "Path=/", `Max-Age=${maxAge}`];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}
