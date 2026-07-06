import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/lib/db/__tests__/testdb";
import { listReportsByStatus, upsertOverride } from "@/lib/db/queries";
import type { Db } from "@/lib/db";

// Inject a real PGlite DB for getDb/resolveDb, exactly like the reviews route
// test, so every path runs against real SQL.
const holder = vi.hoisted(() => ({ db: null as Db | null }));
vi.mock("@/lib/db", () => ({
  getDb: () => holder.db,
  resolveDb: async () => holder.db,
  isDbConfigured: () => holder.db !== null,
}));

const { POST } = await import("../route");
const { GET: OVERRIDES } = await import("../../overrides/route");

const SPOT = "clover-grill";

function postReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/reports", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const good = { spotId: SPOT, reason: "closed", detail: "Padlocked.", t: 4000 };

beforeEach(async () => {
  holder.db = await createTestDb();
  process.env.IP_SALT = "test-salt";
});

describe("POST /api/reports", () => {
  it("stores a valid open report", async () => {
    const res = await POST(postReq(good));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await listReportsByStatus(holder.db!, "open")).toHaveLength(1);
  });

  it("fakes success for the honeypot but stores nothing", async () => {
    const res = await POST(postReq({ ...good, website: "http://spam.example" }));
    expect(res.status).toBe(200);
    expect(await listReportsByStatus(holder.db!, "open")).toHaveLength(0);
  });

  it("rejects an unknown reason and an unknown spot with 400", async () => {
    expect((await POST(postReq({ ...good, reason: "haunted" }))).status).toBe(400);
    expect((await POST(postReq({ ...good, spotId: "nope" }))).status).toBe(400);
    expect(await listReportsByStatus(holder.db!, "open")).toHaveLength(0);
  });

  it("rejects a too-fast submission with 429", async () => {
    expect((await POST(postReq({ ...good, t: 100 }))).status).toBe(429);
  });

  it("caps at 5 reports per IP per day", async () => {
    const ip = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < 5; i++) {
      expect((await POST(postReq(good, ip))).status).toBe(200);
    }
    expect((await POST(postReq(good, ip))).status).toBe(429);
    // A different IP is unaffected.
    expect((await POST(postReq(good, { "x-forwarded-for": "198.51.100.9" }))).status).toBe(200);
  });

  it("returns 503 when no database is configured", async () => {
    holder.db = null;
    expect((await POST(postReq(good))).status).toBe(503);
  });
});

describe("GET /api/overrides", () => {
  it("returns the override list with a cache header", async () => {
    await upsertOverride(holder.db!, SPOT, "warn", "verifying");
    const res = await OVERRIDES();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=300");
    const data = await res.json();
    expect(data.overrides).toEqual([{ spotId: SPOT, kind: "warn", note: "verifying" }]);
  });

  it("degrades to an empty list (never 503) with no database", async () => {
    holder.db = null;
    const res = await OVERRIDES();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, overrides: [] });
  });
});
