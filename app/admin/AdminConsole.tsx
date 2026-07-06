"use client";

import { useCallback, useEffect, useState } from "react";
import { Droplets } from "@/components/reviews/Droplets";
import { displayName, relativeTime } from "@/lib/reviews/format";
import { formatSuggestionEntry } from "@/lib/suggestions";

// Phone-first moderation console. It probes /api/admin/reviews on mount and
// switches between login, disabled, and the queue based on the response. Auth is
// entirely cookie-based (httpOnly), so this component never sees the secret
// after login.

type Tab = "pending" | "approved" | "reports" | "suggestions" | "scans" | "system";
type Screen = "checking" | "disabled" | "no-db" | "unauthed" | "ready" | "error";

interface AdminReview {
  id: string;
  spotId: string;
  spotName: string;
  rating: number;
  body: string;
  nickname: string | null;
  status: string;
  ipHash: string;
  createdAt: string;
}

interface Counts {
  pending: number;
  approved: number;
}

interface ScanRow {
  slug: string;
  spotName: string;
  total: number;
  last7: number;
}

interface SystemData {
  db: "connected" | "unconfigured" | "error";
  ipSaltConfigured: boolean;
  siteUrl: string;
  hasRealDomain: boolean;
  spots: number;
  commit: string;
  reviews: { pending: number; approved: number; rejected: number };
  scans: { total: number; last7: number };
  reportsOpen: number;
  suggestionsNew: number;
}

interface AdminSuggestion {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: "public" | "customers" | "lobby";
  tip: string;
  hoursText: string | null;
  nickname: string | null;
  status: string;
  createdAt: string;
}

interface AdminReportRow {
  id: number;
  reason: string;
  detail: string | null;
  ipHash: string;
  createdAt: string;
}

interface ReportGroup {
  spotId: string;
  spotName: string;
  count: number;
  reasons: Record<string, number>;
  reports: AdminReportRow[];
  override: { spotId: string; kind: "hide" | "warn"; note: string | null } | null;
}

const REASON_LABELS: Record<string, string> = {
  closed: "Closed / gone",
  "wrong-hours": "Wrong hours",
  "no-restroom": "No restroom",
  other: "Something else",
};

const TAB_ENDPOINTS: Record<Tab, string> = {
  pending: "/api/admin/reviews?status=pending",
  approved: "/api/admin/reviews?status=approved",
  reports: "/api/admin/reports",
  suggestions: "/api/admin/suggestions",
  scans: "/api/admin/scans",
  system: "/api/admin/system",
};

