import { createHash } from "node:crypto";

// The shared server-side anti-spam kit. Reviews and reports both run the same
// honeypot / min-compose-time / link-block / salted-IP checks, so the primitives
// live here as pure functions and each validator composes them. No database,
// no request object — every rejection path stays unit-testable in isolation.

/** Any http(s):// or bare www. link — user text on a pee map is never a URL. */
export const URL_RE = /(https?:\/\/|www\.)/i;

/** Honeypot: real UIs keep this hidden field empty; bots fill it in. */
export function isHoneypot(website: unknown): boolean {
  return typeof website === "string" && website.trim().length > 0;
}

/** True when the composer was open for less than `minMs` — too fast to be human. */
export function tooFast(t: unknown, minMs: number): boolean {
  return typeof t !== "number" || !Number.isFinite(t) || t < minMs;
}

/** True when the text carries a link. */
export function hasLink(text: string): boolean {
  return URL_RE.test(text);
}

/** Stable, non-reversible IP fingerprint: sha256(salt:ip) truncated to 16 hex. */
export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

/** First value of an X-Forwarded-For header, or "unknown" when absent. */
export function clientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return "unknown";
  const first = forwardedFor.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "unknown";
}
