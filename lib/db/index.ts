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

/** The Drizzle client, or null when no DATABASE_URL is configured. */
export function getDb(): Db | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  cached ??= drizzle(neon(url), { schema });
  return cached;
}

/** Cheap check for callers that only need to know whether reviews are live. */
export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
