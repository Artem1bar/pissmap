import { describe, expect, it } from "vitest";
import { formatDistance, haversineMeters, walkMinutes, walkingDirectionsUrl } from "../geo";

const JACKSON_SQUARE = { lat: 29.9576, lng: -90.0636 };
const CANAL_PLACE = { lat: 29.95167, lng: -90.06525 };

describe("haversineMeters", () => {
  it("is zero for identical points", () => {
    expect(haversineMeters(JACKSON_SQUARE, JACKSON_SQUARE)).toBe(0);
  });

  it("measures Jackson Square → Canal Place at roughly 680m", () => {
    const meters = haversineMeters(JACKSON_SQUARE, CANAL_PLACE);
    expect(meters).toBeGreaterThan(600);
    expect(meters).toBeLessThan(760);
  });

  it("is symmetric", () => {
    expect(haversineMeters(JACKSON_SQUARE, CANAL_PLACE)).toBeCloseTo(
      haversineMeters(CANAL_PLACE, JACKSON_SQUARE),
      6,
    );
  });
});

describe("walkMinutes", () => {
  it("uses an 80 m/min pace and never says zero", () => {
    expect(walkMinutes(400)).toBe(5);
    expect(walkMinutes(80)).toBe(1);
    expect(walkMinutes(0)).toBe(1);
  });
});

describe("formatDistance", () => {
  it("uses feet under about a tenth of a mile", () => {
    expect(formatDistance(50)).toBe("160 ft");
    expect(formatDistance(2)).toBe("10 ft");
  });

  it("uses miles above the threshold", () => {
    expect(formatDistance(200)).toBe("0.1 mi");
    expect(formatDistance(1609.344)).toBe("1.0 mi");
    expect(formatDistance(4000)).toBe("2.5 mi");
  });
});

describe("walkingDirectionsUrl", () => {
  it("builds a Google Maps walking deep link", () => {
    expect(walkingDirectionsUrl({ lat: 29.9576, lng: -90.0636 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=29.9576,-90.0636&travelmode=walking",
    );
  });
});
