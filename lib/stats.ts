import type { Category } from "./types";
import { SPOTS } from "./spots";

// Live dataset stats for the press kit — computed from the actual spots, never
// hardcoded, so the numbers can never drift from reality. All honest, all
// derivable from lib/spots.

export interface DatasetStats {
  total: number;
  neighborhoods: number;
  open247: number;
  free: number;
  osmMapped: number;
  wheelchair: number;
  /** Spots whose hours are confirmed (no "double-check" caution flag). */
  confirmedHours: number;
  /** Percentage of spots with confirmed (non-caution) hours, rounded. */
  confirmedHoursPct: number;
  byCategory: Record<Category, number>;
}

export function datasetStats(): DatasetStats {
  const total = SPOTS.length;
  const neighborhoods = new Set(SPOTS.map((s) => s.neighborhood)).size;
  const open247 = SPOTS.filter((s) => s.hours === "24/7").length;
  const free = SPOTS.filter((s) => s.free).length;
  const osmMapped = SPOTS.filter((s) => s.osmToilet).length;
  const wheelchair = SPOTS.filter((s) => s.wheelchair).length;
  const confirmedHours = SPOTS.filter((s) => !s.verify).length;
  const confirmedHoursPct = total === 0 ? 0 : Math.round((confirmedHours / total) * 100);

  const byCategory: Record<Category, number> = { public: 0, customers: 0, lobby: 0 };
  for (const spot of SPOTS) byCategory[spot.category] += 1;

  return {
    total,
    neighborhoods,
    open247,
    free,
    osmMapped,
    wheelchair,
    confirmedHours,
    confirmedHoursPct,
    byCategory,
  };
}
