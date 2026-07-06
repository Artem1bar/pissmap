import { and, desc, eq, sql } from "drizzle-orm";
import type { SpotOverride } from "../overrides";
import type { PublicReview } from "../reviews/types";
import type { Db } from "./index";
import {
  overrides,
  reports,
  reviews,
  scans,
  type OverrideKind,
  type ReportReason,
  type ReportStatus,
  type ReviewStatus,
} from "./schema";

// Every database read/write the app performs lives here, typed against the
// Drizzle client `getDb()` returns. Tests drive the exact same functions against
// a PGlite instance (cast to Db), so the SQL is exercised for real, not mocked.

export type { PublicReview };

/** What the POST route hands us after validation + IP hashing. */
export interface NewReview {
  spotId: string;
  rating: number;
  body: string;
  nickname: string | null;
  ipHash: string;
}

/** A review as shown to the moderator — adds status + hashed IP for triage. */
export interface AdminReview extends PublicReview {
  status: ReviewStatus;
  ipHash: string;
}

export interface Aggregate {
  avg: number;
  count: number;
}

export interface ScanStat {
  slug: string;
  total: number;
  last7: number;
}

export interface ScanTotals {
  total: number;
  last7: number;
}

function iso(value: Date): string {
  return value.toISOString();
}

export async function insertReview(
  db: Db,
  review: NewReview,
): Promise<{ id: string; status: ReviewStatus }> {
  const [row] = await db
    .insert(reviews)
    .values({
      spotId: review.spotId,
      rating: review.rating,
      body: review.body,
      nickname: review.nickname,
      ipHash: review.ipHash,
    })
    .returning({ id: reviews.id, status: reviews.status });
  return { id: row.id, status: row.status as ReviewStatus };
}

