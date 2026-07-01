import { describe, expect, it } from "vitest";
import { SPOTS } from "../spots";
import { MAP_MAX_BOUNDS } from "../constants";
import { MIN_PER_DAY } from "../hours";

describe("dataset integrity", () => {
  it("has a respectable number of spots", () => {
    expect(SPOTS.length).toBeGreaterThanOrEqual(30);
  });

  it("has unique kebab-case ids", () => {
    const ids = SPOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("keeps every coordinate inside the map bounds", () => {
    const [west, south, east, north] = MAP_MAX_BOUNDS;
    for (const spot of SPOTS) {
      expect(spot.lat, spot.id).toBeGreaterThan(south);
      expect(spot.lat, spot.id).toBeLessThan(north);
      expect(spot.lng, spot.id).toBeGreaterThan(west);
      expect(spot.lng, spot.id).toBeLessThan(east);
    }
  });

  it("has well-formed hours", () => {
    for (const spot of SPOTS) {
      if (spot.hours === "24/7") continue;
      expect(spot.hours, spot.id).toHaveLength(7);
      for (const day of spot.hours) {
        for (const range of day) {
          expect(range.open, spot.id).toBeGreaterThanOrEqual(0);
          expect(range.open, spot.id).toBeLessThan(MIN_PER_DAY);
          expect(range.close, spot.id).toBeGreaterThan(range.open);
          // A single range never spans more than a full day.
          expect(range.close - range.open, spot.id).toBeLessThanOrEqual(MIN_PER_DAY);
        }
      }
    }
  });

  it("has real content on every spot", () => {
    for (const spot of SPOTS) {
      expect(spot.name.length, spot.id).toBeGreaterThan(3);
      expect(spot.address.length, spot.id).toBeGreaterThan(5);
      expect(spot.neighborhood.length, spot.id).toBeGreaterThan(2);
      expect(spot.tip.length, spot.id).toBeGreaterThan(40);
    }
  });

  it("always has somewhere open at 3 a.m. (the whole point)", () => {
    expect(SPOTS.some((s) => s.hours === "24/7")).toBe(true);
  });

  it("marks free spots consistently", () => {
    for (const spot of SPOTS) {
      if (spot.category === "public" || spot.category === "lobby") {
        expect(spot.free, spot.id).toBe(true);
      } else {
        expect(spot.free, spot.id).toBe(false);
      }
    }
  });
});
