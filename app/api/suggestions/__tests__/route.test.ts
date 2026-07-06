import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/lib/db/__tests__/testdb";
import { listSuggestionsByStatus } from "@/lib/db/queries";
import type { Db } from "@/lib/db";

const holder = vi.hoisted(() => ({ db: null as Db | null }));
vi.mock("@/lib/db", () => ({
  getDb: () => holder.db,
  resolveDb: async () => holder.db,
  isDbConfigured: () => holder.db !== null,
}));

const { POST } = await import("../route");

function postReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/suggestions", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const good = {
  name: "The Country Club",
  lat: 29.964,
  lng: -90.056,
  category: "customers",
  tip: "Buy a drink, use the facilities.",
  t: 5000,
};

beforeEach(async () => {
  holder.db = await createTestDb();
  process.env.IP_SALT = "test-salt";
});

describe("POST /api/suggestions", () => {
  it("stores a valid suggestion as new", async () => {
    const res = await POST(postReq(good));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const rows = await listSuggestionsByStatus(holder.db!, "new");
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("The Country Club");
    expect(rows[0].lat).toBeCloseTo(29.964, 3);
  });

  it("fakes success for the honeypot but stores nothing", async () => {
    const res = await POST(postReq({ ...good, website: "http://spam" }));
    expect(res.status).toBe(200);
    expect(await listSuggestionsByStatus(holder.db!, "new")).toHaveLength(0);
  });

  it("rejects a short name, bad category, and out-of-bounds coords", async () => {
    expect((await POST(postReq({ ...good, name: "no" }))).status).toBe(400);
    expect((await POST(postReq({ ...good, category: "club" }))).status).toBe(400);
    expect((await POST(postReq({ ...good, lat: 40.7, lng: -74 }))).status).toBe(400);
    expect(await listSuggestionsByStatus(holder.db!, "new")).toHaveLength(0);
  });

  it("caps at 3 suggestions per IP per day", async () => {
    const ip = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < 3; i++) {
      expect((await POST(postReq(good, ip))).status).toBe(200);
    }
    expect((await POST(postReq(good, ip))).status).toBe(429);
    expect((await POST(postReq(good, { "x-forwarded-for": "198.51.100.9" }))).status).toBe(200);
  });

  it("returns 503 with no database", async () => {
    holder.db = null;
    expect((await POST(postReq(good))).status).toBe(503);
  });
});
