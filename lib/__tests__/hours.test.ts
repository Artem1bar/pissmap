import { describe, expect, it } from "vitest";
import {
  CLOSING_SOON_MIN,
  dayHoursLabel,
  formatClock,
  isOpen,
  nolaTime,
  openState,
  statusLabel,
} from "../hours";
import type { LocalTime, WeekHours } from "../types";

const at = (day: number, hour: number, minute = 0): LocalTime => ({
  day,
  minutes: hour * 60 + minute,
});

// Mon–Sat 9:00–18:00, closed Sunday.
const SHOP: WeekHours = [
  [],
  [{ open: 540, close: 1080 }],
  [{ open: 540, close: 1080 }],
  [{ open: 540, close: 1080 }],
  [{ open: 540, close: 1080 }],
  [{ open: 540, close: 1080 }],
  [{ open: 540, close: 1080 }],
];

// Daily 10:00–04:00 (wraps past midnight), Molly's-style.
const LATE_BAR: WeekHours = Array.from({ length: 7 }, () => [{ open: 600, close: 1680 }]);

const NEVER: WeekHours = [[], [], [], [], [], [], []];

describe("nolaTime", () => {
  it("converts a UTC instant to New Orleans wall clock during CDT (UTC-5)", () => {
    // 2026-07-01T05:00:00Z = midnight Wed Jul 1 in New Orleans.
    expect(nolaTime(new Date("2026-07-01T05:00:00Z"))).toEqual({ day: 3, minutes: 0 });
  });

  it("converts during CST (UTC-6)", () => {
    // 2026-01-15T06:00:00Z = midnight Thu Jan 15 in New Orleans.
    expect(nolaTime(new Date("2026-01-15T06:00:00Z"))).toEqual({ day: 4, minutes: 0 });
  });

  it("handles an evening instant crossing no midnight", () => {
    // 2026-07-04T23:30:00Z = 18:30 Sat Jul 4 in New Orleans.
    expect(nolaTime(new Date("2026-07-04T23:30:00Z"))).toEqual({ day: 6, minutes: 1110 });
  });
});

