import { hasLink, isHoneypot, tooFast } from "../antispam";
import { isKnownSpotId } from "../spots";
import { BODY_MAX, MIN_COMPOSE_MS, NICKNAME_MAX, RATE_DAY_MAX, RATE_HOUR_MAX } from "./limits";

// Review-specific validation composed over the shared anti-spam kit (lib/antispam).
// The POST route is a thin shell that calls validateReview(), hashes the IP,
// checks the DB rate limit, and inserts. Defense in depth mirrors the DB checks.

// Re-exported so existing importers (and tests) keep a single entry point.
export { BODY_MAX, MIN_COMPOSE_MS, NICKNAME_MAX, RATE_DAY_MAX, RATE_HOUR_MAX };
export { clientIp, hashIp } from "../antispam";

/** Raw, untrusted shape straight off `request.json()`. Everything is `unknown`. */
export interface RawReviewInput {
  spotId?: unknown;
  rating?: unknown;
  body?: unknown;
  nickname?: unknown;
  /** Honeypot: real UIs keep this empty and hidden; bots fill it in. */
  website?: unknown;
  /** Milliseconds the composer was open before submit. */
  t?: unknown;
}

export interface CleanReview {
  spotId: string;
  rating: number;
  body: string;
  nickname: string | null;
}

export type ValidationResult =
  | { kind: "honeypot" }
  | { kind: "invalid"; status: number; error: string }
  | { kind: "valid"; value: CleanReview };

function invalid(error: string, status = 400): ValidationResult {
  return { kind: "invalid", status, error };
}

export function validateReview(input: RawReviewInput): ValidationResult {
  // 1. Honeypot — return a silent, cheerful non-answer so bots learn nothing.
  if (isHoneypot(input.website)) {
    return { kind: "honeypot" };
  }

  // 2. Spot must be a real curated spot (private user pins can't be reviewed).
  if (typeof input.spotId !== "string" || !isKnownSpotId(input.spotId)) {
    return invalid("That spot isn't on the map.");
  }

  // 3. Rating is an integer 1–5.
  const rating = input.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return invalid("Pick 1 to 5 droplets.");
  }

  // 4. Body: non-empty after trim, within length.
  if (typeof input.body !== "string") {
    return invalid("Say something about the spot.");
  }
  const body = input.body.trim();
  if (body.length === 0) {
    return invalid("Say something about the spot.");
  }
  if (body.length > BODY_MAX) {
    return invalid(`Keep it under ${BODY_MAX} characters.`);
  }

  // 5. No links — kills the entire link-spam category at the door.
  if (hasLink(body)) {
    return invalid("Links aren't allowed — just tell us about the bathroom.");
  }

  // 6. Nickname is optional; blank/whitespace becomes anonymous.
  let nickname: string | null = null;
  if (typeof input.nickname === "string") {
    const trimmed = input.nickname.trim();
    if (trimmed.length > NICKNAME_MAX) {
      return invalid(`Nickname is too long (max ${NICKNAME_MAX}).`);
    }
    nickname = trimmed.length > 0 ? trimmed : null;
  }

  // 7. Composer must have been open long enough to be a real human.
  if (tooFast(input.t, MIN_COMPOSE_MS)) {
    return invalid("Whoa there, speed racer — take a breath and try again.", 429);
  }

  return { kind: "valid", value: { spotId: input.spotId, rating, body, nickname } };
}

/** True when this hashed IP has hit its hourly or daily cap. */
export function exceedsRateLimit(counts: { lastHour: number; lastDay: number }): boolean {
  return counts.lastHour >= RATE_HOUR_MAX || counts.lastDay >= RATE_DAY_MAX;
}
