import { MAP_MAX_BOUNDS } from "./constants";
import type { Category, Spot } from "./types";

// User-added spots live only in the visitor's browser (localStorage) — the app
// has no backend by design. A "suggest for the public map" link lets them file
// a prefilled GitHub issue so a spot can graduate into the shared dataset.

export const USER_SPOTS_KEY = "pissmap.user-spots.v1";
export const NAME_MAX = 60;
export const TIP_MAX = 280;

export interface UserSpotDraft {
  name: string;
  category: Category;
  tip: string;
  lat: number;
  lng: number;
  open24h: boolean;
}

export interface StoredUserSpot {
  id: string;
  name: string;
  category: Category;
  tip: string;
  lat: number;
  lng: number;
  open24h: boolean;
  createdAt: string;
}

const CATEGORIES: readonly Category[] = ["public", "customers", "lobby"];

/** Returns a human-readable problem, or null when the draft is saveable. */
export function validateDraft(draft: UserSpotDraft): string | null {
  const name = draft.name.trim();
  if (name.length < 3) return "Give the spot a name (at least 3 characters).";
  if (name.length > NAME_MAX) return `Name is too long (max ${NAME_MAX} characters).`;
  if (draft.tip.trim().length > TIP_MAX) return `Description is too long (max ${TIP_MAX} characters).`;
  if (!CATEGORIES.includes(draft.category)) return "Pick a category.";
  const [west, south, east, north] = MAP_MAX_BOUNDS;
  if (
    !Number.isFinite(draft.lat) ||
    !Number.isFinite(draft.lng) ||
    draft.lat < south ||
    draft.lat > north ||
    draft.lng < west ||
    draft.lng > east
  ) {
    return "The pin has to be inside New Orleans.";
  }
  return null;
}

export function draftToStored(draft: UserSpotDraft, id: string, createdAt: string): StoredUserSpot {
  return {
    id,
    name: draft.name.trim(),
    category: draft.category,
    tip: draft.tip.trim(),
    lat: +draft.lat.toFixed(5),
    lng: +draft.lng.toFixed(5),
    open24h: draft.open24h,
    createdAt,
  };
}

export function storedToSpot(stored: StoredUserSpot): Spot {
  return {
    id: stored.id,
    name: stored.name,
    category: stored.category,
    lat: stored.lat,
    lng: stored.lng,
    address: `Dropped pin (${stored.lat.toFixed(4)}, ${stored.lng.toFixed(4)})`,
    neighborhood: "My spots",
    hours: stored.open24h ? "24/7" : [[], [], [], [], [], [], []],
    free: stored.category !== "customers",
    tip: stored.tip || "Added by you on this device.",
    userAdded: true,
  };
}

function isStoredUserSpot(value: unknown): value is StoredUserSpot {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.lat === "number" &&
    typeof v.lng === "number" &&
    typeof v.open24h === "boolean" &&
    CATEGORIES.includes(v.category as Category)
  );
}

export function parseStored(json: string | null): StoredUserSpot[] {
  if (!json) return [];
  try {
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data.filter(isStoredUserSpot).map((s) => ({ ...s, tip: typeof s.tip === "string" ? s.tip : "" }));
  } catch {
    return [];
  }
}

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function readUserSpots(): StoredUserSpot[] {
  if (!hasStorage()) return [];
  return parseStored(window.localStorage.getItem(USER_SPOTS_KEY));
}

export function writeUserSpots(spots: readonly StoredUserSpot[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(USER_SPOTS_KEY, JSON.stringify(spots));
  } catch {
    // Storage full or blocked — the in-memory copy still works for this session.
  }
}

/** Prefilled GitHub issue so a personal spot can be proposed for the shared map. */
export function suggestIssueUrl(spot: Spot): string {
  const title = `Spot suggestion: ${spot.name}`;
  const body = [
    "**Suggested via the PissMap NOLA app**",
    "",
    `- Name: ${spot.name}`,
    `- Category: ${spot.category}`,
    `- Coordinates: ${spot.lat}, ${spot.lng}`,
    `- Hours: ${spot.hours === "24/7" ? "24/7" : "unknown"}`,
    `- Notes: ${spot.tip}`,
    "",
    "Add anything that helps verify it (address, hours, how you know the restroom is usable):",
  ].join("\n");
  return `https://github.com/Artem1bar/pissmap/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
