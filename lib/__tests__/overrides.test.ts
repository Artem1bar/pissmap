import { describe, expect, it } from "vitest";
import { indexOverrides, isHidden, visibleSpots, warnFor, type SpotOverride } from "../overrides";
import type { Spot } from "../types";

function spot(id: string): Spot {
  return {
    id,
    name: id,
    category: "public",
    lat: 29.95,
    lng: -90.07,
    address: "somewhere",
    neighborhood: "French Quarter",
    hours: "24/7",
    free: true,
    tip: "",
  };
}

const overrides: SpotOverride[] = [
  { spotId: "gone", kind: "hide", note: null },
  { spotId: "iffy", kind: "warn", note: "Reported closed July 4 — verifying" },
  { spotId: "iffy-nonote", kind: "warn", note: null },
];

describe("indexOverrides", () => {
  it("keys the flat list by spot id", () => {
    const index = indexOverrides(overrides);
    expect(index.size).toBe(3);
    expect(index.get("iffy")?.note).toBe("Reported closed July 4 — verifying");
  });
});

describe("isHidden", () => {
  it("is true only for hide overrides", () => {
    const index = indexOverrides(overrides);
    expect(isHidden(index, "gone")).toBe(true);
    expect(isHidden(index, "iffy")).toBe(false);
    expect(isHidden(index, "unknown")).toBe(false);
  });
});

describe("warnFor", () => {
  it("returns the warn override (with note) and nothing for hide/absent", () => {
    const index = indexOverrides(overrides);
    expect(warnFor(index, "iffy")?.note).toBe("Reported closed July 4 — verifying");
    expect(warnFor(index, "iffy-nonote")).toMatchObject({ kind: "warn", note: null });
    expect(warnFor(index, "gone")).toBeNull();
    expect(warnFor(index, "unknown")).toBeNull();
  });
});

describe("visibleSpots", () => {
  it("removes hidden spots and keeps warned + untouched ones in order", () => {
    const spots = [spot("a"), spot("gone"), spot("iffy"), spot("b")];
    const result = visibleSpots(spots, indexOverrides(overrides));
    expect(result.map((s) => s.id)).toEqual(["a", "iffy", "b"]);
  });

  it("returns a copy untouched when there are no overrides", () => {
    const spots = [spot("a"), spot("b")];
    const result = visibleSpots(spots, indexOverrides([]));
    expect(result).toEqual(spots);
    expect(result).not.toBe(spots);
  });
});
