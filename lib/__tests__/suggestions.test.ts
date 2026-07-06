import { describe, expect, it } from "vitest";
import {
  exceedsSuggestionRateLimit,
  formatSuggestionEntry,
  suggestionSlug,
  SUGGESTION_NAME_MAX,
  validateSuggestion,
  type RawSuggestionInput,
} from "../suggestions";

const good: RawSuggestionInput = {
  name: "The Country Club",
  lat: 29.964,
  lng: -90.056,
  category: "customers",
  tip: "Bathhouse and bar; buy a drink and use the facilities.",
  t: 5000,
};

describe("validateSuggestion", () => {
  it("accepts a valid suggestion and trims optional fields", () => {
    const result = validateSuggestion({ ...good, hoursText: "  noon–2am  ", nickname: "  Al  " });
    expect(result.kind).toBe("valid");
    if (result.kind === "valid") {
      expect(result.value.name).toBe("The Country Club");
      expect(result.value.hoursText).toBe("noon–2am");
      expect(result.value.nickname).toBe("Al");
      expect(result.value.category).toBe("customers");
    }
  });

  it("swallows the honeypot", () => {
    expect(validateSuggestion({ ...good, website: "http://bot" }).kind).toBe("honeypot");
  });

  it("rejects a short name, over-long name, and links in the name", () => {
    expect(validateSuggestion({ ...good, name: "no" }).kind).toBe("invalid");
    expect(validateSuggestion({ ...good, name: "x".repeat(SUGGESTION_NAME_MAX + 1) }).kind).toBe("invalid");
    expect(validateSuggestion({ ...good, name: "Visit www.spam.io" }).kind).toBe("invalid");
  });

  it("rejects a bad category and out-of-bounds coordinates", () => {
    expect(validateSuggestion({ ...good, category: "nightclub" }).kind).toBe("invalid");
    expect(validateSuggestion({ ...good, lat: 40.7, lng: -74 }).kind).toBe("invalid"); // NYC
    expect(validateSuggestion({ ...good, lat: "29.9", lng: -90 }).kind).toBe("invalid");
  });

  it("rejects links in the tip and too-fast submissions", () => {
    expect(validateSuggestion({ ...good, tip: "see https://x.io" }).kind).toBe("invalid");
    expect(validateSuggestion({ ...good, t: 200 })).toMatchObject({ status: 429 });
  });
});

describe("exceedsSuggestionRateLimit", () => {
  it("caps at 3 per day", () => {
    expect(exceedsSuggestionRateLimit({ lastDay: 2 })).toBe(false);
    expect(exceedsSuggestionRateLimit({ lastDay: 3 })).toBe(true);
  });
});

describe("suggestionSlug", () => {
  it("slugifies names, stripping accents and punctuation", () => {
    expect(suggestionSlug("Café du Monde")).toBe("cafe-du-monde");
    expect(suggestionSlug("Molly's at the Market!")).toBe("molly-s-at-the-market");
    expect(suggestionSlug("   ")).toBe("spot");
  });
});

describe("formatSuggestionEntry", () => {
  it("emits a copy-ready dataset literal with honest TODO defaults", () => {
    const entry = formatSuggestionEntry({
      name: "The Country Club",
      lat: 29.964,
      lng: -90.056,
      category: "customers",
      tip: "Buy a drink first.",
      hoursText: "noon–2am",
    });
    expect(entry).toContain('id: "the-country-club"');
    expect(entry).toContain('category: "customers"');
    expect(entry).toContain("lat: 29.964");
    expect(entry).toContain("free: false"); // customers aren't free
    expect(entry).toContain("hours: UNKNOWN_HOURS,  // reporter said: noon–2am");
    expect(entry).toContain('address: "TODO — geocode"');
    expect(entry).toContain("verify: true");
  });

  it("defaults free to true for public spots and omits the hours comment when unknown", () => {
    const entry = formatSuggestionEntry({
      name: "Some Park",
      lat: 29.96,
      lng: -90.06,
      category: "public",
      tip: "",
      hoursText: null,
    });
    expect(entry).toContain("free: true");
    expect(entry).toContain("hours: UNKNOWN_HOURS,\n");
    expect(entry).toContain("Suggested by a visitor");
  });
});
