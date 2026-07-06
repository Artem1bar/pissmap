import { describe, expect, it } from "vitest";
import { reviews, scans } from "../schema";
import {
  aggregateForSpot,
  countByStatus,
  countRecentByIp,
  countRecentReportsByIp,
  countReportsByStatus,
  deleteOverride,
  insertReport,
  insertReview,
  insertScan,
  listApprovedForSpot,
  listByStatus,
  listOverrides,
  listRecentApproved,
  listReportsByStatus,
  pingDb,
  reviewCountsByStatus,
  scanStats,
  scanTotals,
  setOpenReportsStatus,
  setReviewStatus,
  upsertOverride,
} from "../queries";
import { createTestDb } from "./testdb";
import { reports } from "../schema";
import type { Db } from "../index";

const base = {
  spotId: "erin-rose",
  rating: 4,
  body: "Lifesaver at 1am.",
  nickname: "Nightcrawler",
  ipHash: "abc123",
};

async function seedApproved(db: Db, spotId: string, rating: number): Promise<string> {
  const { id } = await insertReview(db, { ...base, spotId, rating });
  await setReviewStatus(db, id, "approved");
  return id;
}

describe("insertReview / moderation lifecycle", () => {
  it("stores reviews as pending and hides them until approved", async () => {
    const db = await createTestDb();
    const { id, status } = await insertReview(db, base);
    expect(status).toBe("pending");

    expect(await listApprovedForSpot(db, "erin-rose")).toHaveLength(0);
    expect(await countByStatus(db, "pending")).toBe(1);
    const pending = await listByStatus(db, "pending");
    expect(pending[0].id).toBe(id);
    expect(pending[0].ipHash).toBe("abc123");

    expect(await setReviewStatus(db, id, "approved")).toBe(true);
    const approved = await listApprovedForSpot(db, "erin-rose");
    expect(approved).toHaveLength(1);
    expect(approved[0].body).toBe("Lifesaver at 1am.");
    expect(typeof approved[0].createdAt).toBe("string");
  });

  it("returns false when moderating a non-existent id", async () => {
    const db = await createTestDb();
    expect(await setReviewStatus(db, "00000000-0000-0000-0000-000000000000", "approved")).toBe(
      false,
    );
  });

  it("can retract an approved review back to rejected", async () => {
    const db = await createTestDb();
    const id = await seedApproved(db, "erin-rose", 5);
    expect(await listApprovedForSpot(db, "erin-rose")).toHaveLength(1);
    await setReviewStatus(db, id, "rejected");
    expect(await listApprovedForSpot(db, "erin-rose")).toHaveLength(0);
  });
});

describe("aggregateForSpot", () => {
  it("averages only approved reviews", async () => {
    const db = await createTestDb();
    await seedApproved(db, "erin-rose", 5);
    await seedApproved(db, "erin-rose", 3);
    await insertReview(db, { ...base, rating: 1 }); // pending, must not count

    const agg = await aggregateForSpot(db, "erin-rose");
    expect(agg.count).toBe(2);
    expect(agg.avg).toBeCloseTo(4, 5);
  });

  it("reports zeros for a spot with no reviews", async () => {
    const db = await createTestDb();
    expect(await aggregateForSpot(db, "nowhere")).toEqual({ avg: 0, count: 0 });
  });
});

describe("listApprovedForSpot / listRecentApproved ordering", () => {
  it("returns newest first and respects the limit", async () => {
    const db = await createTestDb();
    // Insert with explicit, increasing timestamps to make ordering deterministic.
    const t0 = new Date("2026-07-01T00:00:00Z");
    for (let i = 0; i < 3; i++) {
      await db.insert(reviews).values({
        spotId: "erin-rose",
        rating: 3,
        body: `review ${i}`,
        nickname: null,
        ipHash: "x",
        status: "approved",
        createdAt: new Date(t0.getTime() + i * 60_000),
      });
    }
    const list = await listApprovedForSpot(db, "erin-rose", 2);
    expect(list).toHaveLength(2);
    expect(list[0].body).toBe("review 2"); // newest
    expect(list[1].body).toBe("review 1");
  });

  it("gathers recent approved across all spots", async () => {
    const db = await createTestDb();
    await seedApproved(db, "erin-rose", 4);
    await seedApproved(db, "cafe-du-monde", 5);
    const recent = await listRecentApproved(db, 10);
    expect(recent).toHaveLength(2);
    expect(new Set(recent.map((r) => r.spotId))).toEqual(new Set(["erin-rose", "cafe-du-monde"]));
  });
});

describe("countRecentByIp rate-limit windows", () => {
  it("counts recent rows per IP and excludes old ones", async () => {
    const db = await createTestDb();
    const now = Date.now();
    // Two fresh, one 2h ago, one 2d ago — all same IP.
    for (const offset of [0, -1_000, -2 * 3600_000, -2 * 86_400_000]) {
      await db.insert(reviews).values({
        spotId: "erin-rose",
        rating: 3,
        body: "x",
        nickname: null,
        ipHash: "rate-ip",
        createdAt: new Date(now + offset),
      });
    }
    // A different IP shouldn't leak into the count.
    await db.insert(reviews).values({
      spotId: "erin-rose",
      rating: 3,
      body: "y",
      nickname: null,
      ipHash: "other-ip",
    });

    const counts = await countRecentByIp(db, "rate-ip");
    expect(counts.lastHour).toBe(2); // the 2h and 2d rows fall outside the hour
    expect(counts.lastDay).toBe(3); // only the 2d row falls outside the day
  });
});

