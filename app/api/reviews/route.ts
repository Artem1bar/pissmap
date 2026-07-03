import { resolveDb } from "@/lib/db";
import {
  aggregateForSpot,
  countRecentByIp,
  insertReview,
  listApprovedForSpot,
} from "@/lib/db/queries";
import { jsonResponse, notConfigured, REVIEWS_CACHE } from "@/lib/reviews/http";
import {
  clientIp,
  exceedsRateLimit,
  hashIp,
  validateReview,
  type RawReviewInput,
} from "@/lib/reviews/validate";
import { isKnownSpotId } from "@/lib/spots";

// Read-time only: never prerender a 503 into a static asset at build time.
export const dynamic = "force-dynamic";

/** GET /api/reviews?spotId= — approved reviews (newest first, max 50) + aggregate. */
export async function GET(request: Request): Promise<Response> {
  const db = await resolveDb();
  if (!db) return notConfigured();

  const spotId = new URL(request.url).searchParams.get("spotId");
  if (!spotId || !isKnownSpotId(spotId)) {
    return jsonResponse({ ok: false, error: "Unknown spot." }, { status: 400 });
  }

  const [reviews, aggregate] = await Promise.all([
    listApprovedForSpot(db, spotId, 50),
    aggregateForSpot(db, spotId),
  ]);

  return jsonResponse(
    { ok: true, reviews, avg: aggregate.avg, count: aggregate.count },
    { cache: REVIEWS_CACHE },
  );
}

/**
 * POST /api/reviews — submit a review. It lands as `pending` and only goes
 * public after a human approves it in /admin. Every response is honest except
 * the honeypot, which fakes success so bots learn nothing.
 */
export async function POST(request: Request): Promise<Response> {
  const db = await resolveDb();
  if (!db) return notConfigured();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const input: RawReviewInput =
    typeof raw === "object" && raw !== null ? (raw as RawReviewInput) : {};
  const result = validateReview(input);

  // Honeypot: pretend it worked, store nothing.
  if (result.kind === "honeypot") {
    return jsonResponse({ ok: true, status: "pending" });
  }
  if (result.kind === "invalid") {
    return jsonResponse({ ok: false, error: result.error }, { status: result.status });
  }

  const ipHash = hashIp(
    clientIp(request.headers.get("x-forwarded-for")),
    process.env.IP_SALT ?? "",
  );

  const counts = await countRecentByIp(db, ipHash);
  if (exceedsRateLimit(counts)) {
    return jsonResponse(
      { ok: false, error: "Easy there — that's plenty of reviews for now. Come back later." },
      { status: 429 },
    );
  }

  const { status } = await insertReview(db, { ...result.value, ipHash });
  return jsonResponse({ ok: true, status });
}
