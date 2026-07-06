import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../schema";
import type { Db } from "../index";

// An in-memory Postgres (PGlite, WASM) with the real generated migrations
// applied. Every query test runs against actual SQL — check constraints,
// indexes, FILTER windows and all — not a mock. The Db cast is the one place
// production and dev drivers meet; both share the query-builder surface the
// app uses, so it's sound at runtime.
//
// The WASM instance boots once per test file (vitest isolates files into
// separate workers) and is wiped between tests — booting per test made each
// `it` pay a multi-second startup and timed the suite out on slower machines.

let shared: { client: PGlite; db: Db } | null = null;

export async function createTestDb(): Promise<Db> {
  if (shared === null) {
    const client = new PGlite();
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "./lib/db/migrations" });
    shared = { client, db: db as unknown as Db };
  } else {
    await shared.client.exec(
      "DELETE FROM reviews; DELETE FROM scans; DELETE FROM reports; DELETE FROM overrides; DELETE FROM suggestions;",
    );
  }
  return shared.db;
}
