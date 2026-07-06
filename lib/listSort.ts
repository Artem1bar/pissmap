import type { Spot } from "./types";

// Pure ordering + grouping for the spot list, kept out of the component so the
// sort math is unit-tested. "default" groups by neighborhood (sticky headers);
// the three explicit sorts flatten the list.

export type SortMode = "default" | "nearest" | "top" | "recent";

export interface SpotRating {
  avg: number;
  count: number;
  lastAt: string;
}

export type RatingIndex = ReadonlyMap<string, SpotRating>;

export interface ListItem {
  spot: Spot;
  meters: number | null;
}

const FAR = Number.POSITIVE_INFINITY;

/** Order items for a given sort mode. `default` is left untouched (grouping owns it). */
export function sortItems(
  items: readonly ListItem[],
  mode: SortMode,
  ratings: RatingIndex,
): ListItem[] {
  const copy = [...items];
  switch (mode) {
    case "nearest":
      return copy.sort((a, b) => (a.meters ?? FAR) - (b.meters ?? FAR));
    case "top":
      return copy.sort((a, b) => {
        const ra = ratings.get(a.spot.id);
        const rb = ratings.get(b.spot.id);
        return (rb?.avg ?? 0) - (ra?.avg ?? 0) || (rb?.count ?? 0) - (ra?.count ?? 0);
      });
    case "recent":
      return copy.sort((a, b) => {
        const la = ratings.get(a.spot.id)?.lastAt ?? "";
        const lb = ratings.get(b.spot.id)?.lastAt ?? "";
        return lb.localeCompare(la);
      });
    default:
      return copy;
  }
}

export interface NeighborhoodGroup {
  neighborhood: string;
  items: ListItem[];
}

/** Group items by neighborhood, preserving the first-seen order of groups and items. */
export function groupByNeighborhood(items: readonly ListItem[]): NeighborhoodGroup[] {
  const groups = new Map<string, ListItem[]>();
  for (const item of items) {
    const key = item.spot.neighborhood;
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()].map(([neighborhood, groupItems]) => ({
    neighborhood,
    items: groupItems,
  }));
}
