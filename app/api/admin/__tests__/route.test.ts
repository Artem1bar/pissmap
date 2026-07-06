import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE, adminToken } from "@/lib/admin/auth";
import { createTestDb } from "@/lib/db/__tests__/testdb";
import {
  insertReport,
  insertReview,
  insertScan,
  insertSuggestion,
  listByStatus,
  listOverrides,
  listReportsByStatus,
  listSuggestionsByStatus,
} from "@/lib/db/queries";
import type { Db } from "@/lib/db";

const holder = vi.hoisted(() => ({ db: null as Db | null }));
vi.mock("@/lib/db", () => ({
  getDb: () => holder.db,
  resolveDb: async () => holder.db,
  isDbConfigured: () => holder.db !== null,
}));

const { POST: LOGIN } = await import("../login/route");
const { GET: LIST, POST: MODERATE } = await import("../reviews/route");
const { GET: SCANS } = await import("../scans/route");
const { GET: SYSTEM } = await import("../system/route");
const { GET: REPORTS, POST: REPORTS_ACTION } = await import("../reports/route");
const { GET: SUGGESTIONS, POST: SUGGESTIONS_ACTION } = await import("../suggestions/route");

const SECRET = "test-admin-secret";

beforeEach(async () => {
  process.env.ADMIN_SECRET = SECRET;
  holder.db = await createTestDb();
});

function cookie(): string {
  return `${ADMIN_COOKIE}=${adminToken()}`;
}
function loginReq(secret: string): Request {
  return new Request("http://x/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret }),
  });
}
async function seedPending(): Promise<string> {
  const { id } = await insertReview(holder.db!, {
    spotId: "clover-grill",
    rating: 4,
    body: "Pending review to moderate.",
    nickname: "Waiting",
    ipHash: "abcd1234ef",
  });
  return id;
}

