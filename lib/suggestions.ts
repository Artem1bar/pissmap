import { hasLink, isHoneypot, tooFast } from "./antispam";
import { MAP_MAX_BOUNDS } from "./constants";
import type { SpotCategory } from "./db/schema";

// Crowd → curated. Suggestions are validated with the same anti-spam kit as
// reviews/reports, then a moderator accepts one and gets a copy-ready dataset
// entry (formatSuggestionEntry) that a human verifies + geocodes before it lands
// in lib/spots/. Runtime never edits dataset code — this only produces text.

export const SUGGESTION_NAME_MAX = 60;
export const SUGGESTION_TIP_MAX = 280;
export const SUGGESTION_HOURS_MAX = 120;
export const SUGGESTION_NICKNAME_MAX = 24;
export const SUGGESTION_MIN_COMPOSE_MS = 3000;
export const SUGGESTION_RATE_DAY_MAX = 3;

const CATEGORIES: readonly SpotCategory[] = ["public", "customers", "lobby"];

export interface RawSuggestionInput {
  name?: unknown;
  lat?: unknown;
  lng?: unknown;
  category?: unknown;
  tip?: unknown;
  hoursText?: unknown;
  nickname?: unknown;
  website?: unknown;
  t?: unknown;
}

export interface CleanSuggestion {
  name: string;
  lat: number;
  lng: number;
  category: SpotCategory;
  tip: string;
  hoursText: string | null;
  nickname: string | null;
}

export type SuggestionValidation =
  | { kind: "honeypot" }
  | { kind: "invalid"; status: number; error: string }
  | { kind: "valid"; value: CleanSuggestion };

function invalid(error: string, status = 400): SuggestionValidation {
  return { kind: "invalid", status, error };
}

function isCategory(value: unknown): value is SpotCategory {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

function inBounds(lat: unknown, lng: unknown): lat is number {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const [west, south, east, north] = MAP_MAX_BOUNDS;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

export function validateSuggestion(input: RawSuggestionInput): SuggestionValidation {
  if (isHoneypot(input.website)) return { kind: "honeypot" };

  if (typeof input.name !== "string") return invalid("Give the spot a name.");
  const name = input.name.trim();
  if (name.length < 3) return invalid("Name needs at least 3 characters.");
  if (name.length > SUGGESTION_NAME_MAX) {
    return invalid(`Name is too long (max ${SUGGESTION_NAME_MAX}).`);
  }
  if (hasLink(name)) return invalid("No links in the name.");

  if (!isCategory(input.category)) return invalid("Pick a category.");

  if (!inBounds(input.lat, input.lng)) {
    return invalid("The pin has to be inside New Orleans.");
  }

  let tip = "";
  if (typeof input.tip === "string") {
    tip = input.tip.trim();
    if (tip.length > SUGGESTION_TIP_MAX) {
      return invalid(`Description is too long (max ${SUGGESTION_TIP_MAX}).`);
    }
    if (hasLink(tip)) return invalid("No links in the description.");
  }

  let hoursText: string | null = null;
  if (typeof input.hoursText === "string") {
    const trimmed = input.hoursText.trim();
    if (trimmed.length > SUGGESTION_HOURS_MAX) {
      return invalid(`Hours note is too long (max ${SUGGESTION_HOURS_MAX}).`);
    }
    hoursText = trimmed.length > 0 ? trimmed : null;
  }

  let nickname: string | null = null;
  if (typeof input.nickname === "string") {
    const trimmed = input.nickname.trim();
    if (trimmed.length > SUGGESTION_NICKNAME_MAX) {
      return invalid(`Nickname is too long (max ${SUGGESTION_NICKNAME_MAX}).`);
    }
    nickname = trimmed.length > 0 ? trimmed : null;
  }

  if (tooFast(input.t, SUGGESTION_MIN_COMPOSE_MS)) {
    return invalid("Whoa there — take a breath and try again.", 429);
  }

  return {
    kind: "valid",
    value: {
      name,
      lat: input.lat as number,
      lng: input.lng as number,
      category: input.category,
      tip,
      hoursText,
      nickname,
    },
  };
}

/** True when this hashed IP has hit its daily suggestion cap. */
export function exceedsSuggestionRateLimit(counts: { lastDay: number }): boolean {
  return counts.lastDay >= SUGGESTION_RATE_DAY_MAX;
}

// ——— Copy-ready dataset entry (Accept in /admin) ———

export interface SuggestionEntry {
  name: string;
  lat: number;
  lng: number;
  category: SpotCategory;
  tip: string;
  hoursText: string | null;
}

/** A dataset-safe id slug from a spot name: "Café du Monde" → "cafe-du-monde". */
export function suggestionSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug.length > 0 ? slug : "spot";
}

/**
 * A copy-ready `Spot` literal for a human to paste into lib/spots/ and finish
 * (address, neighborhood, real hours all marked TODO). Matches the dataset's
 * hand-authored shape; `UNKNOWN_HOURS` and `verify: true` are the honest
 * defaults until a person confirms the details.
 */
export function formatSuggestionEntry(entry: SuggestionEntry): string {
  const free = entry.category !== "customers";
  const hoursComment = entry.hoursText ? `  // reporter said: ${entry.hoursText}` : "";
  const tip = entry.tip || "Suggested by a visitor — verify before publishing.";
  return [
    "{",
    `  id: ${JSON.stringify(suggestionSlug(entry.name))},`,
    `  name: ${JSON.stringify(entry.name)},`,
    `  category: ${JSON.stringify(entry.category)},`,
    `  lat: ${entry.lat},`,
    `  lng: ${entry.lng},`,
    `  address: "TODO — geocode",`,
    `  neighborhood: "TODO",`,
    `  hours: UNKNOWN_HOURS,${hoursComment}`,
    `  free: ${free},`,
    `  verify: true,`,
    `  tip: ${JSON.stringify(tip)},`,
    "},",
  ].join("\n");
}
