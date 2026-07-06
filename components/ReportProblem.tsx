"use client";

import { useEffect, useRef, useState } from "react";
import { REPORT_DETAIL_MAX, REPORT_REASONS, REPORT_REASON_LABELS } from "@/lib/reports/limits";

// The sensor half of the data-repair loop: a low-key "report a problem" affordance
// on every curated spot. Same honeypot + min-open-time anti-spam as the review
// composer. Renders nothing when reviews/reports aren't configured (no DB), so
// the static map degrades cleanly.

type Reason = (typeof REPORT_REASONS)[number];
type Phase = "collapsed" | "form" | "done";

interface ReportProblemProps {
  spotId: string;
  /** True when the backend is off (no DB) — the whole control hides. */
  disabled?: boolean;
}

export function ReportProblem({ spotId, disabled }: ReportProblemProps) {
  const [phase, setPhase] = useState<Phase>("collapsed");
  const [reason, setReason] = useState<Reason | null>(null);
  const [detail, setDetail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openedAt = useRef(0);

  useEffect(() => {
    if (phase === "form") openedAt.current = Date.now();
  }, [phase]);

  if (disabled) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!reason) {
      setError("Pick what's wrong.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spotId,
          reason,
          detail: detail.trim() || undefined,
          website,
          t: Date.now() - openedAt.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) {
        setError(typeof data?.error === "string" ? data.error : "Couldn't send that — try again.");
        return;
      }
      setPhase("done");
    } catch {
      setError("Network hiccup — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "done") {
    return (
      <p className="mt-3 rounded-lg border border-open/30 bg-open/10 px-3 py-2 text-xs leading-relaxed text-open">
        Thanks — flagged for a human to double-check. That&apos;s how the map stays honest. 🙏
      </p>
    );
  }

  if (phase === "collapsed") {
    return (
      <button
        type="button"
        onClick={() => setPhase("form")}
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-shut"
      >
        <span aria-hidden="true">🚩</span> Something wrong with this spot?
      </button>
    );
  }

  const remaining = REPORT_DETAIL_MAX - detail.length;

  return (
    <form onSubmit={submit} className="mt-3 rounded-xl border border-night-600 bg-night-800/60 p-3">
      <p className="text-xs font-semibold text-ink-200">What&apos;s wrong?</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REPORT_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            aria-pressed={reason === r}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              reason === r
                ? "border-shut bg-shut/15 text-shut"
                : "border-night-600 text-ink-300 hover:border-shut/50"
            }`}
          >
            {REPORT_REASON_LABELS[r]}
          </button>
        ))}
      </div>

      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value.slice(0, REPORT_DETAIL_MAX))}
        placeholder="Anything else? (optional)"
        aria-label="Report detail (optional)"
        rows={2}
        className="mt-2 w-full resize-none rounded-lg border border-night-600 bg-night-900 px-2.5 py-2 text-xs text-ink-100 placeholder:text-ink-500 focus:border-shut/60 focus:outline-none"
      />

      <div className="mt-1 flex items-center justify-between">
        <span className={`text-[10px] ${remaining < 20 ? "text-soon" : "text-ink-500"}`}>
          {remaining} left
        </span>
        {error ? <span className="text-[10px] font-medium text-shut">{error}</span> : null}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-shut/90 py-2 text-xs font-bold text-night-950 transition-colors hover:bg-shut disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send report"}
        </button>
        <button
          type="button"
          onClick={() => setPhase("collapsed")}
          className="rounded-lg border border-night-600 px-3 py-2 text-xs font-medium text-ink-400 transition-colors hover:border-night-400"
        >
          Cancel
        </button>
      </div>

      {/* Honeypot: off-screen, unfocusable, ignored by humans, catnip to bots. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>
    </form>
  );
}
