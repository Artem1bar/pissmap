import { guardAdmin } from "@/lib/admin/guard";
import { resolveDb } from "@/lib/db";
import {
  countSuggestionsByStatus,
  listSuggestionsByStatus,
  setSuggestionStatus,
} from "@/lib/db/queries";
import type { SuggestionStatus } from "@/lib/db/schema";
import { jsonResponse } from "@/lib/reviews/http";

// The Suggestions tab data + accept/reject actions. Accepting only marks status;
// the copy-ready dataset entry is rendered client-side from the suggestion data
// (formatSuggestionEntry). Runtime never edits dataset code. Admin-guarded, never
// cached.
export const dynamic = "force-dynamic";

const NO_STORE = "no-store";
const STATUSES: SuggestionStatus[] = ["new", "accepted", "rejected"];

function noDb(): Response {
  return jsonResponse({ ok: false, reason: "reviews-not-configured" }, { status: 503, cache: NO_STORE });
}

export async function GET(request: Request): Promise<Response> {
  const denied = guardAdmin(request);
  if (denied) return denied;

  const db = await resolveDb();
  if (!db) return noDb();

  const requested = new URL(request.url).searchParams.get("status") as SuggestionStatus | null;
  const status = requested && STATUSES.includes(requested) ? requested : "new";

  const [suggestions, newCount] = await Promise.all([
    listSuggestionsByStatus(db, status),
    countSuggestionsByStatus(db, "new"),
  ]);
  return jsonResponse({ ok: true, suggestions, counts: { new: newCount } }, { cache: NO_STORE });
}

const ACTIONS: Record<string, SuggestionStatus> = { accept: "accepted", reject: "rejected" };

export async function POST(request: Request): Promise<Response> {
  const denied = guardAdmin(request);
  if (denied) return denied;

  const db = await resolveDb();
  if (!db) return noDb();

  let id = 0;
  let action = "";
  try {
    const body = await request.json();
    id = typeof body?.id === "number" ? body.id : 0;
    action = typeof body?.action === "string" ? body.action : "";
  } catch {
    return jsonResponse({ ok: false, error: "Malformed request." }, { status: 400, cache: NO_STORE });
  }

  const next = ACTIONS[action];
  if (!id || !next) {
    return jsonResponse({ ok: false, error: "Bad action." }, { status: 400, cache: NO_STORE });
  }

  const changed = await setSuggestionStatus(db, id, next);
  if (!changed) {
    return jsonResponse({ ok: false, error: "Suggestion not found." }, { status: 404, cache: NO_STORE });
  }
  return jsonResponse({ ok: true, status: next }, { cache: NO_STORE });
}
