import { clientIp, hashIp } from "@/lib/antispam";
import { resolveDb } from "@/lib/db";
import { countRecentReportsByIp, insertReport } from "@/lib/db/queries";
import { exceedsReportRateLimit, validateReport, type RawReportInput } from "@/lib/reports/validate";
import { jsonResponse, notConfigured } from "@/lib/reviews/http";

// POST /api/reports — "this spot is wrong" from a visitor. Same anti-spam stack
// as reviews but a stricter per-IP cap. Lands as `open` for a moderator to
// resolve/dismiss in /admin. 503s honestly with no database.
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

  const input: RawReportInput =
    typeof raw === "object" && raw !== null ? (raw as RawReportInput) : {};
  const result = validateReport(input);

  // Honeypot: pretend it worked, store nothing.
  if (result.kind === "honeypot") return jsonResponse({ ok: true });
  if (result.kind === "invalid") {
    return jsonResponse({ ok: false, error: result.error }, { status: result.status });
  }

  const ipHash = hashIp(
    clientIp(request.headers.get("x-forwarded-for")),
    process.env.IP_SALT ?? "",
  );

  const counts = await countRecentReportsByIp(db, ipHash);
  if (exceedsReportRateLimit(counts)) {
    return jsonResponse(
      { ok: false, error: "Thanks — that's plenty of reports from you today." },
      { status: 429 },
    );
  }

  await insertReport(db, { ...result.value, ipHash });
  return jsonResponse({ ok: true });
}
