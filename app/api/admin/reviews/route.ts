import { isAdminEnabled, requestAuthorized } from "@/lib/admin/auth";
import { resolveDb } from "@/lib/db";
import { countByStatus, listByStatus, setReviewStatus } from "@/lib/db/queries";
import type { ReviewStatus } from "@/lib/db/schema";
import { jsonResponse } from "@/lib/reviews/http";
import { getSpotById } from "@/lib/spots";

export const dynamic = "force-dynamic";

const NO_STORE = "no-store";
const STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

/** Reject unauthorized/disabled requests; returns null when the caller may proceed. */
function guard(request: Request): Response | null {
  if (!isAdminEnabled()) {
    return jsonResponse({ ok: false, reason: "admin-disabled" }, { status: 503, cache: NO_STORE });
  }
  if (!requestAuthorized(request)) {
    return jsonResponse({ ok: false, error: "Unauthorized." }, { status: 401, cache: NO_STORE });
  }
  return null;
}

/** GET /api/admin/reviews?status=pending|approved|rejected — a moderation queue + counts. */
export async function GET(request: Request): Promise<Response> {
  const denied = guard(request);
  if (denied) return denied;

  const db = await resolveDb();
  if (!db) {
    return jsonResponse({ ok: false, reason: "reviews-not-configured" }, { status: 503, cache: NO_STORE });
  }

  const requested = new URL(request.url).searchParams.get("status") as ReviewStatus | null;
  const status = requested && STATUSES.includes(requested) ? requested : "pending";

  const [rows, pending, approved] = await Promise.all([
    listByStatus(db, status, 200),
    countByStatus(db, "pending"),
    countByStatus(db, "approved"),
  ]);

  const reviews = rows.map((r) => ({ ...r, spotName: getSpotById(r.spotId)?.name ?? r.spotId }));
  return jsonResponse({ ok: true, reviews, counts: { pending, approved } }, { cache: NO_STORE });
}

const ACTIONS: Record<string, ReviewStatus> = { approve: "approved", reject: "rejected" };

/** POST /api/admin/reviews — body { id, action: "approve" | "reject" }. */
export async function POST(request: Request): Promise<Response> {
  const denied = guard(request);
  if (denied) return denied;

  const db = await resolveDb();
  if (!db) {
    return jsonResponse({ ok: false, reason: "reviews-not-configured" }, { status: 503, cache: NO_STORE });
  }

  let id = "";
  let action = "";
  try {
    const body = await request.json();
    id = typeof body?.id === "string" ? body.id : "";
    action = typeof body?.action === "string" ? body.action : "";
  } catch {
    return jsonResponse({ ok: false, error: "Malformed request." }, { status: 400, cache: NO_STORE });
  }

  const next = ACTIONS[action];
  if (!id || !next) {
    return jsonResponse({ ok: false, error: "Bad action." }, { status: 400, cache: NO_STORE });
  }

  const changed = await setReviewStatus(db, id, next);
  if (!changed) {
    return jsonResponse({ ok: false, error: "Review not found." }, { status: 404, cache: NO_STORE });
  }
  return jsonResponse({ ok: true, status: next }, { cache: NO_STORE });
}
