"use client";

import { useEffect, useRef, useState } from "react";
import { SUGGESTION_NICKNAME_MAX } from "@/lib/suggestions";
import type { Spot } from "@/lib/types";
import { suggestIssueUrl } from "@/lib/userSpots";

// Graduates a visitor's private pin toward the public map. Posts to
// /api/suggestions (moderated, never auto-merged). Falls back to a prefilled
// GitHub issue when the backend is off, so the affordance always works.

const NICKNAME_KEY = "pissmap.nickname.v1";

function initialNickname(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

type Phase = "idle" | "form" | "done" | "unconfigured";

export function SuggestSpot({ spot }: { spot: Spot }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [nickname, setNickname] = useState(initialNickname);
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openedAt = useRef(0);

  useEffect(() => {
    if (phase === "form") openedAt.current = Date.now();
  }, [phase]);

  const persistNickname = (value: string) => {
    setNickname(value);
    try {
      window.localStorage.setItem(NICKNAME_KEY, value);
    } catch {
      // Non-fatal.
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: spot.name,
          lat: spot.lat,
          lng: spot.lng,
          category: spot.category,
          tip: spot.tip,
          hoursText: spot.hours === "24/7" ? "24/7" : undefined,
          nickname: nickname.trim() || undefined,
          website,
          t: Date.now() - openedAt.current,
        }),
      });
      if (res.status === 503) {
        setPhase("unconfigured");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) {
        setError(typeof data?.error === "string" ? data.error : "Couldn't submit — try again.");
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
      <p className="mt-2 rounded-lg border border-open/30 bg-open/10 px-3 py-2 text-xs leading-relaxed text-open">
        Submitted! A human verifies every spot before it joins the public map. Merci. 🙏
      </p>
    );
  }

  if (phase === "unconfigured") {
    return (
      <a
        href={suggestIssueUrl(spot)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block rounded-full border border-gold-600 px-3 py-1 text-xs font-medium text-gold-300 transition-colors hover:bg-gold-400/10"
      >
        Public submissions are brewing — suggest via GitHub ↗
      </a>
    );
  }

  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={() => setPhase("form")}
        className="mt-2 rounded-full border border-gold-600 px-3 py-1 text-xs font-medium text-gold-300 transition-colors hover:bg-gold-400/10"
      >
        Submit to the public map ↗
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2">
      <input
        type="text"
        value={nickname}
        onChange={(e) => persistNickname(e.target.value.slice(0, SUGGESTION_NICKNAME_MAX))}
        placeholder="your name/handle (optional)"
        aria-label="Nickname (optional)"
        maxLength={SUGGESTION_NICKNAME_MAX}
        autoComplete="off"
        className="w-full rounded-lg border border-night-600 bg-night-900 px-2.5 py-1.5 text-xs text-ink-100 placeholder:text-ink-500 focus:border-gold-600 focus:outline-none"
      />
      {error ? <p className="mt-1 text-[10px] font-medium text-shut">{error}</p> : null}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-gold-400 py-1.5 text-xs font-bold text-night-950 transition-colors hover:bg-gold-300 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
        <button
          type="button"
          onClick={() => setPhase("idle")}
          className="rounded-lg border border-night-600 px-3 py-1.5 text-xs font-medium text-ink-400 transition-colors hover:border-night-400"
        >
          Cancel
        </button>
      </div>

      {/* Honeypot: off-screen, unfocusable. */}
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