describe("openState", () => {
  it("treats 24/7 as always open", () => {
    expect(openState("24/7", at(0, 3))).toEqual({ kind: "always" });
    expect(isOpen("24/7", at(0, 3))).toBe(true);
  });

  it("is open inside a plain range and reports closing time", () => {
    const state = openState(SHOP, at(3, 12));
    expect(state).toEqual({ kind: "open", closesAtMin: 1080, closesInMin: 360 });
  });

  it("is closed at the exact closing minute", () => {
    const state = openState(SHOP, at(3, 18));
    expect(state.kind).toBe("closed");
    if (state.kind === "closed") {
      expect(state.opensDay).toBe(4);
      expect(state.opensAtMin).toBe(540);
      expect(state.opensInMin).toBe((24 - 18) * 60 + 540);
    }
  });

  it("is open at the exact opening minute", () => {
    expect(isOpen(SHOP, at(1, 9))).toBe(true);
  });

  it("reports the next opening across a closed day", () => {
    // Saturday 20:00 → closed; Sunday closed; opens Monday 9:00.
    const state = openState(SHOP, at(6, 20));
    expect(state.kind).toBe("closed");
    if (state.kind === "closed") {
      expect(state.opensDay).toBe(1);
      expect(state.opensInMin).toBe(4 * 60 + 24 * 60 + 540);
    }
  });

  it("stays open past midnight via yesterday's wrapped range", () => {
    // Tuesday 2:00 — open thanks to Monday's 10:00–04:00.
    const state = openState(LATE_BAR, at(2, 2));
    expect(state).toEqual({ kind: "open", closesAtMin: 240, closesInMin: 120 });
  });

  it("closes at the wrapped closing minute", () => {
    const state = openState(LATE_BAR, at(2, 4));
    expect(state.kind).toBe("closed");
    if (state.kind === "closed") {
      expect(state.opensAtMin).toBe(600);
      expect(state.opensInMin).toBe(360);
      expect(state.opensDay).toBe(2);
    }
  });

  it("returns unknown when there are no hours at all", () => {
    expect(openState(NEVER, at(0, 12))).toEqual({ kind: "unknown" });
  });

  it("merges yesterday's wrap-tail with today's overlapping range", () => {
    // Wed 22:00–01:00 (wraps), Thu 00:30–10:00: continuously open Thu 00:15 → 10:00.
    const chained: WeekHours = [
      [],
      [],
      [],
      [{ open: 1320, close: 1500 }],
      [{ open: 30, close: 600 }],
      [],
      [],
    ];
    // Inside the tail only — but the window chains into Thursday's own range.
    expect(openState(chained, at(4, 0, 15))).toEqual({
      kind: "open",
      closesAtMin: 600,
      closesInMin: 585,
    });
    // Inside both at once — later close wins.
    expect(openState(chained, at(4, 0, 45))).toEqual({
      kind: "open",
      closesAtMin: 600,
      closesInMin: 555,
    });
    // After the tail expired, today's own range still counts.
    expect(openState(chained, at(4, 1, 30))).toEqual({
      kind: "open",
      closesAtMin: 600,
      closesInMin: 510,
    });
  });

  it("chains a range ending at midnight into tomorrow's midnight opener", () => {
    // Fri 10:00–24:00 + Sat 00:00–02:00 = open until 2 AM.
    const acrossMidnight: WeekHours = [
      [],
      [],
      [],
      [],
      [],
      [{ open: 600, close: 1440 }],
      [{ open: 0, close: 120 }],
    ];
    expect(openState(acrossMidnight, at(5, 23))).toEqual({
      kind: "open",
      closesAtMin: 120,
      closesInMin: 180,
    });
  });

  it("ignores malformed zero-length ranges", () => {
    const degenerate: WeekHours = [[], [{ open: 600, close: 600 }], [], [], [], [], []];
    expect(openState(degenerate, at(1, 10))).toEqual({ kind: "unknown" });
  });
});

describe("formatClock", () => {
  it("formats 12-hour clock strings", () => {
    expect(formatClock(0)).toBe("12 AM");
    expect(formatClock(540)).toBe("9 AM");
    expect(formatClock(570)).toBe("9:30 AM");
    expect(formatClock(720)).toBe("12 PM");
    expect(formatClock(1439)).toBe("11:59 PM");
  });

  it("normalizes past-midnight minutes", () => {
    expect(formatClock(1680)).toBe("4 AM");
  });
});

describe("statusLabel", () => {
  it("labels the four states", () => {
    expect(statusLabel({ kind: "always" }, at(1, 12))).toBe("Open 24 hours");
    expect(statusLabel(openState(SHOP, at(1, 12)), at(1, 12))).toBe("Open until 6 PM");
    expect(statusLabel(openState(SHOP, at(1, 8)), at(1, 8))).toBe("Closed · opens 9 AM");
    expect(statusLabel(openState(SHOP, at(6, 20)), at(6, 20))).toBe("Closed · opens Mon 9 AM");
    expect(statusLabel({ kind: "unknown" }, at(1, 12))).toBe("Hours unknown");
  });

  it("flips to 'closes soon' at the threshold", () => {
    const soon = at(1, 17, 60 - CLOSING_SOON_MIN); // exactly 45 min before 6 PM
    expect(statusLabel(openState(SHOP, soon), soon)).toBe("Closes soon · 6 PM");
    const notYet = at(1, 17, 14); // 46 minutes before close
    expect(statusLabel(openState(SHOP, notYet), notYet)).toBe("Open until 6 PM");
  });
});

describe("dayHoursLabel", () => {
  it("renders per-day rows", () => {
    expect(dayHoursLabel("24/7", 2)).toBe("Open 24 hours");
    expect(dayHoursLabel(SHOP, 0)).toBe("Closed");
    expect(dayHoursLabel(SHOP, 1)).toBe("9 AM – 6 PM");
    expect(dayHoursLabel(LATE_BAR, 5)).toBe("10 AM – 4 AM");
  });
});
