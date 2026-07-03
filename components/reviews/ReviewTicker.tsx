"use client";

import { useEffect, useState } from "react";
import { SPOT_BY_ID } from "@/lib/spots";
import { Droplets } from "./Droplets";
import { useRecentReviews } from "./useRecentReviews";

const ROTATE_MS = 4500;

interface ReviewTickerProps {
  onSelect: (id: string) => void;
}

/**
 * A one-line, rotating feed of the newest approved reviews across the city —
 * the app's pulse. Click one to fly to that spot. Renders nothing until there's
 * something to show, so it never clutters an empty or unconfigured app.
 */
export function ReviewTicker({ onSelect }: ReviewTickerProps) {
  const recent = useRecentReviews();
  const [index, setIndex] = useState(0);

  // Rotate through the feed. Rendering uses `index % length`, so the pointer
  // never needs an explicit reset when the feed grows or shrinks.
  useEffect(() => {
    if (recent.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % recent.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [recent.length]);

  if (recent.length === 0) return null;

  const review = recent[index % recent.length];
  const spot = SPOT_BY_ID.get(review.spotId);
  if (!spot) return null;

  return (
    <button
      type="button"
      onClick={() => onSelect(review.spotId)}
      title={review.body}
      className="flex w-full items-center gap-2 border-b border-night-700 bg-night-900 px-4 py-1.5 text-left transition-colors hover:bg-night-800 md:px-5"
    >
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-ink-500">
        Live
      </span>
      <Droplets value={review.rating} size="sm" className="shrink-0" />
      <span
        key={review.id}
        className="reveal-fade min-w-0 flex-1 truncate text-xs text-ink-300"
      >
        <span className="text-ink-100">&ldquo;{review.body}&rdquo;</span>{" "}
        <span className="text-ink-500">— {spot.name}</span>
      </span>
    </button>
  );
}