export default function AdminConsole() {
  const [screen, setScreen] = useState<Screen>("checking");
  const [tab, setTab] = useState<Tab>("pending");
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [system, setSystem] = useState<SystemData | null>(null);
  const [reportGroups, setReportGroups] = useState<ReportGroup[]>([]);
  const [reportsOpen, setReportsOpen] = useState(0);
  const [suggestions, setSuggestions] = useState<AdminSuggestion[]>([]);
  const [suggestionsNew, setSuggestionsNew] = useState(0);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0 });
  const [busyId, setBusyId] = useState<string | null>(null);

  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const url = TAB_ENDPOINTS[tab];
      const res = await fetch(url, { cache: "no-store" });
      if (!active) return;
      if (res.status === 401) {
        setScreen("unauthed");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!active) return;
      if (res.status === 503) {
        setScreen(data.reason === "admin-disabled" ? "disabled" : "no-db");
        return;
      }
      if (!res.ok || data.ok !== true) {
        setScreen("error");
        return;
      }
      if (tab === "scans") {
        setScans(data.scans);
      } else if (tab === "system") {
        setSystem(data.system);
        setReportsOpen(data.system.reportsOpen);
        setSuggestionsNew(data.system.suggestionsNew);
      } else if (tab === "reports") {
        const groups: ReportGroup[] = data.groups ?? [];
        setReportGroups(groups);
        setReportsOpen(groups.reduce((n, g) => n + g.count, 0));
      } else if (tab === "suggestions") {
        setSuggestions(data.suggestions ?? []);
        setSuggestionsNew(data.counts?.new ?? 0);
      } else {
        setReviews(data.reviews);
        setCounts(data.counts);
      }
      setScreen("ready");
    })();
    return () => {
      active = false;
    };
  }, [tab, nonce]);

  const moderate = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    setCounts((c) => adjustCounts(c, tab, action));
    try {
      await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
    } finally {
      setBusyId(null);
    }
  };

  const reportAction = async (spotId: string, payload: Record<string, unknown>) => {
    setBusyId(spotId);
    try {
      await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spotId, ...payload }),
      });
      reload();
    } finally {
      setBusyId(null);
    }
  };

  if (screen === "checking") {
    return <Center>Checking the door…</Center>;
  }
  if (screen === "disabled") {
    return (
      <Center>
        <p className="font-display text-lg font-bold text-ink-100">Admin is switched off</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          Set an <code className="rounded bg-night-700 px-1">ADMIN_SECRET</code> environment
          variable to unlock moderation.
        </p>
      </Center>
    );
  }
  if (screen === "no-db") {
    return (
      <Center>
        <p className="font-display text-lg font-bold text-ink-100">Reviews aren&apos;t configured</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          There&apos;s no <code className="rounded bg-night-700 px-1">DATABASE_URL</code> yet, so
          there&apos;s nothing to moderate.
        </p>
      </Center>
    );
  }
  if (screen === "error") {
    return (
      <Center>
        <p className="text-sm text-ink-300">Something went sideways.</p>
        <button
          type="button"
          onClick={reload}
          className="mt-2 rounded-full border border-gold-600 px-4 py-1.5 text-sm font-medium text-gold-300"
        >
          Retry
        </button>
      </Center>
    );
  }
  if (screen === "unauthed") {
    return <LoginScreen onSuccess={reload} />;
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-16 pt-5">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl font-black italic">
          Moderation <span className="text-gold-400">⚜</span>
        </h1>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            setScreen("unauthed");
          }}
          className="rounded-full border border-night-600 px-3 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-shut/50 hover:text-shut"
        >
          Log out
        </button>
      </header>

      <div className="mt-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabButton active={tab === "pending"} onClick={() => setTab("pending")}>
          Pending {counts.pending > 0 ? <Badge>{counts.pending}</Badge> : null}
        </TabButton>
        <TabButton active={tab === "approved"} onClick={() => setTab("approved")}>
          Approved <Badge muted>{counts.approved}</Badge>
        </TabButton>
        <TabButton active={tab === "reports"} onClick={() => setTab("reports")}>
          Reports {reportsOpen > 0 ? <Badge>{reportsOpen}</Badge> : null}
        </TabButton>
        <TabButton active={tab === "suggestions"} onClick={() => setTab("suggestions")}>
          Suggestions {suggestionsNew > 0 ? <Badge>{suggestionsNew}</Badge> : null}
        </TabButton>
        <TabButton active={tab === "scans"} onClick={() => setTab("scans")}>
          Scans
        </TabButton>
        <TabButton active={tab === "system"} onClick={() => setTab("system")}>
          System
        </TabButton>
      </div>

      <div className="mt-4 space-y-3">
        {tab === "system" ? (
          <SystemPanel system={system} />
        ) : tab === "reports" ? (
          <ReportsPanel groups={reportGroups} busyId={busyId} onAction={reportAction} />
        ) : tab === "suggestions" ? (
          <SuggestionsPanel
            suggestions={suggestions}
            onActed={() => setSuggestionsNew((n) => Math.max(0, n - 1))}
          />
        ) : tab === "scans" ? (
          <ScansTable scans={scans} />
        ) : reviews.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-500">
            {tab === "pending" ? "Inbox zero. The queue is clear. 🧼" : "Nothing approved yet."}
          </p>
        ) : (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              tab={tab}
              busy={busyId === review.id}
              onModerate={moderate}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ScansTable({ scans }: { scans: ScanRow[] }) {
  if (scans.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-ink-500">
        No scans yet. Print some stickers. <span aria-hidden="true">🏷️</span>
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-night-600">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-night-700 text-left text-[11px] uppercase tracking-wider text-ink-500">
            <th className="px-3 py-2 font-medium">Spot</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
            <th className="px-3 py-2 text-right font-medium">7 days</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((s) => (
            <tr key={s.slug} className="border-b border-night-800 last:border-0">
              <td className="px-3 py-2 text-ink-100">{s.spotName}</td>
              <td className="px-3 py-2 text-right font-mono text-ink-300">{s.total}</td>
              <td className="px-3 py-2 text-right font-mono text-gold-300">{s.last7}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ReportsPanelProps {
  groups: ReportGroup[];
  busyId: string | null;
  onAction: (spotId: string, payload: Record<string, unknown>) => void;
}

function ReportsPanel({ groups, busyId, onAction }: ReportsPanelProps) {
  if (groups.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-ink-500">
        No open reports. The map&apos;s holding up. <span aria-hidden="true">🚽</span>
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <ReportGroupCard
          key={group.spotId}
          group={group}
          busy={busyId === group.spotId}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

function OverrideTag({ kind }: { kind: "hide" | "warn" }) {
  return kind === "hide" ? (
    <span className="shrink-0 rounded-full bg-shut/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-shut">
      Hidden
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-soon/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-soon">
      Warned
    </span>
  );
}

function ReportGroupCard({
  group,
  busy,
  onAction,
}: {
  group: ReportGroup;
  busy: boolean;
  onAction: (spotId: string, payload: Record<string, unknown>) => void;
}) {
  const setWarn = () => {
    const note = window.prompt("Warn note shown to visitors (≤140 chars):", group.override?.note ?? "");
    if (note === null) return;
    onAction(group.spotId, { action: "override", kind: "warn", note: note.slice(0, 140) });
  };

  return (
    <article
      className={`rounded-2xl border border-night-600 bg-night-900 p-3.5 transition-opacity ${
        busy ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-ink-100">{group.spotName}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {group.override ? <OverrideTag kind={group.override.kind} /> : null}
          {group.count > 0 ? (
            <span className="rounded-full bg-shut/15 px-2 py-0.5 text-[11px] font-bold text-shut">
              {group.count} open
            </span>
          ) : null}
        </div>
      </div>

      {group.count > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(group.reasons).map(([reason, n]) => (
            <span
              key={reason}
              className="rounded-full border border-night-600 px-2 py-0.5 text-[11px] text-ink-300"
            >
              {REASON_LABELS[reason] ?? reason} {n > 1 ? `·${n}` : ""}
            </span>
          ))}
        </div>
      ) : null}

      {group.reports.some((r) => r.detail) ? (
        <ul className="mt-2 space-y-1">
          {group.reports
            .filter((r) => r.detail)
            .map((r) => (
              <li key={r.id} className="rounded-lg bg-night-800 px-2.5 py-1.5 text-xs text-ink-300">
                <span className="text-ink-100">“{r.detail}”</span>
                <span className="ml-1.5 text-ink-500">· {relativeTime(r.createdAt)}</span>
              </li>
            ))}
        </ul>
      ) : null}

      {group.count > 0 ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(group.spotId, { action: "resolve" })}
            className="flex-1 rounded-xl bg-open/90 py-2 text-sm font-bold text-night-950 transition-colors hover:bg-open disabled:opacity-50"
          >
            ✓ Resolve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(group.spotId, { action: "dismiss" })}
            className="flex-1 rounded-xl border border-night-600 py-2 text-sm font-medium text-ink-300 transition-colors hover:border-night-400 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-night-800 pt-2">
        <span className="text-[11px] text-ink-500">Live override:</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(group.spotId, { action: "override", kind: "hide" })}
          className="rounded-full border border-shut/40 px-2.5 py-0.5 text-[11px] font-medium text-shut transition-colors hover:bg-shut/10 disabled:opacity-50"
        >
          Hide
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={setWarn}
          className="rounded-full border border-soon/40 px-2.5 py-0.5 text-[11px] font-medium text-soon transition-colors hover:bg-soon/10 disabled:opacity-50"
        >
          Warn…
        </button>
        {group.override ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(group.spotId, { action: "clear-override" })}
            className="rounded-full border border-night-600 px-2.5 py-0.5 text-[11px] font-medium text-ink-300 transition-colors hover:border-night-400 disabled:opacity-50"
          >
            Clear
          </button>
        ) : null}
      </div>
    </article>
  );
}

const CATEGORY_LABELS: Record<AdminSuggestion["category"], string> = {
  public: "Free & public",
  customers: "Buy something",
  lobby: "Hotel lobby",
};

function SuggestionsPanel({
  suggestions,
  onActed,
}: {
  suggestions: AdminSuggestion[];
  onActed: () => void;
}) {
  if (suggestions.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-ink-500">
        No new suggestions yet. <span aria-hidden="true">🗺️</span>
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {suggestions.map((s) => (
        <SuggestionCard key={s.id} suggestion={s} onActed={onActed} />
      ))}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onActed,
}: {
  suggestion: AdminSuggestion;
  onActed: () => void;
}) {
  const [phase, setPhase] = useState<"new" | "busy" | "accepted" | "rejected">("new");
  const [copied, setCopied] = useState(false);

  const act = async (action: "accept" | "reject") => {
    setPhase("busy");
    try {
      const res = await fetch("/api/admin/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: suggestion.id, action }),
      });
      if (res.ok) {
        setPhase(action === "accept" ? "accepted" : "rejected");
        onActed();
      } else {
        setPhase("new");
      }
    } catch {
      setPhase("new");
    }
  };

  if (phase === "rejected") return null;

  const entry = formatSuggestionEntry({
    name: suggestion.name,
    lat: suggestion.lat,
    lng: suggestion.lng,
    category: suggestion.category,
    tip: suggestion.tip,
    hoursText: suggestion.hoursText,
  });
  const mapLink = `https://www.google.com/maps?q=${suggestion.lat},${suggestion.lng}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — the block is still selectable by hand.
    }
  };

  return (
    <article className={`rounded-2xl border border-night-600 bg-night-900 p-3.5 ${phase === "busy" ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-ink-100">{suggestion.name}</span>
        <span className="shrink-0 rounded-full border border-night-600 px-2 py-0.5 text-[11px] text-ink-300">
          {CATEGORY_LABELS[suggestion.category]}
        </span>
      </div>

      {suggestion.tip ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-snug text-ink-300">
          {suggestion.tip}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-500">
        <a
          href={mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-gold-300 underline-offset-2 hover:underline"
        >
          {suggestion.lat.toFixed(5)}, {suggestion.lng.toFixed(5)} ↗
        </a>
        {suggestion.hoursText ? (
          <>
            <span aria-hidden="true">·</span>
            <span>hours: {suggestion.hoursText}</span>
          </>
        ) : null}
        <span aria-hidden="true">·</span>
        <span>{displayName(suggestion.nickname, String(suggestion.id))}</span>
        <span aria-hidden="true">·</span>
        <span>{relativeTime(suggestion.createdAt)}</span>
      </div>

      {phase === "accepted" ? (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-open">
              Accepted — copy into lib/spots/
            </p>
            <button
              type="button"
              onClick={copy}
              className="rounded-full border border-gold-600 px-2.5 py-0.5 text-[11px] font-medium text-gold-300 transition-colors hover:bg-gold-400/10"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="mt-1.5 overflow-x-auto rounded-lg bg-night-950 p-3 text-[11px] leading-relaxed text-ink-200">
            <code>{entry}</code>
          </pre>
          <p className="mt-1 text-[11px] text-ink-500">
            Verify + geocode the TODOs before it goes live.
          </p>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={phase === "busy"}
            onClick={() => act("accept")}
            className="flex-1 rounded-xl bg-open/90 py-2 text-sm font-bold text-night-950 transition-colors hover:bg-open disabled:opacity-50"
          >
            ✓ Accept
          </button>
          <button
            type="button"
            disabled={phase === "busy"}
            onClick={() => act("reject")}
            className="flex-1 rounded-xl border border-shut/50 py-2 text-sm font-bold text-shut transition-colors hover:bg-shut/10 disabled:opacity-50"
          >
            ✕ Reject
          </button>
        </div>
      )}
    </article>
  );
}

const DB_LABELS: Record<SystemData["db"], { label: string; color: string }> = {
  connected: { label: "Connected", color: "text-open" },
  unconfigured: { label: "Not configured", color: "text-soon" },
  error: { label: "Error", color: "text-shut" },
};

function SystemPanel({ system }: { system: SystemData | null }) {
  if (!system) {
    return <p className="py-16 text-center text-sm text-ink-500">Reading the gauges…</p>;
  }
  const db = DB_LABELS[system.db];
  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-night-600 bg-night-900 p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Config</h2>
        <dl className="mt-2 space-y-2 text-sm">
          <ConfigRow label="Database">
            <span className={`font-medium ${db.color}`}>● {db.label}</span>
          </ConfigRow>
          <ConfigRow label="Moderation">
            <span className="font-medium text-open">● On</span>
          </ConfigRow>
          <ConfigRow label="IP salt">
            {system.ipSaltConfigured ? (
              <span className="font-medium text-open">Set</span>
            ) : (
              <span className="font-medium text-soon">Missing — rate limits are weak</span>
            )}
          </ConfigRow>
          <ConfigRow label="Site URL">
            <span className="truncate font-mono text-xs text-ink-300">{system.siteUrl}</span>
          </ConfigRow>
          <ConfigRow label="Domain">
            {system.hasRealDomain ? (
              <span className="font-medium text-open">Live</span>
            ) : (
              <span className="font-medium text-soon">Placeholder — print no stickers yet</span>
            )}
          </ConfigRow>
          <ConfigRow label="Commit">
            <span className="font-mono text-xs text-ink-300">{system.commit}</span>
          </ConfigRow>
          <ConfigRow label="Spots">
            <span className="font-mono text-ink-300">{system.spots}</span>
          </ConfigRow>
          <ConfigRow label="Open reports">
            <span
              className={`font-mono ${system.reportsOpen > 0 ? "text-shut" : "text-ink-300"}`}
            >
              {system.reportsOpen}
            </span>
          </ConfigRow>
          <ConfigRow label="New suggestions">
            <span
              className={`font-mono ${system.suggestionsNew > 0 ? "text-gold-300" : "text-ink-300"}`}
            >
              {system.suggestionsNew}
            </span>
          </ConfigRow>
        </dl>
      </section>

      <section className="rounded-2xl border border-night-600 bg-night-900 p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Reviews</h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="Pending" value={system.reviews.pending} accent="text-gold-300" />
          <Stat label="Approved" value={system.reviews.approved} accent="text-open" />
          <Stat label="Rejected" value={system.reviews.rejected} accent="text-ink-400" />
        </div>
      </section>

      <section className="rounded-2xl border border-night-600 bg-night-900 p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Scans</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="All time" value={system.scans.total} accent="text-ink-200" />
          <Stat label="Last 7 days" value={system.scans.last7} accent="text-gold-300" />
        </div>
      </section>
    </div>
  );
}

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl bg-night-800 px-3 py-2.5 text-center">
      <div className={`font-mono text-xl font-bold ${accent}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-ink-500">{label}</div>
    </div>
  );
}

function adjustCounts(counts: Counts, tab: Tab, action: "approve" | "reject"): Counts {
  if (tab === "pending") {
    return {
      pending: Math.max(0, counts.pending - 1),
      approved: action === "approve" ? counts.approved + 1 : counts.approved,
    };
  }
  // Retracting an approved review.
  return { ...counts, approved: Math.max(0, counts.approved - 1) };
}

interface ReviewCardProps {
  review: AdminReview;
  tab: Tab;
  busy: boolean;
  onModerate: (id: string, action: "approve" | "reject") => void;
}

function ReviewCard({ review, tab, busy, onModerate }: ReviewCardProps) {
  return (
    <article
      className={`rounded-2xl border border-night-600 bg-night-900 p-3.5 transition-opacity ${
        busy ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-ink-100">{review.spotName}</span>
        <Droplets value={review.rating} size="sm" />
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-snug text-ink-100">
        {review.body}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-500">
        <span className="font-medium text-ink-300">{displayName(review.nickname, review.id)}</span>
        <span aria-hidden="true">·</span>
        <span>{relativeTime(review.createdAt)}</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono" title="Hashed IP prefix">
          {review.ipHash.slice(0, 8)}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        {tab === "pending" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onModerate(review.id, "approve")}
            className="flex-1 rounded-xl bg-open/90 py-2.5 text-sm font-bold text-night-950 transition-colors hover:bg-open disabled:opacity-50"
          >
            ✓ Approve
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => onModerate(review.id, "reject")}
          className={`rounded-xl border border-shut/50 py-2.5 text-sm font-bold text-shut transition-colors hover:bg-shut/10 disabled:opacity-50 ${
            tab === "pending" ? "flex-1" : "w-full"
          }`}
        >
          {tab === "pending" ? "✕ Reject" : "Retract"}
        </button>
      </div>
    </article>
  );
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Login failed.");
      }
    } catch {
      setError("Network hiccup — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Center>
      <form onSubmit={submit} className="w-full max-w-xs">
        <p className="font-display text-lg font-bold text-ink-100">Moderator door</p>
        <p className="mt-1 text-sm text-ink-500">Enter the admin secret to moderate reviews.</p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="admin secret"
          autoComplete="current-password"
          className="mt-4 w-full rounded-xl border border-night-600 bg-night-800 px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-600 focus:outline-none"
        />
        {error ? <p className="mt-2 text-xs font-medium text-shut">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || secret.length === 0}
          className="mt-3 w-full rounded-xl bg-gold-400 py-2.5 text-sm font-bold text-night-950 transition-colors hover:bg-gold-300 disabled:opacity-50"
        >
          {busy ? "…" : "Enter"}
        </button>
      </form>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center text-ink-300">
      {children}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-gold-400 text-night-950"
          : "border border-night-600 text-ink-300 hover:border-gold-600"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={`inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
        muted ? "bg-night-700 text-ink-300" : "bg-night-950/30 text-night-950"
      }`}
    >
      {children}
    </span>
  );
}
