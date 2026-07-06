import { afterEach, describe, expect, it, vi } from "vitest";
import { SPOTS } from "@/lib/spots";

// The DB probe is mocked so the payload shape is asserted in isolation;
// dbStatus itself has its own unit test.
const holder = vi.hoisted(() => ({ status: "unconfigured" as string }));
vi.mock("@/lib/db/status", () => ({
  dbStatus: async () => holder.status,
}));

const { GET } = await import("../route");

afterEach(() => {
  delete process.env.ADMIN_SECRET;
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  holder.status = "unconfigured";
});

describe("GET /api/health", () => {
  it("reports an honest, secret-free snapshot", async () => {
    holder.status = "unconfigured";
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const data = await res.json();
    expect(data).toMatchObject({
      ok: true,
      db: "unconfigured",
      adminConfigured: false,
      spots: SPOTS.length,
      commit: "dev",
    });
    expect(typeof data.siteUrl).toBe("string");
    // Never leak the secret itself.
    expect(JSON.stringify(data)).not.toContain("ADMIN_SECRET");
  });

  it("reflects a connected DB, a configured admin, and the build commit", async () => {
    holder.status = "connected";
    process.env.ADMIN_SECRET = "shhh";
    process.env.VERCEL_GIT_COMMIT_SHA = "abc1234def5678";
    const data = await (await GET()).json();
    expect(data.db).toBe("connected");
    expect(data.adminConfigured).toBe(true);
    expect(data.commit).toBe("abc1234");
    expect(data).not.toHaveProperty("adminSecret");
  });
});