export async function listApprovedForSpot(
  db: Db,
  spotId: string,
  limit = 50,
): Promise<PublicReview[]> {
  const rows = await db
    .select({
      id: reviews.id,
      spotId: reviews.spotId,
      rating: reviews.rating,
      body: reviews.body,
      nickname: reviews.nickname,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(and(eq(reviews.spotId, spotId), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: iso(r.createdAt) }));
}

export async function aggregateForSpot(db: Db, spotId: string): Promise<Aggregate> {
  const [row] = await db
    .select({
      avg: sql<string>`coalesce(avg(${reviews.rating}), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(reviews)
    .where(and(eq(reviews.spotId, spotId), eq(reviews.status, "approved")));
  return { avg: Number(row?.avg ?? 0), count: Number(row?.count ?? 0) };
}

export async function listRecentApproved(db: Db, limit = 30): Promise<PublicReview[]> {
  const rows = await db
    .select({
      id: reviews.id,
      spotId: reviews.spotId,
      rating: reviews.rating,
      body: reviews.body,
      nickname: reviews.nickname,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(eq(reviews.status, "approved"))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: iso(r.createdAt) }));
}

/** Rolling review counts for one hashed IP — the raw material for rate limiting. */
export async function countRecentByIp(
  db: Db,
  ipHash: string,
): Promise<{ lastHour: number; lastDay: number }> {
  const [row] = await db
    .select({
      lastHour: sql<string>`count(*) filter (where ${reviews.createdAt} >= now() - interval '1 hour')`,
      lastDay: sql<string>`count(*) filter (where ${reviews.createdAt} >= now() - interval '24 hours')`,
    })
    .from(reviews)
    .where(eq(reviews.ipHash, ipHash));
  return { lastHour: Number(row?.lastHour ?? 0), lastDay: Number(row?.lastDay ?? 0) };
}

function toAdminRows(
  rows: Array<{
    id: string;
    spotId: string;
    rating: number;
    body: string;
    nickname: string | null;
    status: string;
    ipHash: string;
    createdAt: Date;
  }>,
): AdminReview[] {
  return rows.map((r) => ({
    id: r.id,
    spotId: r.spotId,
    rating: r.rating,
    body: r.body,
    nickname: r.nickname,
    status: r.status as ReviewStatus,
    ipHash: r.ipHash,
    createdAt: iso(r.createdAt),
  }));
}

const ADMIN_COLUMNS = {
  id: reviews.id,
  spotId: reviews.spotId,
  rating: reviews.rating,
  body: reviews.body,
  nickname: reviews.nickname,
  status: reviews.status,
  ipHash: reviews.ipHash,
  createdAt: reviews.createdAt,
} as const;

export async function listByStatus(
  db: Db,
  status: ReviewStatus,
  limit = 100,
): Promise<AdminReview[]> {
  const rows = await db
    .select(ADMIN_COLUMNS)
    .from(reviews)
    .where(eq(reviews.status, status))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
  return toAdminRows(rows);
}

export async function countByStatus(db: Db, status: ReviewStatus): Promise<number> {
  const [row] = await db
    .select({ count: sql<string>`count(*)` })
    .from(reviews)
    .where(eq(reviews.status, status));
  return Number(row?.count ?? 0);
}

/** Moderate a review. Returns false when the id doesn't exist (already handled elsewhere). */
export async function setReviewStatus(
  db: Db,
  id: string,
  status: ReviewStatus,
): Promise<boolean> {
  const updated = await db
    .update(reviews)
    .set({ status })
    .where(eq(reviews.id, id))
    .returning({ id: reviews.id });
  return updated.length > 0;
}

export async function insertScan(db: Db, slug: string): Promise<void> {
  await db.insert(scans).values({ slug });
}

export async function scanStats(db: Db): Promise<ScanStat[]> {
  const rows = await db
    .select({
      slug: scans.slug,
      total: sql<string>`count(*)`,
      last7: sql<string>`count(*) filter (where ${scans.createdAt} >= now() - interval '7 days')`,
    })
    .from(scans)
    .groupBy(scans.slug)
    .orderBy(desc(sql`count(*)`));
  return rows.map((r) => ({ slug: r.slug, total: Number(r.total), last7: Number(r.last7) }));
}

/** Site-wide scan totals for the admin System tab (all slugs collapsed). */
export async function scanTotals(db: Db): Promise<ScanTotals> {
  const [row] = await db
    .select({
      total: sql<string>`count(*)`,
      last7: sql<string>`count(*) filter (where ${scans.createdAt} >= now() - interval '7 days')`,
    })
    .from(scans);
  return { total: Number(row?.total ?? 0), last7: Number(row?.last7 ?? 0) };
}

/** Every review count in one query, zero-filled for statuses with no rows. */
export async function reviewCountsByStatus(db: Db): Promise<Record<ReviewStatus, number>> {
  const rows = await db
    .select({ status: reviews.status, count: sql<string>`count(*)` })
    .from(reviews)
    .groupBy(reviews.status);
  const counts: Record<ReviewStatus, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const r of rows) counts[r.status as ReviewStatus] = Number(r.count);
  return counts;
}

/** A cheap liveness probe: resolves when the connection answers, throws otherwise. */
export async function pingDb(db: Db): Promise<void> {
  await db.execute(sql`select 1`);
}

// ——— Problem reports (Phase 2) ———

export interface NewReport {
  spotId: string;
  reason: ReportReason;
  detail: string | null;
  ipHash: string;
}

export interface AdminReport {
  id: number;
  spotId: string;
  reason: ReportReason;
  detail: string | null;
  ipHash: string;
  status: ReportStatus;
  createdAt: string;
}

export async function insertReport(db: Db, report: NewReport): Promise<void> {
  await db.insert(reports).values({
    spotId: report.spotId,
    reason: report.reason,
    detail: report.detail,
    ipHash: report.ipHash,
  });
}

/** Rolling daily report count for one hashed IP — the raw material for the 5/day cap. */
export async function countRecentReportsByIp(
  db: Db,
  ipHash: string,
): Promise<{ lastDay: number }> {
  const [row] = await db
    .select({
      lastDay: sql<string>`count(*) filter (where ${reports.createdAt} >= now() - interval '24 hours')`,
    })
    .from(reports)
    .where(eq(reports.ipHash, ipHash));
  return { lastDay: Number(row?.lastDay ?? 0) };
}

export async function listReportsByStatus(
  db: Db,
  status: ReportStatus,
  limit = 300,
): Promise<AdminReport[]> {
  const rows = await db
    .select({
      id: reports.id,
      spotId: reports.spotId,
      reason: reports.reason,
      detail: reports.detail,
      ipHash: reports.ipHash,
      status: reports.status,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(eq(reports.status, status))
    .orderBy(desc(reports.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    spotId: r.spotId,
    reason: r.reason as ReportReason,
    detail: r.detail,
    ipHash: r.ipHash,
    status: r.status as ReportStatus,
    createdAt: iso(r.createdAt),
  }));
}

export async function countReportsByStatus(db: Db, status: ReportStatus): Promise<number> {
  const [row] = await db
    .select({ count: sql<string>`count(*)` })
    .from(reports)
    .where(eq(reports.status, status));
  return Number(row?.count ?? 0);
}

/** Resolve or dismiss every open report for a spot at once. Returns rows touched. */
export async function setOpenReportsStatus(
  db: Db,
  spotId: string,
  status: Exclude<ReportStatus, "open">,
): Promise<number> {
  const updated = await db
    .update(reports)
    .set({ status })
    .where(and(eq(reports.spotId, spotId), eq(reports.status, "open")))
    .returning({ id: reports.id });
  return updated.length;
}

// ——— Live spot overrides (Phase 2) ———

export async function listOverrides(db: Db): Promise<SpotOverride[]> {
  const rows = await db
    .select({ spotId: overrides.spotId, kind: overrides.kind, note: overrides.note })
    .from(overrides);
  return rows.map((r) => ({ spotId: r.spotId, kind: r.kind as OverrideKind, note: r.note }));
}

/** Set (or replace) a spot's override. `note` is only meaningful for `warn`. */
export async function upsertOverride(
  db: Db,
  spotId: string,
  kind: OverrideKind,
  note: string | null,
): Promise<void> {
  await db
    .insert(overrides)
    .values({ spotId, kind, note })
    .onConflictDoUpdate({
      target: overrides.spotId,
      set: { kind, note, updatedAt: sql`now()` },
    });
}

export async function deleteOverride(db: Db, spotId: string): Promise<void> {
  await db.delete(overrides).where(eq(overrides.spotId, spotId));
}
