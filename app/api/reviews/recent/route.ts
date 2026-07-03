import { resolveDb } from "@/lib/db";
import { listRecentApproved } from "@/lib/db/queries";
import { jsonResponse, notConfigured, REVIEWS_CACHE } from "@/lib/reviews/http";

// Read-time only: never bake a 503 into the build.
export const dynamic = "force-dynamic";

/** GET /api/reviews/recent — the last 30 approved reviews across all spots (the ticker feed). */
export async function GET(): Promise<Response> {
  const db = await resolveDb();
  if (!db) return notConfigured();

  const reviews = await listRecentApproved(db, 30);
  return jsonResponse({ ok: true, reviews }, { cache: REVIEWS_CACHE });
}
