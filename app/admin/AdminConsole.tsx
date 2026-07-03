"use client";

import { useCallback, useEffect, useState } from "react";
import { Droplets } from "@/components/reviews/Droplets";
import { displayName, relativeTime } from "@/lib/reviews/format";

// Phone-first moderation console. It probes /api/admin/reviews on mount and
// switches between login, disabled, and the queue based on the response. Auth is
// entirely cookie-based (httpOnly), so this component never sees the secret
// after login.

type Tab = "pending" | "approved" | "scans";
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

export default function AdminConsole() {
  const [screen, setScreen] = useState<Screen>("checking");
  const [tab, setTab] = useState<Tab>("pending");
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0 });
  const [busyId, setBusyId] = useState<string | null>(null);

  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const url = tab === "scans" ? "/api/admin/scans" : `/api/admin/reviews?status=${tab}`;
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

      <div className="mt-4 flex gap-2">
        <TabButton active={tab === "pending"} onClick={() => setTab("pending")}>
          Pending {counts.pending > 0 ? <Badge>{counts.pending}</Badge> : null}
        </TabButton>
        <TabButton active={tab === "approved"} onClick={() => setTab("approved")}>
          Approved <Badge muted>{counts.approved}</Badge>
        </TabButton>
        <TabButton active={tab === "scans"} onClick={() => setTab("scans")}>
          Scans
        </TabButton>
      </div>

      <div className="mt-4 space-y-3">
        {tab === "scans" ? (
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
      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
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
