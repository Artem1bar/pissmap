import { describe, expect, it } from "vitest";
import {
  draftToStored,
  NAME_MAX,
  parseStored,
  storedToSpot,
  suggestIssueUrl,
  TIP_MAX,
  validateDraft,
  type UserSpotDraft,
} from "../userSpots";

const okDraft: UserSpotDraft = {
  name: "Friendly bar",
  category: "customers",
  tip: "Buy a beer first.",
  lat: 29.9576,
  lng: -90.0636,
  open24h: false,
};

describe("validateDraft", () => {
  it("accepts a sane draft", () => {
    expect(validateDraft(okDraft)).toBeNull();
  });

  it("rejects short and overlong names", () => {
    expect(validateDraft({ ...okDraft, name: "ab" })).toMatch(/name/i);
    expect(validateDraft({ ...okDraft, name: "x".repeat(NAME_MAX + 1) })).toMatch(/long/i);
  });

  it("rejects an overlong tip", () => {
    expect(validateDraft({ ...okDraft, tip: "x".repeat(TIP_MAX + 1) })).toMatch(/long/i);
  });

  it("rejects pins outside New Orleans", () => {
    expect(validateDraft({ ...okDraft, lat: 40.7, lng: -74 })).toMatch(/New Orleans/);
    expect(validateDraft({ ...okDraft, lat: Number.NaN })).toMatch(/New Orleans/);
  });
});

describe("draftToStored / storedToSpot", () => {
  it("round-trips into a well-formed Spot", () => {
    const stored = draftToStored({ ...okDraft, name: "  Padded  " }, "user-abc", "2026-07-02T00:00:00Z");
    expect(stored.name).toBe("Padded");
    expect(stored.lat).toBeCloseTo(29.9576, 5);

    const spot = storedToSpot(stored);
    expect(spot.userAdded).toBe(true);
    expect(spot.free).toBe(false); // customers
    expect(spot.hours).toEqual([[], [], [], [], [], [], []]);
    expect(spot.neighborhood).toBe("My spots");
  });

  it("maps 24/7 drafts and non-customer categories", () => {
    const spot = storedToSpot(
      draftToStored({ ...okDraft, category: "public", open24h: true }, "user-x", "2026-07-02T00:00:00Z"),
    );
    expect(spot.hours).toBe("24/7");
    expect(spot.free).toBe(true);
  });
});

describe("parseStored", () => {
  it("survives garbage and filters invalid records", () => {
    expect(parseStored(null)).toEqual([]);
    expect(parseStored("not json")).toEqual([]);
    expect(parseStored('{"a":1}')).toEqual([]);
    const mixed = JSON.stringify([
      draftToStored(okDraft, "user-ok", "2026-07-02T00:00:00Z"),
      { id: "bad", name: 5 },
      null,
    ]);
    const parsed = parseStored(mixed);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("user-ok");
  });
});

describe("suggestIssueUrl", () => {
  it("builds a prefilled GitHub issue link", () => {
    const url = suggestIssueUrl(storedToSpot(draftToStored(okDraft, "user-abc", "2026-07-02T00:00:00Z")));
    expect(url).toContain("github.com/Artem1bar/pissmap/issues/new");
    expect(url).toContain(encodeURIComponent("Friendly bar"));
    expect(decodeURIComponent(url)).toContain("29.9576");
  });
});
