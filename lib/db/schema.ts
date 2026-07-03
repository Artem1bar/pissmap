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

export type ReviewStatus = "pending" | "approved" | "rejected";
