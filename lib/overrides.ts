import type { OverrideKind } from "./db/schema";
import type { Spot } from "./types";

// The runtime patch layer over the static 412-spot dataset. Moderators set a
// per-spot override in /admin; the client fetches them once and merges here.
// Pure and dependency-free so the merge is fully unit-tested: `hide` removes a
// spot everywhere, `warn` surfaces an amber banner. The dataset stays the
// source of truth — this only ever hides or annotates, never invents spots.

export interface SpotOverride {
  spotId: string;
  kind: OverrideKind;
  note: string | null;
}

export type OverrideIndex = ReadonlyMap<string, SpotOverride>;

/** Build an id → override lookup from the flat list the API returns. */
export function indexOverrides(list: readonly SpotOverride[]): OverrideIndex {
  return new Map(list.map((o) => [o.spotId, o]));
}

/** True when a spot is hidden and must vanish from map, list, and GOTTA GEAUX. */
export function isHidden(index: OverrideIndex, spotId: string): boolean {
  return index.get(spotId)?.kind === "hide";
}

/** The active `warn` override for a spot (carrying its note), or null. */
export function warnFor(index: OverrideIndex, spotId: string): SpotOverride | null {
  const override = index.get(spotId);
  return override && override.kind === "warn" ? override : null;
}

/** Drop every hidden spot, keeping order. `warn` spots pass through untouched. */
export function visibleSpots(spots: readonly Spot[], index: OverrideIndex): Spot[] {
  if (index.size === 0) return [...spots];
  return spots.filter((spot) => !isHidden(index, spot.id));
}
