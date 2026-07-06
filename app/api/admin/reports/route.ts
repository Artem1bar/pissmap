import { guardAdmin } from "@/lib/admin/guard";
import { resolveDb } from "@/lib/db";
import {
  deleteOverride,
  listOverrides,
  listReportsByStatus,
  setOpenReportsStatus,
  upsertOverride,
  type AdminReport,
} from "@/lib/db/queries";
import type { OverrideKind } from "@/lib/db/schema";
import { jsonResponse } from "@/lib/reviews/http";
import { getSpotById, isKnownSpotId } from "@/lib/spots";
import type { SpotOverride } from "@/lib/overrides";

// The Reports tab data + actions. Open reports are grouped by spot (newest spot
// first) with a per-spot count and reason breakdown; a moderator resolves or
// dismisses them and sets/clears the live override that hides or flags the spot.
// Admin-guarded, never cached.
export const dynamic = "force-dynamic";

const NO_STORE = "no-store";
const OVERRIDE_NOTE_MAX = 140;

interface ReportGroup {
  spotId: string;
  spotName: string;
  count: number;
  reasons: Record<string, number>;
  reports: AdminReport[];
  override: SpotOverride | null;
}

function noDb(): Response {
  return jsonResponse({ ok: false, reason: "reviews-not-configured" }, { status: 503, cache: NO_STORE });
}

/** Group open reports by spot (preserving newest-first order), then fold in any
 *  override-only spots so a moderator can still clear a warn/hide with no reports. */
function groupReports(open: AdminReport[], overrides: SpotOverride[]): ReportGroup[] {
  const overrideBySpot = new Map(overrides.map((o) => [o.spotId, o]));
  const groups = new Map<string, ReportGroup>();

  for (const report of open) {
    const group =
      groups.get(report.spotId) ??
      {
        spotId: report.spotId,
        spotName: getSpotById(report.spotId)?.name ?? report.spotId,
        count: 0,
        reasons: {},
        reports: [],
        override: overrideBySpot.get(report.spotId) ?? null,
      };
    group.count += 1;
    group.reasons[report.reason] = (group.reasons[report.reason] ?? 0) + 1;
    group.reports.push(report);
    groups.set(report.spotId, group);
  }

  // Spots with an active override but no open reports still need a card to clear it.
  for (const override of overrides) {
    if (!groups.has(override.spotId)) {
      groups.set(override.spotId, {
        spotId: override.spotId,
        spotName: getSpotById(override.spotId)?.name ?? override.spotId,
        count: 0,
        reasons: {},
        reports: [],
        override,
      });
    }
  }

  return [...groups.values()];
}

export async function GET(request: Request): Promise<Response> {
  const denied = guardAdmin(request);
  if (denied) return denied;

  const db = await resolveDb();
  if (!db) return noDb();

  const [open, overrides] = await Promise.all([listReportsByStatus(db, "open"), listOverrides(db)]);
  return jsonResponse({ ok: true, groups: groupReports(open, overrides) }, { cache: NO_STORE });
}

function badRequest(error: string): Response {
  return jsonResponse({ ok: false, error }, { status: 400, cache: NO_STORE });
}

function isOverrideKind(value: unknown): value is OverrideKind {
  return value === "hide" || value === "warn";
}

export async function POST(request: Request): Promise<Response> {
  const denied = guardAdmin(request);
  if (denied) return denied;

  const db = await resolveDb();
  if (!db) return noDb();

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return badRequest("Malformed request.");
  }

  const action = typeof body.action === "string" ? body.action : "";
  const spotId = typeof body.spotId === "string" ? body.spotId : "";
  if (!spotId || !isKnownSpotId(spotId)) return badRequest("Unknown spot.");

  switch (action) {
    case "resolve":
    case "dismiss": {
      const touched = await setOpenReportsStatus(db, spotId, action === "resolve" ? "resolved" : "dismissed");
      return jsonResponse({ ok: true, touched }, { cache: NO_STORE });
    }
    case "override": {
      if (!isOverrideKind(body.kind)) return badRequest("Override kind must be hide or warn.");
      let note: string | null = null;
      if (body.kind === "warn") {
        const raw = typeof body.note === "string" ? body.note.trim() : "";
        if (raw.length > OVERRIDE_NOTE_MAX) return badRequest(`Note is too long (max ${OVERRIDE_NOTE_MAX}).`);
        note = raw.length > 0 ? raw : null;
      }
      await upsertOverride(db, spotId, body.kind, note);
      return jsonResponse({ ok: true, override: { spotId, kind: body.kind, note } }, { cache: NO_STORE });
    }
    case "clear-override": {
      await deleteOverride(db, spotId);
      return jsonResponse({ ok: true }, { cache: NO_STORE });
    }
    default:
      return badRequest("Bad action.");
  }
}
