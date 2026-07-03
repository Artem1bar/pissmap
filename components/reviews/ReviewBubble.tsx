"use client";

import { displayName, nicknameColor, relativeTime } from "@/lib/reviews/format";
import { Droplets } from "./Droplets";

export interface BubbleReview {
  id: string;
  rating: number;
  body: string;
  nickname: string | null;
  createdAt: string;
}

interface ReviewBubbleProps {
  review: BubbleReview;
  /** Optimistic, not-yet-approved bubble the reviewer just posted. */
  pending?: boolean;
}

export function ReviewBubble({ review, pending = false }: ReviewBubbleProps) {
  const name = displayName(review.nickname, review.id);
  const color = nicknameColor(review.nickname?.trim() || review.id);

  return (
    <div
      className={`rounded-xl px-3 py-2 ${
        pending
          ? "border border-dashed border-gold-600/60 bg-gold-400/[0.06]"
          : "bg-night-800"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="truncate text-xs font-bold" style={{ color }}>
          {name}
        </span>
        <Droplets value={review.rating} size="sm" />
        <span className="ml-auto shrink-0 text-[10px] font-medium text-ink-500">
          {pending ? "posting…" : relativeTime(review.createdAt)}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-snug text-ink-100">
        {review.body}
      </p>
    </div>
  );
}
