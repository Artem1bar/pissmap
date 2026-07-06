// Numeric limits + the reason vocabulary for problem reports. Zero dependencies
// so the client report form and the server validator share one source of truth.

export const REPORT_DETAIL_MAX = 200;
/** A report is a chip tap plus maybe a sentence — lighter than writing a review. */
export const REPORT_MIN_COMPOSE_MS = 1500;
/** Stricter than reviews (10/day): 5 reports/day per hashed IP. */
export const REPORT_RATE_DAY_MAX = 5;

/** The fixed reason vocabulary, mirrored by the reports table check constraint. */
export const REPORT_REASONS = ["closed", "wrong-hours", "no-restroom", "other"] as const;

/** Human labels for the reason chips. */
export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  closed: "Closed / gone",
  "wrong-hours": "Wrong hours",
  "no-restroom": "No restroom",
  other: "Something else",
};
