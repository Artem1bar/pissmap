import { describe, expect, it } from "vitest";
import {
  applyFilters,
  DEFAULT_FILTERS,
  matchesQuery,
  rankByUrgency,
  sortByDistance,
  toggleCategory,
} from "../filters";
import type { LocalTime, Spot } from "../types";

const NOON_MONDAY: LocalTime = { day: 1, minutes: 720 };
const THREE_AM_MONDAY: LocalTime = { day: 1, minutes: 180 };

const spot = (overrides: Partial<Spot> & Pick<Spot, "id" | "lat" | "lng">): Spot => ({
  name: overrides.id,
  category: "public",
  address: "somewhere",
  neighborhood: "French Quarter",
  hours: "24/7",
  free: true,
  tip: "a tip",
  ...overrides,
});

const CASINO = spot({ id: "casino", lat: 29.95, lng: -90.065, hours: "24/7" });
const PARK = spot({
  id: "park",
  lat: 29.957,
  lng: -90.062,
  hours: Array.from({ length: 7 }, () => [{ open: 540, close: 1080 }]),
});
const CAFE = spot({
  id: "cafe",
  lat: 29.9553,
  lng: -90.0668,
  category: "customers",
  free: false,
  hours: Array.from({ length: 7 }, () => [{ open: 480, close: 1320 }]),
  name: "Café Beignet",
  tip: "beignets required",
});
const HOTEL = spot({ id: "hotel", lat: 29.954, lng: -90.0679, category: "lobby" });

const ALL = [CASINO, PARK, CAFE, HOTEL];

describe("toggleCategory", () => {
  it("adds and removes categories immutably", () => {
    const withLobby = toggleCategory(DEFAULT_FILTERS, "lobby");
    expect(withLobby.categories).toEqual(["lobby"]);
    expect(DEFAULT_FILTERS.categories).toEqual([]);
    expect(toggleCategory(withLobby, "lobby").categories).toEqual([]);
  });
});

describe("matchesQuery", () => {
  it("matches every token across name, hood, address and tip", () => {
    expect(matchesQuery(CAFE, "beignet")).toBe(true);
    expect(matchesQuery(CAFE, "café quarter")).toBe(true);
    expect(matchesQuery(CAFE, "beignet casino")).toBe(false);
    expect(matchesQuery(CAFE, "  ")).toBe(true);
  });
});

describe("applyFilters", () => {
  it("returns everything with default filters", () => {
    expect(applyFilters(ALL, DEFAULT_FILTERS, NOON_MONDAY)).toHaveLength(4);
  });

  it("filters by category", () => {
    const filtered = applyFilters(ALL, { ...DEFAULT_FILTERS, categories: ["lobby"] }, NOON_MONDAY);
    expect(filtered.map((s) => s.id)).toEqual(["hotel"]);
  });

  it("filters by open now", () => {
    const openLate = applyFilters(ALL, { ...DEFAULT_FILTERS, openNow: true }, THREE_AM_MONDAY);
    expect(openLate.map((s) => s.id).sort()).toEqual(["casino", "hotel"]);
  });

  it("filters to 24/7 places", () => {
    const allNight = applyFilters(ALL, { ...DEFAULT_FILTERS, allNight: true }, NOON_MONDAY);
    expect(allNight.map((s) => s.id).sort()).toEqual(["casino", "hotel"]);
  });

  it("combines query with other filters", () => {
    const filtered = applyFilters(
      ALL,
      { ...DEFAULT_FILTERS, categories: ["customers"], query: "beignet" },
      NOON_MONDAY,
    );
    expect(filtered.map((s) => s.id)).toEqual(["cafe"]);
  });
});

describe("sortByDistance", () => {
  it("sorts nearest first without mutating the input", () => {
    const origin = { lat: 29.957, lng: -90.062 }; // on top of PARK
    const sorted = sortByDistance(ALL, origin);
    expect(sorted[0].spot.id).toBe("park");
    expect(sorted[0].meters).toBe(0);
    expect(ALL[0].id).toBe("casino"); // original order untouched
    expect(sorted.map((s) => s.meters)).toEqual([...sorted.map((s) => s.meters)].sort((a, b) => a - b));
  });
});

describe("rankByUrgency", () => {
  it("puts every open spot before any closed one at 3 a.m.", () => {
    const origin = { lat: 29.957, lng: -90.062 }; // PARK is nearest but closed
    const ranked = rankByUrgency(ALL, origin, THREE_AM_MONDAY);
    expect(ranked[0].open).toBe(true);
    expect(ranked.findIndex((r) => !r.open)).toBeGreaterThanOrEqual(2);
    expect(ranked.find((r) => r.spot.id === "park")?.open).toBe(false);
  });

  it("sorts by distance within the open group", () => {
    const origin = { lat: 29.9541, lng: -90.068 }; // next to HOTEL
    const ranked = rankByUrgency(ALL, origin, THREE_AM_MONDAY);
    expect(ranked[0].spot.id).toBe("hotel");
  });
});
