"use client";

import { useEffect, useRef, useState } from "react";
import { BODY_MAX, NICKNAME_MAX } from "@/lib/reviews/limits";
import { DropletPicker } from "./Droplets";

const NICKNAME_KEY = "pissmap.nickname.v1";

/** Read the remembered nickname once, SSR-safe. */
function initialNickname(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export interface SubmittedReview {
  rating: number;
  body: string;
  nickname: string | null;
}

interface ComposerProps {
  spotId: string;
  onSubmitted: (review: SubmittedReview) => void;
}

export function Composer({ spotId, onSubmitted }: ComposerProps) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  // Remembered across sessions and spots (no account needed).
  const [nickname, setNickname] = useState(initialNickname);
  const [website, setWebsite] = useState(""); // honeypot — real users never touch it
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When the composer mounted — the server rejects submissions faster than 3s.
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

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
    setError(null);

    const trimmed = body.trim();
    if (rating < 1) {
      setError("Pick a droplet rating first.");
      return;
    }
    if (trimmed.length === 0) {
      setError("Say something about the spot.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spotId,
          rating,
          body: trimmed,
          nickname: nickname.trim() || undefined,
          website,
          t: Date.now() - openedAt.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) {
        setError(typeof data?.error === "string" ? data.error : "Couldn't post that — try again.");
        return;
      }
      onSubmitted({ rating, body: trimmed, nickname: nickname.trim() || null });
      setBody("");
      setRating(0);
      openedAt.current = Date.now();
    } catch {
      setError("Network hiccup — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = BODY_MAX - body.length;

  return (
    <form onSubmit={submit} className="border-t border-night-700 bg-night-900 px-3 pb-3 pt-2.5">
      <div className="flex items-center justify-between gap-2">
        <DropletPicker value={rating} onChange={setRating} />
        <input
          type="text"
          value={nickname}
          onChange={(e) => persistNickname(e.target.value.slice(0, NICKNAME_MAX))}
          placeholder="nickname (optional)"
          aria-label="Nickname (optional)"
          maxLength={NICKNAME_MAX}
          autoComplete="off"
          className="w-32 rounded-lg border border-night-600 bg-night-800 px-2 py-1 text-xs text-ink-100 placeholder:text-ink-500 focus:border-gold-600 focus:outline-none"
        />
      </div>

      <div className="mt-2 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
            placeholder="How was the bathroom? Spill it…"
            aria-label="Your review"
            rows={2}
            className="w-full resize-none rounded-lg border border-night-600 bg-night-800 px-2.5 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-600 focus:outline-none"
          />
          <div className="mt-0.5 flex items-center justify-between">
            <span className={`text-[10px] ${remaining < 20 ? "text-soon" : "text-ink-500"}`}>
              {remaining} left
            </span>
            {error ? <span className="text-[10px] font-medium text-shut">{error}</span> : null}
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mb-4 shrink-0 rounded-lg bg-gold-400 px-3.5 py-2 text-sm font-bold text-night-950 transition-colors hover:bg-gold-300 disabled:opacity-60"
        >
          {submitting ? "…" : "Post"}
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
