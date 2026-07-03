import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/lib/db/__tests__/testdb";
import { scanStats } from "@/lib/db/queries";
import type { Db } from "@/lib/db";

const holder = vi.hoisted(() => ({ db: null as Db | null }));
vi.mock("@/lib/db", () => ({
  getDb: () => holder.db,
  resolveDb: async () => holder.db,
  isDbConfigured: () => holder.db !== null,
}));

const { GET } = await import("../route");

function scanReq(id: string): Request {
  return new Request(`http://localhost/s/${id}`);
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(async () => {
  holder.db = await createTestDb();
});

describe("GET /s/[id]", () => {
  it("logs a scan for a known spot and 302s to its permalink", async () => {
    const res = await GET(scanReq("clover-grill"), ctx("clover-grill"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/spot/clover-grill");

    const stats = await scanStats(holder.db!);
    expect(stats.find((s) => s.slug === "clover-grill")?.total).toBe(1);
  });

  it("redirects unknown ids without logging a scan", async () => {
    const res = await GET(scanReq("not-a-spot"), ctx("not-a-spot"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/spot/not-a-spot");
    expect(await scanStats(holder.db!)).toHaveLength(0);
  });

  it("still redirects when no database is configured", async () => {
    holder.db = null;
    const res = await GET(scanReq("clover-grill"), ctx("clover-grill"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/spot/clover-grill");
  });
});
