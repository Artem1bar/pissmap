"use client";

import { useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { formatDistance, walkMinutes, walkingDirectionsUrl } from "@/lib/geo";
import { DAY_NAMES, dayHoursLabel } from "@/lib/hours";
import type { SpotOverride } from "@/lib/overrides";
import type { LocalTime, Spot } from "@/lib/types";
import { suggestIssueUrl } from "@/lib/userSpots";
import { ReportProblem } from "./ReportProblem";
import StatusBadge from "./StatusBadge";
import { DropletScoreChip } from "./reviews/Droplets";
import { TheBowl } from "./reviews/TheBowl";
import { useReviews } from "./reviews/useReviews";
import { BackIcon, CheckIcon, CopyIcon, DirectionsIcon, TrashIcon, WheelchairIcon } from "./icons";

export type OriginKind = "gps" | "map" | "remote";

export interface EmergencyInfo {
  meters: number;
  rank: number;
  openCount: number;
  originKind: OriginKind;
  hasNext: boolean;
  onNext: () => void;
}

interface SpotDetailProps {
  spot: Spot;
  now: LocalTime | null;
  meters: number | null;
  emergency: EmergencyInfo | null;
  onBack: () => void;
  /** An active `warn` override — shows an amber "verifying" banner. */
  warn?: SpotOverride | null;
  /** Present only for spots the visitor added themselves. */
  onDelete?: () => void;
}

const ORIGIN_TEXT: Record<OriginKind, string> = {
  gps: "Nearest open spot to you",
  map: "Location off — nearest to the map view",
  remote: "You're not in New Orleans (yet) — nearest to the map view",
};

function Pill({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-full border border-night-600 bg-night-800 px-2 py-0.5 text-[11px] font-medium text-ink-300"
    >
      {children}
    </span>
  );
}

export default function SpotDetail({ spot, now, meters, emergency, onBack, warn, onDelete }: SpotDetailProps) {
  const [copied, setCopied] = useState(false);
  const category = CATEGORY_META[spot.category];
  // Curated spots have reviews; a visitor's private pins don't.
  const reviews = useReviews(spot.id, !spot.userAdded);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(`${spot.name}, ${spot.address}, New Orleans, LA`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (permissions or insecure context) — nothing to do.
    }
  };

  return (
    <div className="px-4 pb-6 pt-3 md:px-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-2 flex items-center gap-1 text-xs font-medium text-ink-500 transition-colors hover:text-ink-100"
      >
        <BackIcon className="h-3.5 w-3.5" /> All spots
      </button>

      {emergency ? (
        <div role="alert" className="mb-3 rounded-xl border border-gold-600/60 bg-gold-400/10 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gold-300">
            🚨 {ORIGIN_TEXT[emergency.originKind]}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink-100">
            {formatDistance(emergency.meters)} away · ~{walkMinutes(emergency.meters)} min at a
            determined walk
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">
            #{emergency.rank} nearest of {emergency.openCount} open right now
          </p>
          {emergency.hasNext ? (
            <button
              type="button"
              onClick={emergency.onNext}
              className="mt-2 rounded-full border border-gold-600 px-3 py-1 text-xs font-medium text-gold-300 transition-colors hover:bg-gold-400/15"
            >
              Next nearest →
            </button>
          ) : null}
        </div>
      ) : null}

      {warn ? (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-soon/50 bg-soon/10 px-3 py-2 text-xs font-medium leading-relaxed text-soon"
        >
          <span aria-hidden="true">⚠️</span>{" "}
          {warn.note && warn.note.length > 0
            ? warn.note
            : "A visitor flagged this spot — double-check before you rely on it."}
        </div>
      ) : null}

      <h2 className="font-display text-2xl font-bold leading-snug">{spot.name}</h2>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
          style={{
            borderColor: `${category.color}66`,
            color: category.color,
            backgroundColor: `${category.color}1a`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: category.color }}
            aria-hidden="true"
          />
          {category.label}
        </span>
        {spot.hours === "24/7" ? <Pill>Open 24/7</Pill> : null}
        {spot.wheelchair ? (
          <Pill>
            <WheelchairIcon className="h-3 w-3" /> Accessible
          </Pill>
        ) : null}
        {spot.osmToilet ? (
          <Pill title="This restroom is mapped on OpenStreetMap (amenity=toilets)">
            🗺️ OSM-mapped
          </Pill>
        ) : null}
        {spot.userAdded ? (
          <Pill title="Stored only in this browser — not part of the shared map">
            ✦ Added by you
          </Pill>
        ) : null}
        {!spot.userAdded && reviews.status === "ready" && reviews.count > 0 ? (
          <DropletScoreChip avg={reviews.avg} count={reviews.count} />
        ) : null}
      </div>

      {spot.partner ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-gold-600 bg-gradient-to-r from-gold-400/20 to-transparent px-3 py-2">
          <span className="shrink-0 rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-night-950">
            Partner
          </span>
          <span className="text-sm font-medium text-gold-300">{spot.partner.deal}</span>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-night-800 px-3 py-2">
        <StatusBadge hours={spot.hours} now={now} />
        <span className="text-xs text-ink-500">
          Today: {now ? dayHoursLabel(spot.hours, now.day) : "…"}
        </span>
      </div>

      {meters !== null && !emergency ? (
        <p className="mt-2 text-xs text-ink-500">
          {formatDistance(meters)} from you · ~{walkMinutes(meters)} min walk
        </p>
      ) : null}

      <p className="mt-3 text-sm leading-relaxed text-ink-300">{spot.tip}</p>

      <div className="mt-3 flex items-start justify-between gap-2 text-xs text-ink-500">
        <span>
          {spot.address} · {spot.neighborhood}
        </span>
        <button
          type="button"
          onClick={copyAddress}
          aria-label="Copy address"
          className="shrink-0 rounded p-1 transition-colors hover:bg-night-700 hover:text-ink-100"
        >
          {copied ? (
            <CheckIcon className="h-3.5 w-3.5 text-open" />
          ) : (
            <CopyIcon className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <a
        href={walkingDirectionsUrl(spot)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 py-3 text-sm font-bold text-night-950 transition-colors hover:bg-gold-300"
      >
        <DirectionsIcon className="h-4 w-4" /> Walking directions
      </a>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-ink-500 transition-colors hover:text-ink-300">
          All hours
        </summary>
        <div className="mt-2 space-y-0.5 text-xs">
          {DAY_NAMES.map((name, day) => (
            <div
              key={name}
              className={`flex justify-between py-0.5 ${
                now?.day === day ? "font-semibold text-ink-100" : "text-ink-500"
              }`}
            >
              <span>{name}</span>
              <span>{dayHoursLabel(spot.hours, day)}</span>
            </div>
          ))}
        </div>
      </details>

      {spot.verify ? (
        <p className="mt-3 rounded-lg border border-soon/30 bg-soon/10 px-3 py-2 text-xs leading-relaxed text-soon">
          Hours drift in New Orleans — double-check this one before it gets critical.
        </p>
      ) : null}

      {!spot.userAdded ? (
        <>
          <TheBowl spotId={spot.id} spotName={spot.name} data={reviews} />
          <ReportProblem spotId={spot.id} disabled={reviews.status === "unconfigured"} />
        </>
      ) : null}

      {spot.userAdded ? (
        <div className="mt-3 rounded-lg border border-night-600 bg-night-800 px-3 py-2.5">
          <p className="text-xs leading-relaxed text-ink-500">
            This spot lives only in this browser. Think everyone should know about it?
          </p>
          <div className="mt-2 flex items-center gap-2">
            <a
              href={suggestIssueUrl(spot)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-gold-600 px-3 py-1 text-xs font-medium text-gold-300 transition-colors hover:bg-gold-400/10"
            >
              Suggest for the public map ↗
            </a>
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1 rounded-full border border-shut/40 px-3 py-1 text-xs font-medium text-shut transition-colors hover:bg-shut/10"
              >
                <TrashIcon className="h-3 w-3" /> Delete
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
