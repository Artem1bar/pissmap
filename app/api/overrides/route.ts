import { resolveDb } from "@/lib/db";
import { listOverrides } from "@/lib/db/queries";
import { jsonResponse } from "@/lib/reviews/http";

// GET /api/overrides — the runtime patch layer the client fetches once on load.
// Deliberately soft: no database, or any error, returns an empty list so the
// static map can never be taken down by this endpoint. CDN-cached for 5 minutes.
export const dynamic = "force-dynamic";

const OVERRIDES_CACHE = "s-maxage=300, stale-while-revalidate=600";

export async function GET(): Promise<Response> {
  try {
    const db = await resolveDb();
    const overrides = db ? await listOverrides(db) : [];
    return jsonResponse({ ok: true, overrides }, { cache: OVERRIDES_CACHE });
  } catch {
    return jsonResponse({ ok: true, overrides: [] }, { cache: OVERRIDES_CACHE });
  }
}
