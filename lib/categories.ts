import type { Category } from "./types";

export interface CategoryMeta {
  label: string;
  short: string;
  /** Marker + badge color. The trio is deliberately Mardi Gras: green, gold, purple. */
  color: string;
  blurb: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  public: {
    label: "Free & public",
    short: "Public",
    color: "#3ecf8e",
    blurb: "Parks, markets, malls, stations — walk in, no purchase needed.",
  },
  customers: {
    label: "Buy something",
    short: "Customers",
    color: "#f7c948",
    blurb: "Cafés, diners, food halls — a cheap coffee is the price of admission.",
  },
  lobby: {
    label: "Hotel lobby",
    short: "Lobby",
    color: "#a78bfa",
    blurb: "Walk in like you have a reservation. Confidence opens every marble restroom.",
  },
};

export const CATEGORIES: readonly Category[] = ["public", "customers", "lobby"];
