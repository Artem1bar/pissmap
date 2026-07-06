import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

// The community layer's entire persistence surface. Driver-agnostic (pg-core),
// so the same schema runs on Neon (production, HTTP driver) and PGlite (dev +
// vitest). Keep this file importable anywhere — it pulls in no live connection.

/** A single 1–5 droplet review. Pre-moderated: nothing is public until approved. */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spotId: text("spot_id").notNull(),
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    /** Optional display handle; null renders as an anonymous critter. */
    nickname: text("nickname"),
    /** pending → approved → rejected. Nothing but 'approved' is ever served publicly. */
    status: text("status").notNull().default("pending"),
    /** sha256(IP_SALT:ip) truncated — for rate limiting and abuse triage, never shown raw. */
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reviews_spot_status_created_idx").on(t.spotId, t.status, t.createdAt.desc()),
    index("reviews_ip_created_idx").on(t.ipHash, t.createdAt.desc()),
    check("reviews_rating_range", sql`${t.rating} between 1 and 5`),
    check("reviews_body_len", sql`char_length(${t.body}) between 1 and 280`),
    check("reviews_nickname_len", sql`${t.nickname} is null or char_length(${t.nickname}) <= 24`),
    check("reviews_status_values", sql`${t.status} in ('pending', 'approved', 'rejected')`),
  ],
);

/** One row per QR/short-link hit. Powers the tiny scan-counts table in /admin. */
export const scans = pgTable(
  "scans",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("scans_slug_idx").on(t.slug)],
);

/**
 * A "this spot is wrong" report from a visitor — the sensor half of the
 * data-repair loop. Reason is a fixed vocabulary; free-text detail is optional
 * and capped. Moderated in /admin: open → resolved | dismissed.
 */
export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    spotId: text("spot_id").notNull(),
    /** closed | wrong-hours | no-restroom | other */
    reason: text("reason").notNull(),
    /** Optional extra context, ≤200 chars. */
    detail: text("detail"),
    ipHash: text("ip_hash").notNull(),
    /** open → resolved | dismissed. */
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reports_spot_status_created_idx").on(t.spotId, t.status, t.createdAt.desc()),
    index("reports_ip_created_idx").on(t.ipHash, t.createdAt.desc()),
    check("reports_reason_values", sql`${t.reason} in ('closed', 'wrong-hours', 'no-restroom', 'other')`),
    check("reports_detail_len", sql`${t.detail} is null or char_length(${t.detail}) <= 200`),
    check("reports_status_values", sql`${t.status} in ('open', 'resolved', 'dismissed')`),
  ],
);

/**
 * A runtime patch layer over the static dataset — the actuator half of the loop.
 * One row per corrected spot: `hide` drops it from map/list/GOTTA GEAUX, `warn`
 * shows an amber banner on the detail card. Small and temporary by design; the
 * curated dataset stays the source of truth.
 */
export const overrides = pgTable(
  "overrides",
  {
    spotId: text("spot_id").primaryKey(),
    /** hide | warn */
    kind: text("kind").notNull(),
    /** Short moderator note shown on the warn banner, ≤140 chars. */
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("overrides_kind_values", sql`${t.kind} in ('hide', 'warn')`),
    check("overrides_note_len", sql`${t.note} is null or char_length(${t.note}) <= 140`),
  ],
);

export type ReviewStatus = "pending" | "approved" | "rejected";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type ReportReason = "closed" | "wrong-hours" | "no-restroom" | "other";
export type OverrideKind = "hide" | "warn";
