"use client";

import { useEffect, useState } from "react";
import type { PublicReview } from "@/lib/reviews/types";

const POLL_MS = 60_000;

/**
 * Polls the recent-approved feed every 60s for the ticker. Returns an empty
 * array on any failure (including 503 "not configured"), so the ticker simply
 * renders nothing rather than erroring.
 */
export function useRecentReviews(): PublicReview[] {
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch("/api/reviews/recent", { signal: controller.signal });
        if (!res.ok) {
          if (active) setReviews([]);
          return;
        }
        const data = await res.json();
        if (active) setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      } catch {
        // Aborted or offline — leave the ticker empty.
      }
    };

    void load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  return reviews;
}
