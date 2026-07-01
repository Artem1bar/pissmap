import { isOpen } from "./hours";
import type { Category, LatLng, LocalTime, Spot } from "./types";
import { haversineMeters } from "./geo";

export interface Filters {
  /** Empty array = all categories. */
  categories: readonly Category[];
  openNow: boolean;
  allNight: boolean;
  query: string;
}

export const DEFAULT_FILTERS: Filters = {
  categories: [],
  openNow: false,
  allNight: false,
  query: "",
};

export function toggleCategory(filters: Filters, category: Category): Filters {
  const categories = filters.categories.includes(category)
    ? filters.categories.filter((c) => c !== category)
    : [...filters.categories, category];
  return { ...filters, categories };
}

export function matchesQuery(spot: Spot, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = `${spot.name} ${spot.neighborhood} ${spot.address} ${spot.tip}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export function applyFilters(spots: readonly Spot[], filters: Filters, at: LocalTime): Spot[] {
  return spots.filter((spot) => {
    if (filters.categories.length > 0 && !filters.categories.includes(spot.category)) return false;
    if (filters.allNight && spot.hours !== "24/7") return false;
    if (filters.openNow && !isOpen(spot.hours, at)) return false;
    return matchesQuery(spot, filters.query);
  });
}

export interface RankedSpot {
  spot: Spot;
  meters: number;
  open: boolean;
}

/** New array of spots with distances, nearest first. Input is not mutated. */
export function sortByDistance(
  spots: readonly Spot[],
  origin: LatLng,
): Array<{ spot: Spot; meters: number }> {
  return spots
    .map((spot) => ({ spot, meters: haversineMeters(origin, spot) }))
    .sort((a, b) => a.meters - b.meters);
}

/**
 * Emergency ranking: every open spot before any closed one, each group
 * nearest-first. Guaranteed non-empty as long as `spots` is.
 */
export function rankByUrgency(
  spots: readonly Spot[],
  origin: LatLng,
  at: LocalTime,
): RankedSpot[] {
  return spots
    .map((spot) => ({
      spot,
      meters: haversineMeters(origin, spot),
      open: isOpen(spot.hours, at),
    }))
    .sort((a, b) => (a.open === b.open ? a.meters - b.meters : a.open ? -1 : 1));
}