describe("POST /api/admin/login", () => {
  it("503s when no ADMIN_SECRET is configured", async () => {
    delete process.env.ADMIN_SECRET;
    const res = await LOGIN(loginReq(SECRET));
    expect(res.status).toBe(503);
  });

  it("rejects the wrong secret with 401", async () => {
    const res = await LOGIN(loginReq("nope"));
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("sets an httpOnly cookie on the right secret", async () => {
    const res = await LOGIN(loginReq(SECRET));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${ADMIN_COOKIE}=${adminToken()}`);
    expect(setCookie).toContain("HttpOnly");
  });
});

describe("GET /api/admin/reviews", () => {
  it("401s without a valid cookie", async () => {
    const res = await LIST(new Request("http://x/api/admin/reviews?status=pending"));
    expect(res.status).toBe(401);
  });

  it("503s when admin is disabled, before touching the DB", async () => {
    delete process.env.ADMIN_SECRET;
    const res = await LIST(new Request("http://x/api/admin/reviews?status=pending"));
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toBe("admin-disabled");
  });

  it("returns the pending queue with counts and a resolved spot name", async () => {
    await seedPending();
    const res = await LIST(
      new Request("http://x/api/admin/reviews?status=pending", { headers: { cookie: cookie() } }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const data = await res.json();
    expect(data.counts.pending).toBe(1);
    expect(data.reviews[0].spotName).toBe("Clover Grill");
    expect(data.reviews[0].ipHash).toBe("abcd1234ef");
  });
});

describe("POST /api/admin/reviews (moderation)", () => {
  it("approves a pending review", async () => {
    const id = await seedPending();
    const res = await MODERATE(
      new Request("http://x/api/admin/reviews", {
        method: "POST",
        headers: { cookie: cookie(), "content-type": "application/json" },
        body: JSON.stringify({ id, action: "approve" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await listByStatus(holder.db!, "approved")).toHaveLength(1);
    expect(await listByStatus(holder.db!, "pending")).toHaveLength(0);
  });

  it("rejects (retracts) a review", async () => {
    const id = await seedPending();
    const res = await MODERATE(
      new Request("http://x/api/admin/reviews", {
        method: "POST",
        headers: { cookie: cookie(), "content-type": "application/json" },
        body: JSON.stringify({ id, action: "reject" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await listByStatus(holder.db!, "rejected")).toHaveLength(1);
  });

  it("401s without a cookie, 400 on a bad action, 404 when missing", async () => {
    const id = await seedPending();
    const noAuth = await MODERATE(
      new Request("http://x/api/admin/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action: "approve" }),
      }),
    );
    expect(noAuth.status).toBe(401);

    const bad = await MODERATE(
      new Request("http://x/api/admin/reviews", {
        method: "POST",
        headers: { cookie: cookie(), "content-type": "application/json" },
        body: JSON.stringify({ id, action: "explode" }),
      }),
    );
    expect(bad.status).toBe(400);

    const missing = await MODERATE(
      new Request("http://x/api/admin/reviews", {
        method: "POST",
        headers: { cookie: cookie(), "content-type": "application/json" },
        body: JSON.stringify({ id: "00000000-0000-0000-0000-000000000000", action: "approve" }),
      }),
    );
    expect(missing.status).toBe(404);
  });
});

describe("GET /api/admin/system", () => {
  it("401s without a cookie", async () => {
    const res = await SYSTEM(new Request("http://x/api/admin/system"));
    expect(res.status).toBe(401);
  });

  it("returns config status + moderation counts for the System tab", async () => {
    const id = await seedPending();
    await insertScan(holder.db!, "clover-grill");
    const res = await SYSTEM(
      new Request("http://x/api/admin/system", { headers: { cookie: cookie() } }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { system } = await res.json();
    expect(system.db).toBe("connected");
    expect(system.reviews).toEqual({ pending: 1, approved: 0, rejected: 0 });
    expect(system.scans.total).toBe(1);
    expect(system.spots).toBeGreaterThan(400);
    expect(typeof system.siteUrl).toBe("string");
    expect(typeof system.hasRealDomain).toBe("boolean");
    // Never a secret in sight.
    expect(JSON.stringify(system)).not.toContain(SECRET);
    void id;
  });

  it("degrades to db:error with zeroed counts instead of 500ing when the DB throws", async () => {
    // A configured-but-broken database (Neon outage, bad URL): queries reject.
    holder.db = {
      select: () => {
        throw new Error("connection refused");
      },
      execute: () => Promise.reject(new Error("connection refused")),
    } as unknown as Db;

    const res = await SYSTEM(
      new Request("http://x/api/admin/system", { headers: { cookie: cookie() } }),
    );
    expect(res.status).toBe(200);
    const { system } = await res.json();
    expect(system.db).toBe("error");
    expect(system.reviews).toEqual({ pending: 0, approved: 0, rejected: 0 });
    expect(system.scans).toEqual({ total: 0, last7: 0 });
  });
});

describe("GET /api/admin/reports (grouped)", () => {
  async function seedReports() {
    await insertReport(holder.db!, { spotId: "clover-grill", reason: "closed", detail: "Padlocked.", ipHash: "a" });
    await insertReport(holder.db!, { spotId: "clover-grill", reason: "no-restroom", detail: null, ipHash: "b" });
    await insertReport(holder.db!, { spotId: "erin-rose", reason: "wrong-hours", detail: null, ipHash: "c" });
  }

  it("401s without a cookie", async () => {
    expect((await REPORTS(new Request("http://x/api/admin/reports"))).status).toBe(401);
  });

  it("groups open reports by spot with counts, reasons, and resolved names", async () => {
    await seedReports();
    const res = await REPORTS(new Request("http://x/api/admin/reports", { headers: { cookie: cookie() } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { groups } = await res.json();
    expect(groups).toHaveLength(2);
    const clover = groups.find((g: { spotId: string }) => g.spotId === "clover-grill");
    expect(clover.count).toBe(2);
    expect(clover.spotName).toBe("Clover Grill");
    expect(clover.reasons).toEqual({ closed: 1, "no-restroom": 1 });
  });
});

describe("POST /api/admin/reports (actions)", () => {
  function actionReq(body: unknown, withCookie = true): Request {
    return new Request("http://x/api/admin/reports", {
      method: "POST",
      headers: { "content-type": "application/json", ...(withCookie ? { cookie: cookie() } : {}) },
      body: JSON.stringify(body),
    });
  }

  it("resolves every open report for a spot", async () => {
    await insertReport(holder.db!, { spotId: "clover-grill", reason: "closed", detail: null, ipHash: "a" });
    await insertReport(holder.db!, { spotId: "clover-grill", reason: "other", detail: null, ipHash: "b" });
    const res = await REPORTS_ACTION(actionReq({ action: "resolve", spotId: "clover-grill" }));
    expect(res.status).toBe(200);
    expect((await res.json()).touched).toBe(2);
    expect(await listReportsByStatus(holder.db!, "open")).toHaveLength(0);
    expect(await listReportsByStatus(holder.db!, "resolved")).toHaveLength(2);
  });

  it("sets and clears a warn override", async () => {
    const set = await REPORTS_ACTION(
      actionReq({ action: "override", spotId: "clover-grill", kind: "warn", note: "  verifying  " }),
    );
    expect(set.status).toBe(200);
    expect(await listOverrides(holder.db!)).toEqual([
      { spotId: "clover-grill", kind: "warn", note: "verifying" },
    ]);

    const clear = await REPORTS_ACTION(actionReq({ action: "clear-override", spotId: "clover-grill" }));
    expect(clear.status).toBe(200);
    expect(await listOverrides(holder.db!)).toHaveLength(0);
  });

  it("401s without a cookie, 400 on unknown spot / bad action / bad kind", async () => {
    expect((await REPORTS_ACTION(actionReq({ action: "resolve", spotId: "clover-grill" }, false))).status).toBe(401);
    expect((await REPORTS_ACTION(actionReq({ action: "resolve", spotId: "nope" }))).status).toBe(400);
    expect((await REPORTS_ACTION(actionReq({ action: "explode", spotId: "clover-grill" }))).status).toBe(400);
    expect(
      (await REPORTS_ACTION(actionReq({ action: "override", spotId: "clover-grill", kind: "boom" }))).status,
    ).toBe(400);
  });
});

describe("/api/admin/suggestions", () => {
  async function seedSuggestion(): Promise<void> {
    await insertSuggestion(holder.db!, {
      name: "Bywater Bakery",
      lat: 29.9635,
      lng: -90.0503,
      category: "customers",
      tip: "Grab a slice, use the restroom.",
      hoursText: "7am–3pm",
      nickname: "Becky",
      ipHash: "seed",
    });
  }

  function actionReq(body: unknown, withCookie = true): Request {
    return new Request("http://x/api/admin/suggestions", {
      method: "POST",
      headers: { "content-type": "application/json", ...(withCookie ? { cookie: cookie() } : {}) },
      body: JSON.stringify(body),
    });
  }

  it("401s without a cookie", async () => {
    expect((await SUGGESTIONS(new Request("http://x/api/admin/suggestions"))).status).toBe(401);
  });

  it("lists new suggestions with a count", async () => {
    await seedSuggestion();
    const res = await SUGGESTIONS(
      new Request("http://x/api/admin/suggestions", { headers: { cookie: cookie() } }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const data = await res.json();
    expect(data.counts.new).toBe(1);
    expect(data.suggestions[0].name).toBe("Bywater Bakery");
  });

  it("accepts a suggestion (status → accepted)", async () => {
    await seedSuggestion();
    const [s] = await listSuggestionsByStatus(holder.db!, "new");
    const res = await SUGGESTIONS_ACTION(actionReq({ id: s.id, action: "accept" }));
    expect(res.status).toBe(200);
    expect(await listSuggestionsByStatus(holder.db!, "new")).toHaveLength(0);
    expect(await listSuggestionsByStatus(holder.db!, "accepted")).toHaveLength(1);
  });

  it("401s without a cookie; 400 on bad action; 404 on a missing id", async () => {
    await seedSuggestion();
    const [s] = await listSuggestionsByStatus(holder.db!, "new");
    expect((await SUGGESTIONS_ACTION(actionReq({ id: s.id, action: "accept" }, false))).status).toBe(401);
    expect((await SUGGESTIONS_ACTION(actionReq({ id: s.id, action: "explode" }))).status).toBe(400);
    expect((await SUGGESTIONS_ACTION(actionReq({ id: 999999, action: "accept" }))).status).toBe(404);
  });
});

describe("GET /api/admin/scans", () => {
  it("401s without a cookie", async () => {
    const res = await SCANS(new Request("http://x/api/admin/scans"));
    expect(res.status).toBe(401);
  });

  it("returns per-spot scan counts with resolved names", async () => {
    await insertScan(holder.db!, "clover-grill");
    await insertScan(holder.db!, "clover-grill");
    const res = await SCANS(new Request("http://x/api/admin/scans", { headers: { cookie: cookie() } }));
    expect(res.status).toBe(200);
    const data = await res.json();
    const clover = data.scans.find((s: { slug: string }) => s.slug === "clover-grill");
    expect(clover.total).toBe(2);
    expect(clover.spotName).toBe("Clover Grill");
  });
});
