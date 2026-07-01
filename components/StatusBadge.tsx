import { openState, statusLabel } from "@/lib/hours";
import type { LocalTime, WeekHours } from "@/lib/types";

interface StatusBadgeProps {
  hours: WeekHours;
  now: LocalTime | null;
}

const DOT: Record<string, string> = {
  always: "bg-gold-400",
  open: "bg-open",
  soon: "bg-soon",
  closed: "bg-shut",
  unknown: "bg-night-400",
};

const TEXT: Record<string, string> = {
  always: "text-gold-300",
  open: "text-open",
  soon: "text-soon",
  closed: "text-shut",
  unknown: "text-ink-500",
};

/** Compact colored status line, e.g. "● Open until 6 PM". */
export default function StatusBadge({ hours, now }: StatusBadgeProps) {
  if (now === null) {
    return <span className="text-xs text-ink-500">…</span>;
  }
  const state = openState(hours, now);
  const tone =
    state.kind === "open" && state.closesInMin <= 45
      ? "soon"
      : state.kind === "open"
        ? "open"
        : state.kind;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TEXT[tone]}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]}`} aria-hidden="true" />
      {statusLabel(state, now)}
    </span>
  );
}
