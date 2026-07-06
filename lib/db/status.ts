import { isDbConfigured, resolveDb } from "./index";
import { pingDb } from "./queries";

// One shared readiness check for /api/health and the admin System tab, so both
// report the database the same way.

export type DbStatus = "connected" | "unconfigured" | "error";

/**
 * connected = the DB answered a trivial query; unconfigured = no DATABASE_URL
 * (the app's "reviews coming soon" state); error = it's configured but threw.
 */
export async function dbStatus(): Promise<DbStatus> {
  if (!isDbConfigured()) return "unconfigured";
  try {
    const db = await resolveDb();
    if (!db) return "unconfigured";
    await pingDb(db);
    return "connected";
  } catch {
    return "error";
  }
}
