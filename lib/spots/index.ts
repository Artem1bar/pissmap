import type { Spot } from "../types";
import { FRENCH_QUARTER_SPOTS } from "./french-quarter";
import { DOWNTOWN_SPOTS } from "./downtown";
import { DOWNRIVER_SPOTS } from "./downriver";
import { GARDEN_DISTRICT_SPOTS } from "./garden-district";
import { UPTOWN_SPOTS } from "./uptown";
import { MIDCITY_SPOTS } from "./midcity";
import { LAKEFRONT_SPOTS } from "./lakefront";
import { EAST_SPOTS } from "./east";
import { ALGIERS_SPOTS } from "./algiers";

// Compiled July 2026 from OpenStreetMap (amenity=toilets nodes, Nominatim-verified
// venues) and local knowledge, then expanded citywide by a 50-agent research
// sweep in which every candidate was adversarially fact-checked against live
// sources before earning a pin (see data/provenance.json for the audit trail).
// `osmToilet` marks restrooms mapped on OSM; `verify` marks hours that drift —
// New Orleans hours always drift.

export const SPOTS: readonly Spot[] = [
  ...FRENCH_QUARTER_SPOTS,
  ...DOWNTOWN_SPOTS,
  ...DOWNRIVER_SPOTS,
  ...GARDEN_DISTRICT_SPOTS,
  ...UPTOWN_SPOTS,
  ...MIDCITY_SPOTS,
  ...LAKEFRONT_SPOTS,
  ...EAST_SPOTS,
  ...ALGIERS_SPOTS,
];

/** id → Spot, for O(1) lookup by permalinks, OG images, and review validation. */
export const SPOT_BY_ID: ReadonlyMap<string, Spot> = new Map(SPOTS.map((spot) => [spot.id, spot]));

export function getSpotById(id: string): Spot | undefined {
  return SPOT_BY_ID.get(id);
}

/** True when `id` names a real curated spot (not a user's private localStorage pin). */
export function isKnownSpotId(id: string): boolean {
  return SPOT_BY_ID.has(id);
}
