import { resolveDb } from "@/lib/db";
import { aggregatesAll } from "@/lib/db/queries";
import { jsonResponse } from "@/lib/reviews/http";

// GET /api/reviews/aggregates — every spot's droplet average + count in one
// small payload, for the list-row badges and the Top/Recent sorts. Soft: no DB
// or any error returns an empty list, never blocking the map. CDN-cached 5min.
export const dynamic = "force-dynamic";

const AGGREGATES_CACHE = "s-maxage=300, stale-while-revalidate=600";

export async function GET(): Promise<Response> {
  try {
    const db = await resolveDb();
    const aggregates = db ? await aggregatesAll(db) : [];
    return jsonResponse({ ok: true, aggregates }, { cache: AGGREGATES_CACHE });
  } catch {
    return jsonResponse({ ok: true, aggregates: [] }, { cache: AGGREGATES_CACHE });
  }
}
