import type { LatLng } from "./types";

const EARTH_RADIUS_M = 6371000;
const FEET_PER_METER = 3.28084;
const METERS_PER_MILE = 1609.344;
/** Brisk, motivated walking pace. */
const WALK_METERS_PER_MIN = 80;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_METERS_PER_MIN));
}

/** "160 ft" under ~a tenth of a mile, otherwise "0.4 mi". */
export function formatDistance(meters: number): string {
  if (meters < 161) {
    const feet = Math.max(10, Math.round((meters * FEET_PER_METER) / 10) * 10);
    return `${feet} ft`;
  }
  return `${(meters / METERS_PER_MILE).toFixed(1)} mi`;
}

/** Google Maps walking directions from the user's current position. */
export function walkingDirectionsUrl(dest: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=walking`;
}
