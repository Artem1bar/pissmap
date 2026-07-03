"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicReview } from "@/lib/reviews/types";

export type ReviewsStatus = "loading" | "unconfigured" | "error" | "ready";

export interface ReviewsData {
  status: ReviewsStatus;
  reviews: PublicReview[];
  avg: number;
  count: number;
  reload: () => void;
}

interface Snapshot {
  status: ReviewsStatus;
  reviews: PublicReview[];
  avg: number;
  count: number;
}

const EMPTY: Snapshot = { status: "loading", reviews: [], avg: 0, count: 0 };

/**
 * Fetches approved reviews + aggregate for one spot. Fails softly: a 503 means
 * reviews aren't configured (the "coming soon" state), anything else is a plain
 * error — the map never blocks on this. Pass `enabled: false` for spots that
 * can't be reviewed (a visitor's private pins) to skip the request entirely.
 */
export function useReviews(spotId: string, enabled = true): ReviewsData {
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let active = true;

    void (async () => {
      try {
        const res = await fetch(`/api/reviews?spotId=${encodeURIComponent(spotId)}`, {
          signal: controller.signal,
        });
        if (!active) return;
        if (res.status === 503) {
          setSnap({ status: "unconfigured", reviews: [], avg: 0, count: 0 });
          return;
        }
        if (!res.ok) {
          setSnap((s) => ({ ...s, status: "error" }));
          return;
        }
        const data = await res.json();
        if (!active) return;
        setSnap({
          status: "ready",
          reviews: Array.isArray(data.reviews) ? data.reviews : [],
          avg: Number(data.avg) || 0,
          count: Number(data.count) || 0,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (active) setSnap((s) => ({ ...s, status: "error" }));
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [spotId, enabled, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { ...snap, reload };
}
