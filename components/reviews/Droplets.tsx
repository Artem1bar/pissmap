"use client";

import { useId, useState } from "react";

// The rating currency of the app: golden droplets. A read-only row for scores,
// a big score badge for headers, and an interactive picker for the composer.

interface DropletShapeProps {
  className?: string;
  filled: boolean;
}

function DropletShape({ className, filled }: DropletShapeProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2.2C12 2.2 5 10.6 5 15.3a7 7 0 0 0 14 0C19 10.6 12 2.2 12 2.2Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.6}
        opacity={filled ? 1 : 0.4}
      />
    </svg>
  );
}

const SIZES = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-6 w-6" } as const;

interface DropletsProps {
  value: number;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Five droplets, `value` of them filled gold. Read-only. */
export function Droplets({ value, size = "sm", className }: DropletsProps) {
  const rounded = Math.round(value);
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-gold-400 ${className ?? ""}`}
      role="img"
      aria-label={`${value} out of 5 droplets`}
      title={`${value} / 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <DropletShape key={n} className={SIZES[size]} filled={n <= rounded} />
      ))}
    </span>
  );
}

interface DropletScoreProps {
  avg: number;
  count: number;
}

/** The big header score, e.g. a gold droplet + "4.2 · 37 reviews". */
export function DropletScore({ avg, count }: DropletScoreProps) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <DropletShape className="h-5 w-5 translate-y-0.5 text-gold-400" filled />
      <span className="font-display text-2xl font-bold text-ink-100">{avg.toFixed(1)}</span>
      <span className="text-xs text-ink-500">
        · {count} review{count === 1 ? "" : "s"}
      </span>
    </span>
  );
}

/** A compact inline score for the detail header, e.g. "💧 4.2 · 37". */
export function DropletScoreChip({ avg, count }: DropletScoreProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-gold-600/50 bg-gold-400/10 px-2 py-0.5 text-[11px] font-semibold text-gold-300"
      title={`${avg.toFixed(1)} of 5 from ${count} review${count === 1 ? "" : "s"}`}
    >
      <DropletShape className="h-3 w-3 text-gold-400" filled />
      {avg.toFixed(1)} · {count}
    </span>
  );
}

interface DropletPickerProps {
  value: number;
  onChange: (value: number) => void;
}

/** Tap 1–5 to set a rating; gold fills up to the choice. Keyboard-friendly radiogroup. */
export function DropletPicker({ value, onChange }: DropletPickerProps) {
  const [hover, setHover] = useState(0);
  const groupId = useId();
  const active = hover || value;

  return (
    <div
      role="radiogroup"
      aria-label="Your rating, 1 to 5 droplets"
      className="inline-flex items-center gap-1 text-gold-400"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} droplet${n === 1 ? "" : "s"}`}
          id={`${groupId}-${n}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          className="rounded p-0.5 transition-transform hover:scale-110"
        >
          <DropletShape className="h-6 w-6" filled={n <= active} />
        </button>
      ))}
    </div>
  );
}
