import { describe, expect, it } from "vitest";
import {
  groupByNeighborhood,
  sortItems,
  type ListItem,
  type RatingIndex,
} from "../listSort";
import type { Spot } from "../types";

function spot(id: string, neighborhood: string): Spot {
  return {
    id,
    name: id,
    category: "public",
    lat: 29.95,
    lng: -90.07,
    address: "",
    neighborhood,
    hours: "24/7",
    free: true,
    tip: "",
  };
}

function item(id: string, neighborhood: string, meters: number | null): ListItem {
  return { spot: spot(id, neighborhood), meters };
}

const ratings: RatingIndex = new Map([
  ["a", { avg: 4.9, count: 10, lastAt: "2026-07-01T00:00:00.000Z" }],
  ["b", { avg: 3.2, count: 40, lastAt: "2026-07-05T00:00:00.000Z" }],
  ["c", { avg: 4.9, count: 2, lastAt: "2026-06-01T00:00:00.000Z" }],
]);

const items = [
  item("a", "French Quarter", 500),
  item("b", "Marigny", 100),
  item("c", "French Quarter", 900),
];

describe("sortItems", () => {
  it("nearest sorts by distance, nulls last", () => {
    const withNull = [...items, item("d", "CBD", null)];
    expect(sortItems(withNull, "nearest", ratings).map((i) => i.spot.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("top sorts by avg desc, breaking ties on count", () => {
    // a and c both 4.9; a has more reviews → a first.
    expect(sortItems(items, "top", ratings).map((i) => i.spot.id)).toEqual(["a", "c", "b"]);
  });

  it("recent sorts by newest review", () => {
    expect(sortItems(items, "recent", ratings).map((i) => i.spot.id)).toEqual(["b", "a", "c"]);
  });

  it("default leaves order untouched and never mutates the input", () => {
    const result = sortItems(items, "default", ratings);
    expect(result.map((i) => i.spot.id)).toEqual(["a", "b", "c"]);
    expect(result).not.toBe(items);
  });
});

describe("groupByNeighborhood", () => {
  it("buckets by neighborhood preserving first-seen order", () => {
    const groups = groupByNeighborhood(items);
    expect(groups.map((g) => g.neighborhood)).toEqual(["French Quarter", "Marigny"]);
    expect(groups[0].items.map((i) => i.spot.id)).toEqual(["a", "c"]);
    expect(groups[1].items.map((i) => i.spot.id)).toEqual(["b"]);
  });
});
