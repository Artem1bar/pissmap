import { describe, expect, it } from "vitest";
import { placeJsonLd } from "../jsonld";
import type { Spot } from "../types";

const base: Spot = {
  id: "erin-rose",
  name: "Erin Rose",
  category: "customers",
  lat: 29.9571,
  lng: -90.0669,
  address: "811 Conti St",
  neighborhood: "French Quarter",
  hours: "24/7",
  free: false,
  tip: "Frozen Irish coffee and a reliable bathroom.",
};

describe("placeJsonLd", () => {
  it("emits a schema.org Place with geo and a NOLA postal address", () => {
    const ld = placeJsonLd(base);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Place");
    expect(ld.name).toBe("Erin Rose");
    expect(ld.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: 29.9571,
      longitude: -90.0669,
    });
    expect(ld.address.streetAddress).toBe("811 Conti St");
    expect(ld.address.addressLocality).toBe("New Orleans");
    expect(ld.address.addressRegion).toBe("LA");
  });

  it("includes the absolute url only when provided", () => {
    expect(placeJsonLd(base).url).toBeUndefined();
    expect(placeJsonLd(base, "https://example.com/spot/erin-rose").url).toBe(
      "https://example.com/spot/erin-rose",
    );
  });

  it("expresses 24/7 as every day 00:00–23:59", () => {
    const specs = placeJsonLd(base).openingHoursSpecification;
    expect(specs).toHaveLength(1);
    expect(specs?.[0]).toEqual({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      opens: "00:00",
      closes: "23:59",
    });
  });

  it("maps weekly ranges to per-day specs and clamps past-midnight closes", () => {
    // Closed Sun/Mon; Tue 10:00–16:00; Sat 20:00–02:00 (past midnight → 1560).
    const week: Spot = {
      ...base,
      hours: [
        [],
        [],
        [{ open: 600, close: 960 }],
        [],
        [],
        [],
        [{ open: 1200, close: 1560 }],
      ],
    };
    const specs = placeJsonLd(week).openingHoursSpecification ?? [];
    expect(specs).toHaveLength(2);
    expect(specs[0]).toMatchObject({ dayOfWeek: "Tuesday", opens: "10:00", closes: "16:00" });
    expect(specs[1]).toMatchObject({ dayOfWeek: "Saturday", opens: "20:00", closes: "02:00" });
  });

  it("omits opening hours when a weekly schedule is entirely empty", () => {
    const closed: Spot = { ...base, hours: [[], [], [], [], [], [], []] };
    expect(placeJsonLd(closed).openingHoursSpecification).toBeUndefined();
  });
});
