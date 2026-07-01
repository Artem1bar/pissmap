import type { LatLng } from "./types";

/** CARTO's free dark vector basemap — keyless, attribution required (shown on the map). */
export const MAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** Jackson Square-ish, the center of tourist bladder distress. */
export const NOLA_CENTER: LatLng = { lat: 29.9565, lng: -90.065 };

export const INITIAL_ZOOM = 14.4;

/** [west, south, east, north] — greater New Orleans; keeps users from panning to Kansas. */
export const MAP_MAX_BOUNDS: [number, number, number, number] = [-90.24, 29.85, -89.88, 30.08];

export const DATA_COMPILED = "July 2026";

export const APP_NAME = "PissMap NOLA";
export const APP_TAGLINE = "when you gotta geaux";
