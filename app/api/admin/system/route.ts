import { guardAdmin } from "@/lib/admin/guard";
import { resolveDb } from "@/lib/db";
import {
  countReportsByStatus,
  countSuggestionsByStatus,
  reviewCountsByStatus,
  scanTotals,
  type ScanTotals,
} from "@/lib/db/queries";
import type { ReviewStatus } from "@/lib/db/schema";
import { dbStatus } from "@/lib/db/status";
import { jsonResponse } from "@/lib/reviews/http";
import { hasRealDomain, siteUrl } from "@/lib/site";
import { SPOTS } from "@/lib/spots";

// The admin System tab's data source: config status + moderation counts at a
// glance, so Artem can confirm from his phone that the deploy is wired up.
// Admin-guarded and never cached.
export const dynamic = "force-dynamic";

const NO_STORE = "no-store";

export async function GET(request: Request): Promise<Response> {
  const denied = guardAdmin(request);
  if (denied) return denied;

  // Counts are best-effort: a DB that's absent OR throwing must never 500 this
  // route — it's the one screen that exists to report DB health. On any failure
  // the counts stay zero and dbStatus() below independently reports "error".
  let reviews: Record<ReviewStatus, number> = { pending: 0, approved: 0, rejected: 0 };
  let scans: ScanTotals = { total: 0, last7: 0 };
  let reportsOpen = 0;
  let suggestionsNew = 0;
  try {
    const db = await resolveDb();
    if (db) {
      [reviews, scans, reportsOpen, suggestionsNew] = await Promise.all([
        reviewCountsByStatus(db),
        scanTotals(db),
        countReportsByStatus(db, "open"),
        countSuggestionsByStatus(db, "new"),
      ]);
    }
  } catch {
    // Swallowed on purpose; the db field below surfaces the error state.
  }

  return jsonResponse(
    {
      ok: true,
      system: {
        db: await dbStatus(),
        // Whether the IP-hash salt is set — NOT the salt itself. An unset salt
        // leaves per-IP rate limits hashing with an empty salt (weak); surfacing
        // it here lets Artem catch a missing IP_SALT before real traffic.
        ipSaltConfigured: Boolean(process.env.IP_SALT),
        siteUrl: siteUrl(),
        hasRealDomain: hasRealDomain(),
        spots: SPOTS.length,
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
        reviews,
        scans,
        reportsOpen,
        suggestionsNew,
      },
    },
    { cache: NO_STORE },
  );
}
