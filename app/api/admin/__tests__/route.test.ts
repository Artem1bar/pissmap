import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE, adminToken } from "@/lib/admin/auth";
import { createTestDb } from "@/lib/db/__tests__/testdb";
import { insertReview, insertScan, listByStatus } from "@/lib/db/queries";
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
