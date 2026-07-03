"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DropletScore } from "./Droplets";
import { Composer, type SubmittedReview } from "./Composer";
import { ReviewBubble, type BubbleReview } from "./ReviewBubble";
import type { ReviewsData } from "./useReviews";

interface TheBowlProps {
  spotId: string;
  spotName: string;
  data: ReviewsData;
}

let pendingSeq = 0;

/**
 * "The Bowl" — a live, pump.fun-style review feed for one spot. Newest at the
 * bottom, auto-scrolled, with a pinned droplet composer. Optimistic bubbles
 * appear instantly in a pending style; the real ones show up once a human
 * approves them in /admin.
 */
export function TheBowl({ spotId, spotName, data }: TheBowlProps) {
  const [pending, setPending] = useState<BubbleReview[]>([]);
  const feedRef = useRef<HTMLDivElement | null>(null);

  // SpotDetail is keyed by spot id, so this component remounts per spot and
  // `pending` starts empty — no manual reset needed.

  // Chat order: API returns newest-first; flip so newest sits at the bottom.
  const approved = useMemo<BubbleReview[]>(
    () => [...data.reviews].reverse(),
    [data.reviews],
  );

  const bubbleCount = approved.length + pending.length;

  // Auto-scroll to the newest message whenever the feed grows.
  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [bubbleCount]);

  if (data.status === "unconfigured") {
    return (
      <BowlShell title={spotName}>
        <p className="px-3 py-6 text-center text-sm text-ink-500">
          Reviews are brewing — coming soon. <span aria-hidden="true">🫗</span>
        </p>
      </BowlShell>
    );
  }

  const onSubmitted = (review: SubmittedReview) => {
    pendingSeq += 1;
    setPending((prev) => [
      ...prev,
      {
        id: `pending-${pendingSeq}`,
        rating: review.rating,
        body: review.body,
        nickname: review.nickname,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  return (
    <BowlShell
      title={spotName}
      header={
        data.status === "ready" && data.count > 0 ? (
          <DropletScore avg={data.avg} count={data.count} />
        ) : null
      }
    >
      <div
        ref={feedRef}
        className="flex max-h-72 min-h-[8rem] flex-col gap-2 overflow-y-auto px-3 py-3"
      >
        {data.status === "loading" ? (
          <p className="m-auto text-xs text-ink-500">Pouring the feed…</p>
        ) : data.status === "error" ? (
          <div className="m-auto text-center">
            <p className="text-xs text-ink-500">Couldn&apos;t load reviews.</p>
            <button
              type="button"
              onClick={data.reload}
              className="mt-1 text-xs font-medium text-gold-300 hover:text-gold-400"
            >
              Retry
            </button>
          </div>
        ) : bubbleCount === 0 ? (
          <p className="m-auto max-w-[24ch] text-center text-sm text-ink-500">
            No reviews yet. Be the first to rate the porcelain. <span aria-hidden="true">🚽</span>
          </p>
        ) : (
          <>
            {approved.map((review) => (
              <ReviewBubble key={review.id} review={review} />
            ))}
            {pending.map((review) => (
              <ReviewBubble key={review.id} review={review} pending />
            ))}
          </>
        )}
      </div>

      {pending.length > 0 ? (
        <p className="border-t border-night-800 bg-gold-400/[0.04] px-3 py-1.5 text-[11px] leading-snug text-gold-300">
          Reviews are moderated — yours goes live after a human glances at it.
        </p>
      ) : null}

      <Composer spotId={spotId} onSubmitted={onSubmitted} />
    </BowlShell>
  );
}

interface BowlShellProps {
  title: string;
  header?: React.ReactNode;
  children: React.ReactNode;
}

function BowlShell({ title, header, children }: BowlShellProps) {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-night-600 bg-night-900">
      <div className="flex items-center justify-between gap-2 border-b border-night-700 px-3 py-2">
        <h3 className="font-display text-sm font-bold text-ink-100">
          The Bowl <span className="text-ink-500">· {title}</span>
        </h3>
        {header}
      </div>
      {children}
    </section>
  );
}
