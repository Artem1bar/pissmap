import type { DayRange, WeekHours } from "../types";

/** Minutes since midnight: T(9, 30) → 570. */
export const T = (hour: number, minute = 0): number => hour * 60 + minute;

export const R = (open: number, close: number): DayRange => ({ open, close });

export const daily = (open: number, close: number): WeekHours => {
  const day = [R(open, close)];
  return [day, day, day, day, day, day, day];
};

/** Sunday-first week; null = closed that day. */
export const week = (...days: (readonly DayRange[] | null)[]): WeekHours =>
  days.map((d) => d ?? []);

/** Hours were not credibly established — the UI shows "Hours unknown". */
export const UNKNOWN_HOURS: WeekHours = [[], [], [], [], [], [], []];
