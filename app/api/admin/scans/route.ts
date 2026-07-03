import { guardAdmin } from "@/lib/admin/guard";
import { resolveDb } from "@/lib/db";
import { scanStats } from "@/lib/db/queries";
import { jsonResponse } from "@/lib/reviews/http";
import { getSpotById } from "@/lib/spots";

export const dynamic = "force-dynamic";

/** GET /api/admin/scans — QR/short-link hit counts per spot (total + last 7 days). */
export async function GET(request: Request): Promise<Response> {
  const denied = guardAdmin(request);
  if (denied) return denied;

  const db = await resolveDb();
  if (!db) {
    return jsonResponse(
      { ok: false, reason: "reviews-not-configured" },
      { status: 503, cache: "no-store" },
    );
  }

  const stats = await scanStats(db);
  const scans = stats.map((s) => ({ ...s, spotName: getSpotById(s.slug)?.name ?? s.slug }));
  return jsonResponse({ ok: true, scans }, { cache: "no-store" });
}
