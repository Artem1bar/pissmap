import { DAY_NAMES, MIN_PER_DAY } from "./hours";
import type { Spot, WeekHours } from "./types";

// Schema.org structured data for the per-spot permalink pages. Pure and
// env-free (the absolute URL is passed in) so the shape is unit-testable and the
// page component stays a thin wrapper. Google reads this to render rich results:
// a named Place with coordinates, a street address, and opening hours.

interface OpeningHoursSpec {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string | string[];
  opens: string;
  closes: string;
}

export interface PlaceJsonLd {
  "@context": "https://schema.org";
  "@type": "Place";
  name: string;
  address: {
    "@type": "PostalAddress";
    streetAddress: string;
    addressLocality: "New Orleans";
    addressRegion: "LA";
    addressCountry: "US";
  };
  geo: { "@type": "GeoCoordinates"; latitude: number; longitude: number };
  url?: string;
  openingHoursSpecification?: OpeningHoursSpec[];
}

/** Minutes-since-midnight → "HH:MM" (24h), wrapping past-midnight values. */
function hhmm(minutes: number): string {
  const norm = ((minutes % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** A close time as a clock string; an exact-midnight close reads as 23:59, not 00:00. */
function closeClock(closeMinutes: number): string {
  const clock = hhmm(closeMinutes);
  return clock === "00:00" ? "23:59" : clock;
}

function openingHours(hours: WeekHours): OpeningHoursSpec[] {
  if (hours === "24/7") {
    return [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [...DAY_NAMES],
        opens: "00:00",
        closes: "23:59",
      },
    ];
  }
  const specs: OpeningHoursSpec[] = [];
  for (let day = 0; day < 7; day++) {
    for (const range of hours[day] ?? []) {
      if (range.close <= range.open) continue;
      specs.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAY_NAMES[day],
        opens: hhmm(range.open),
        closes: closeClock(range.close),
      });
    }
  }
  return specs;
}

/** Build the schema.org Place object for a spot. Pass the absolute permalink as `url`. */
export function placeJsonLd(spot: Spot, url?: string): PlaceJsonLd {
  const specs = openingHours(spot.hours);
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: spot.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: spot.address,
      addressLocality: "New Orleans",
      addressRegion: "LA",
      addressCountry: "US",
    },
    geo: { "@type": "GeoCoordinates", latitude: spot.lat, longitude: spot.lng },
    ...(url ? { url } : {}),
    ...(specs.length > 0 ? { openingHoursSpecification: specs } : {}),
  };
}
