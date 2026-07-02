export type Category = "public" | "customers" | "lobby";

export interface DayRange {
  /** Minutes since local midnight, inclusive. */
  open: number;
  /**
   * Minutes since local midnight, exclusive. May exceed 1440 when a place
   * closes after midnight (e.g. 10:00–04:00 is { open: 600, close: 1680 }).
   */
  close: number;
}

/**
 * Weekly hours. Either literally always open, or an array of 7 entries
 * indexed 0 = Sunday … 6 = Saturday. An empty array means closed that day.
 */
export type WeekHours = "24/7" | readonly (readonly DayRange[])[];

/** A wall-clock moment in New Orleans: weekday (0 = Sunday) + minutes since midnight. */
export interface LocalTime {
  day: number;
  minutes: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Spot {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  address: string;
  neighborhood: string;
  hours: WeekHours;
  /** True when no purchase or ticket is expected to use the restroom. */
  free: boolean;
  /** Wheelchair accessible. Only set when reasonably confirmed; absent = unknown. */
  wheelchair?: boolean;
  /** The restroom itself is mapped on OpenStreetMap (amenity=toilets). */
  osmToilet?: boolean;
  /** Hours/details are best-effort — the UI nudges users to double-check. */
  verify?: boolean;
  /** The local-knowledge tip shown on the detail card. */
  tip: string;
  /** Spot created by the visitor on this device (localStorage), not part of the shared dataset. */
  userAdded?: boolean;
}