describe("scans", () => {
  it("aggregates scan counts with a 7-day window", async () => {
    const db = await createTestDb();
    await insertScan(db, "erin-rose");
    await insertScan(db, "erin-rose");
    await insertScan(db, "cafe-du-monde");
    // An old scan of erin-rose: counts toward total, not last7.
    await db.insert(scans).values({
      slug: "erin-rose",
      createdAt: new Date(Date.now() - 10 * 86_400_000),
    });

    const stats = await scanStats(db);
    const erin = stats.find((s) => s.slug === "erin-rose");
    expect(erin).toBeDefined();
    expect(erin?.total).toBe(3);
    expect(erin?.last7).toBe(2);
    // Ordered by total descending — erin-rose (3) before cafe-du-monde (1).
    expect(stats[0].slug).toBe("erin-rose");
  });

  it("collapses every slug into site-wide scan totals", async () => {
    const db = await createTestDb();
    await insertScan(db, "erin-rose");
    await insertScan(db, "cafe-du-monde");
    await db.insert(scans).values({
      slug: "erin-rose",
      createdAt: new Date(Date.now() - 10 * 86_400_000),
    });

    const totals = await scanTotals(db);
    expect(totals.total).toBe(3);
    expect(totals.last7).toBe(2);
  });

  it("reports zero totals with no scans", async () => {
    const db = await createTestDb();
    expect(await scanTotals(db)).toEqual({ total: 0, last7: 0 });
  });
});

describe("reviewCountsByStatus", () => {
  it("counts every status in one pass, zero-filling the empties", async () => {
    const db = await createTestDb();
    const a = await seedApproved(db, "erin-rose", 5);
    await seedApproved(db, "cafe-du-monde", 4);
    await insertReview(db, { ...base, spotId: "erin-rose" }); // pending
    await setReviewStatus(db, a, "approved");

    const counts = await reviewCountsByStatus(db);
    expect(counts).toEqual({ pending: 1, approved: 2, rejected: 0 });
  });
});

describe("pingDb", () => {
  it("resolves against a live connection", async () => {
    const db = await createTestDb();
    await expect(pingDb(db)).resolves.toBeUndefined();
  });
});

describe("reports lifecycle", () => {
  it("inserts open reports and lists them newest-first by status", async () => {
    const db = await createTestDb();
    await insertReport(db, { spotId: "clover-grill", reason: "closed", detail: "Padlocked.", ipHash: "ip1" });
    await insertReport(db, { spotId: "clover-grill", reason: "wrong-hours", detail: null, ipHash: "ip2" });

    const open = await listReportsByStatus(db, "open");
    expect(open).toHaveLength(2);
    expect(await countReportsByStatus(db, "open")).toBe(2);
    expect(typeof open[0].createdAt).toBe("string");
    expect(open[0].reason).toBe("wrong-hours"); // newest first
  });

  it("resolves all open reports for one spot without touching others", async () => {
    const db = await createTestDb();
    await insertReport(db, { spotId: "clover-grill", reason: "closed", detail: null, ipHash: "a" });
    await insertReport(db, { spotId: "clover-grill", reason: "other", detail: null, ipHash: "b" });
    await insertReport(db, { spotId: "erin-rose", reason: "closed", detail: null, ipHash: "c" });

    const touched = await setOpenReportsStatus(db, "clover-grill", "resolved");
    expect(touched).toBe(2);
    expect(await countReportsByStatus(db, "open")).toBe(1); // erin-rose survives
    expect(await countReportsByStatus(db, "resolved")).toBe(2);
  });

  it("counts a hashed IP's reports in the last day", async () => {
    const db = await createTestDb();
    const now = Date.now();
    for (const offset of [0, -1000, -2 * 86_400_000]) {
      await db.insert(reports).values({
        spotId: "clover-grill",
        reason: "closed",
        detail: null,
        ipHash: "rate-ip",
        createdAt: new Date(now + offset),
      });
    }
    expect((await countRecentReportsByIp(db, "rate-ip")).lastDay).toBe(2);
  });
});

describe("overrides", () => {
  it("upserts, lists, and deletes a spot override", async () => {
    const db = await createTestDb();
    await upsertOverride(db, "clover-grill", "warn", "Reported closed — verifying");
    let all = await listOverrides(db);
    expect(all).toEqual([{ spotId: "clover-grill", kind: "warn", note: "Reported closed — verifying" }]);

    // Upsert replaces in place (still one row), flipping warn → hide.
    await upsertOverride(db, "clover-grill", "hide", null);
    all = await listOverrides(db);
    expect(all).toEqual([{ spotId: "clover-grill", kind: "hide", note: null }]);

    await deleteOverride(db, "clover-grill");
    expect(await listOverrides(db)).toHaveLength(0);
  });
});
