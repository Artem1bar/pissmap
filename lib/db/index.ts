import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// The single seam between "we have a database" and "we don't". Everything
// community-flavored (reviews, scans, admin) funnels through getDb(): when
// DATABASE_URL is absent — local dev before Neon is provisioned, or a fork —
// it returns null and the callers degrade to a friendly "coming soon". The
// read-only map never imports this file, so it can never be taken down by it.

export type Db = NeonHttpDatabase<typeof schema>;

let cached: Db | null = null;

/** The production (Neon) Drizzle client, or null when no DATABASE_URL is set. */
export function getDb(): Db | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  cached ??= drizzle(neon(url), { schema });
  return cached;
}

/** True only in a `next dev` process explicitly opting into the local PGlite store. */
function localDevDbEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.PISSMAP_LOCAL_DB === "1";
}

/**
 * The database every route handler and server component should use: the Neon
 * client in production, or — for local dogfooding — an in-memory PGlite store.
 * Returns null when neither is configured, which is the app's "reviews coming
 * soon" state. The dev branch is dead-code-eliminated from the production build
 * (guarded by NODE_ENV), so PGlite never ships.
 */
export async function resolveDb(): Promise<Db | null> {
  const direct = getDb();
  if (direct) return direct;
  if (localDevDbEnabled()) {
    const { getDevDb } = await import("./dev");
    return getDevDb();
  }
  return null;
}

/** Cheap, synchronous check for callers that only need to know whether reviews are live. */
export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL) || localDevDbEnabled();
}
