import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../schema";
import type { Db } from "../index";

// A throwaway in-memory Postgres (PGlite, WASM) with the real generated
// migrations applied. Every query test runs against actual SQL — check
// constraints, indexes, FILTER windows and all — not a mock. The Db cast is the
// one place production and dev drivers meet; both share the query-builder surface
// the app uses, so it's sound at runtime.

export async function createTestDb(): Promise<Db> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  return db as unknown as Db;
}
