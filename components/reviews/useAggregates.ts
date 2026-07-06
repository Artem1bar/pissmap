"use client";

import { useEffect, useState } from "react";
import type { RatingIndex, SpotRating } from "@/lib/listSort";

// Fetches every spot's droplet rollup once, for list-row badges and the
// Top/Recent sorts. Fails soft to an empty index — the map never waits on it.

const EMPTY: RatingIndex = new Map();

interface RawAggregate {
  spotId: string;
  avg: number;
  count: number;
  lastAt: string;
}

export function useAggregates(): RatingIndex {
  const [index, setIndex] = useState<RatingIndex>(EMPTY);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/reviews/aggregates", { signal: controller.signal });
        if (!active || !res.ok) return;
        const data = await res.json();
        if (!active) return;
        const list: RawAggregate[] = Array.isArray(data.aggregates) ? data.aggregates : [];
        const map = new Map<string, SpotRating>(
          list.map((a) => [a.spotId, { avg: a.avg, count: a.count, lastAt: a.lastAt }]),
        );
        setIndex(map);
      } catch {
        // Soft — an empty index just means no badges/sorts data.
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return index;
}
