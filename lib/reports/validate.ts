import { hasLink, isHoneypot, tooFast } from "../antispam";
import type { ReportReason } from "../db/schema";
import { isKnownSpotId } from "../spots";
import { REPORT_DETAIL_MAX, REPORT_MIN_COMPOSE_MS, REPORT_RATE_DAY_MAX, REPORT_REASONS } from "./limits";

// Problem-report validation, composed over the shared anti-spam kit exactly like
// reviews. Pure functions, every rejection path unit-testable. Defense in depth
// mirrors the reports table's check constraints.

export { REPORT_DETAIL_MAX, REPORT_MIN_COMPOSE_MS, REPORT_RATE_DAY_MAX };

/** Raw, untrusted shape off `request.json()`. */
export interface RawReportInput {
  spotId?: unknown;
  reason?: unknown;
  detail?: unknown;
  /** Honeypot — hidden field bots fill in. */
  website?: unknown;
  /** Milliseconds the report form was open before submit. */
  t?: unknown;
}

export interface CleanReport {
  spotId: string;
  reason: ReportReason;
  detail: string | null;
}

export type ReportValidation =
  | { kind: "honeypot" }
  | { kind: "invalid"; status: number; error: string }
  | { kind: "valid"; value: CleanReport };

function invalid(error: string, status = 400): ReportValidation {
  return { kind: "invalid", status, error };
}

function isReason(value: unknown): value is ReportReason {
  return typeof value === "string" && (REPORT_REASONS as readonly string[]).includes(value);
}

export function validateReport(input: RawReportInput): ReportValidation {
  // 1. Honeypot — fake success upstream so bots learn nothing.
  if (isHoneypot(input.website)) return { kind: "honeypot" };

  // 2. Spot must be a real curated spot (you can't report a private pin).
  if (typeof input.spotId !== "string" || !isKnownSpotId(input.spotId)) {
    return invalid("That spot isn't on the map.");
  }

  // 3. Reason must be one of the fixed chips.
  if (!isReason(input.reason)) return invalid("Pick a reason.");

  // 4. Detail is optional; trim, cap length, block links.
  let detail: string | null = null;
  if (typeof input.detail === "string") {
    const trimmed = input.detail.trim();
    if (trimmed.length > REPORT_DETAIL_MAX) {
      return invalid(`Keep it under ${REPORT_DETAIL_MAX} characters.`);
    }
    if (hasLink(trimmed)) return invalid("Links aren't allowed — just describe the problem.");
    detail = trimmed.length > 0 ? trimmed : null;
  }

  // 5. Form must have been open long enough to be a real human.
  if (tooFast(input.t, REPORT_MIN_COMPOSE_MS)) {
    return invalid("Whoa there — take a breath and try again.", 429);
  }

  return { kind: "valid", value: { spotId: input.spotId, reason: input.reason, detail } };
}

/** True when this hashed IP has hit its daily report cap. */
export function exceedsReportRateLimit(counts: { lastDay: number }): boolean {
  return counts.lastDay >= REPORT_RATE_DAY_MAX;
}
