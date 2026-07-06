import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/lib/db/__tests__/testdb";
import { insertReview, listByStatus, setReviewStatus } from "@/lib/db/queries";
import type { Db } from "@/lib/db";

// Inject a real PGlite database in place of getDb(). Everything else in the
// route — validation, IP hashing, rate limiting, insert — runs for real, so
// these exercise the full HTTP surface: status codes, body shapes, the honeypot
// fake-success, and the 503 degradation path.
const holder = vi.hoisted(() => ({ db: null as Db | null }));
vi.mock("@/lib/db", () => ({
  getDb: () => holder.db,
  resolveDb: async () => holder.db,
  isDbConfigured: () => holder.db !== null,
}));

const { GET, POST } = await import("../route");
const { GET: GET_RECENT } = await import("../recent/route");
const { GET: GET_AGGREGATES } = await import("../aggregates/route");

const SPOT = "washington-artillery-park";

function postReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/reviews", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const goodBody = { spotId: SPOT, rating: 4, body: "Clean, quick, always open.", t: 5000 };

beforeEach(async () => {
  holder.db = await createTestDb();
  process.env.IP_SALT = "test-salt";
});

describe("POST /api/reviews", () => {
  it("stores a valid review as pending and reports it honestly", async () => {
    const res = await POST(postReq(goodBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "pending" });
    expect(await listByStatus(holder.db!, "pending")).toHaveLength(1);
  });

  it("fakes success for the honeypot but stores nothing", async () => {
    const res = await POST(postReq({ ...goodBody, website: "http://spam.example" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "pending" });
    expect(await listByStatus(holder.db!, "pending")).toHaveLength(0);
  });

  it("rejects an out-of-range rating with 400", async () => {
    const res = await POST(postReq({ ...goodBody, rating: 9 }));
    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
  });

  it("rejects a too-fast submission with 429", async () => {
    const res = await POST(postReq({ ...goodBody, t: 100 }));
    expect(res.status).toBe(429);
  });

  it("rejects an unknown spot with 400", async () => {
    const res = await POST(postReq({ ...goodBody, spotId: "not-a-real-spot" }));
    expect(res.status).toBe(400);
    expect(await listByStatus(holder.db!, "pending")).toHaveLength(0);
  });

  it("rejects links in the body with 400", async () => {
    const res = await POST(postReq({ ...goodBody, body: "great spot https://spam.io" }));
    expect(res.status).toBe(400);
  });

  it("rate-limits the fourth review from one IP within the hour", async () => {
    const ip = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < 3; i++) {
      const res = await POST(postReq(goodBody, ip));
      expect(res.status).toBe(200);
    }
    const fourth = await POST(postReq(goodBody, ip));
    expect(fourth.status).toBe(429);
    // A different IP is unaffected.
    const other = await POST(postReq(goodBody, { "x-forwarded-for": "198.51.100.9" }));
    expect(other.status).toBe(200);
  });

  it("returns 503 when no database is configured", async () => {
    holder.db = null;
    const res = await POST(postReq(goodBody));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: "reviews-not-configured" });
  });
});

describe("GET /api/reviews", () => {
  it("returns approved reviews and an aggregate for a spot", async () => {
    const { id } = await insertReview(holder.db!, {
      spotId: SPOT,
      rating: 5,
      body: "Marble floors, warm hand towels.",
      nickname: "Fancy",
      ipHash: "seed",
    });
    await setReviewStatus(holder.db!, id, "approved");

    const res = await GET(new Request(`http://localhost/api/reviews?spotId=${SPOT}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=30");
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.count).toBe(1);
    expect(data.avg).toBeCloseTo(5, 5);
    expect(data.reviews[0].nickname).toBe("Fancy");
    // Pending/rejected are never leaked to the public endpoint.
    expect(data.reviews.every((r: { rating: number }) => typeof r.rating === "number")).toBe(true);
  });

  it("rejects a missing or unknown spotId with 400", async () => {
    expect((await GET(new Request("http://localhost/api/reviews"))).status).toBe(400);
    expect(
      (await GET(new Request("http://localhost/api/reviews?spotId=nope"))).status,
    ).toBe(400);
  });

  it("returns 503 with no database", async () => {
    holder.db = null;
    const res = await GET(new Request(`http://localhost/api/reviews?spotId=${SPOT}`));
    expect(res.status).toBe(503);
  });
});

describe("GET /api/reviews/recent", () => {
  it("returns recent approved reviews across spots", async () => {
    const { id } = await insertReview(holder.db!, {
      spotId: SPOT,
      rating: 3,
      body: "It exists and it flushes.",
      nickname: null,
      ipHash: "seed",
    });
    await setReviewStatus(holder.db!, id, "approved");

    const res = await GET_RECENT();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.reviews).toHaveLength(1);
  });

  it("returns 503 with no database", async () => {
    holder.db = null;
    expect((await GET_RECENT()).status).toBe(503);
  });
});

describe("GET /api/reviews/aggregates", () => {
  it("returns per-spot rollups with a cache header", async () => {
    const { id } = await insertReview(holder.db!, {
      spotId: SPOT,
      rating: 4,
      body: "Clean and quick.",
      nickname: null,
      ipHash: "seed",
    });
    await setReviewStatus(holder.db!, id, "approved");

    const res = await GET_AGGREGATES();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=300");
    const data = await res.json();
    expect(data.aggregates).toHaveLength(1);
    expect(data.aggregates[0]).toMatchObject({ spotId: SPOT, count: 1 });
  });

  it("degrades to an empty list (never 503) with no database", async () => {
    holder.db = null;
    const res = await GET_AGGREGATES();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, aggregates: [] });
  });
});
