import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./testdb";
import type { Db } from "../index";

// Drive dbStatus() by swapping the DB seam: isDbConfigured / resolveDb are
// mocked, but pingDb runs for real against PGlite (or a throwing stub), so the
// three states are exercised end to end.
const holder = vi.hoisted(() => ({
  configured: false,
  db: null as Db | null,
}));

vi.mock("../index", () => ({
  isDbConfigured: () => holder.configured,
  resolveDb: async () => holder.db,
}));

const { dbStatus } = await import("../status");

afterEach(() => {
  holder.configured = false;
  holder.db = null;
});

describe("dbStatus", () => {
  it("reports unconfigured when no database is set up", async () => {
    holder.configured = false;
    expect(await dbStatus()).toBe("unconfigured");
  });

  it("reports connected when the database answers a ping", async () => {
    holder.configured = true;
    holder.db = await createTestDb();
    expect(await dbStatus()).toBe("connected");
  });

  it("reports error when configured but the query throws", async () => {
    holder.configured = true;
    holder.db = {
      execute: () => Promise.reject(new Error("connection refused")),
    } as unknown as Db;
    expect(await dbStatus()).toBe("error");
  });
});
