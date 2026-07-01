import type { LocalTime, WeekHours } from "./types";

export const NOLA_TZ = "America/Chicago";
export const CLOSING_SOON_MIN = 45;
export const MIN_PER_DAY = 1440;

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

let cachedFormatter: Intl.DateTimeFormat | undefined;

function tzFormatter(): Intl.DateTimeFormat {
  cachedFormatter ??= new Intl.DateTimeFormat("en-US", {
    timeZone: NOLA_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return cachedFormatter;
}

/** The current wall-clock time in New Orleans, derived from an absolute instant. */
export function nolaTime(instant: Date = new Date()): LocalTime {
  const parts = tzFormatter().formatToParts(instant);
  let day = 0;
  let hour = 0;
  let minute = 0;
  for (const part of parts) {
    if (part.type === "weekday") day = WEEKDAY_INDEX[part.value] ?? 0;
    // Some ICU versions render midnight as "24" with hour12: false.
    else if (part.type === "hour") hour = Number(part.value) % 24;
    else if (part.type === "minute") minute = Number(part.value);
  }
  return { day, minutes: hour * 60 + minute };
}

export type OpenState =
  | { kind: "always" }
  | { kind: "open"; closesAtMin: number; closesInMin: number }
  | { kind: "closed"; opensAtMin: number; opensDay: number; opensInMin: number }
  | { kind: "unknown" };

/**
 * Effective closing time of the open window containing `at`, in minutes
 * relative to today's midnight (may exceed 1440), or null when closed.
 *
 * Considers today's own ranges AND yesterday's past-midnight tail — both can
 * be active at once — then extends the window through any touching/overlapping
 * range (including one that starts right at midnight tomorrow), so a venue
 * that chains ranges reports the true final closing time.
 */
function findActiveWindowEnd(week: Exclude<WeekHours, "24/7">, at: LocalTime): number | null {
  let end: number | null = null;

  for (const range of week[at.day] ?? []) {
    if (range.close <= range.open) continue;
    if (at.minutes >= range.open && at.minutes < range.close) {
      end = Math.max(end ?? 0, range.close);
    }
  }
  const yesterday = (at.day + 6) % 7;
  for (const range of week[yesterday] ?? []) {
    if (range.close <= range.open) continue;
    if (range.close > MIN_PER_DAY && at.minutes < range.close - MIN_PER_DAY) {
      end = Math.max(end ?? 0, range.close - MIN_PER_DAY);
    }
  }
  if (end === null) return null;

  for (let pass = 0; pass < 8; pass++) {
    let extended = false;
    for (const range of week[at.day] ?? []) {
      if (range.close <= range.open) continue;
      if (range.open <= end && range.close > end) {
        end = range.close;
        extended = true;
      }
    }
    if (end >= MIN_PER_DAY) {
      for (const range of week[(at.day + 1) % 7] ?? []) {
        if (range.close <= range.open) continue;
        const open = range.open + MIN_PER_DAY;
        const close = range.close + MIN_PER_DAY;
        if (open <= end && close > end) {
          end = close;
          extended = true;
        }
      }
    }
    if (!extended) break;
  }
  return end;
}

export function openState(hours: WeekHours, at: LocalTime): OpenState {
  if (hours === "24/7") return { kind: "always" };

  const closesAt = findActiveWindowEnd(hours, at);
  if (closesAt !== null) {
    return {
      kind: "open",
      closesAtMin: closesAt % MIN_PER_DAY,
      closesInMin: closesAt - at.minutes,
    };
  }

  let best: { abs: number; day: number; openMin: number } | null = null;
  for (let offset = 0; offset <= 7; offset++) {
    const day = (at.day + offset) % 7;
    for (const range of hours[day] ?? []) {
      if (range.close <= range.open) continue;
      const abs = offset * MIN_PER_DAY + range.open;
      if (abs > at.minutes && (best === null || abs < best.abs)) {
        best = { abs, day, openMin: range.open };
      }
    }
    if (best && best.abs <= (offset + 1) * MIN_PER_DAY) break;
  }
  if (best === null) return { kind: "unknown" };
  return {
    kind: "closed",
    opensAtMin: best.openMin,
    opensDay: best.day,
    opensInMin: best.abs - at.minutes,
  };
}

export function isOpen(hours: WeekHours, at: LocalTime): boolean {
  const state = openState(hours, at);
  return state.kind === "always" || state.kind === "open";
}

/** 540 → "9 AM", 570 → "9:30 AM", 0 → "12 AM". */
export function formatClock(minutesOfDay: number): string {
  const normalized = ((minutesOfDay % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const suffix = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** Human status line, e.g. "Open until 6 PM" or "Closed · opens Tue 9 AM". */
export function statusLabel(state: OpenState, at: LocalTime): string {
  switch (state.kind) {
    case "always":
      return "Open 24 hours";
    case "open":
      return state.closesInMin <= CLOSING_SOON_MIN
        ? `Closes soon · ${formatClock(state.closesAtMin)}`
        : `Open until ${formatClock(state.closesAtMin)}`;
    case "closed":
      return state.opensDay === at.day
        ? `Closed · opens ${formatClock(state.opensAtMin)}`
        : `Closed · opens ${DAY_NAMES_SHORT[state.opensDay]} ${formatClock(state.opensAtMin)}`;
    case "unknown":
      return "Hours unknown";
  }
}

/** One day's hours for the detail table, e.g. "10 AM – 4 AM" or "Closed". */
export function dayHoursLabel(hours: WeekHours, day: number): string {
  if (hours === "24/7") return "Open 24 hours";
  const ranges = hours[day] ?? [];
  if (ranges.length === 0) return "Closed";
  return ranges
    .map((r) => `${formatClock(r.open)} – ${formatClock(r.close % MIN_PER_DAY)}`)
    .join(", ");
}
