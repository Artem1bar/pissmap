import { clientIp, hashIp } from "@/lib/antispam";
import { resolveDb } from "@/lib/db";
import { countRecentSuggestionsByIp, insertSuggestion } from "@/lib/db/queries";
import { jsonResponse, notConfigured } from "@/lib/reviews/http";
import {
  exceedsSuggestionRateLimit,
  validateSuggestion,
  type RawSuggestionInput,
} from "@/lib/suggestions";

// POST /api/suggestions — a visitor proposes a brand-new public spot. Same
// anti-spam stack as reviews/reports, 3/day per IP. Lands as `new` for a
// moderator; never auto-merged into the dataset. 503s honestly with no DB.
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const db = await resolveDb();
  if (!db) return notConfigured();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const input: RawSuggestionInput =
    typeof raw === "object" && raw !== null ? (raw as RawSuggestionInput) : {};
  const result = validateSuggestion(input);

  if (result.kind === "honeypot") return jsonResponse({ ok: true });
  if (result.kind === "invalid") {
    return jsonResponse({ ok: false, error: result.error }, { status: result.status });
  }

  const ipHash = hashIp(
    clientIp(request.headers.get("x-forwarded-for")),
    process.env.IP_SALT ?? "",
  );

  const counts = await countRecentSuggestionsByIp(db, ipHash);
  if (exceedsSuggestionRateLimit(counts)) {
    return jsonResponse(
      { ok: false, error: "Thanks — that's plenty of suggestions from you today." },
      { status: 429 },
    );
  }

  await insertSuggestion(db, { ...result.value, ipHash });
  return jsonResponse({ ok: true });
}
