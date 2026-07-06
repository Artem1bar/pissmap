import { describe, expect, it } from "vitest";
import {
  exceedsReportRateLimit,
  REPORT_DETAIL_MAX,
  validateReport,
  type RawReportInput,
} from "../validate";

// A real curated spot id (present in lib/spots).
const SPOT = "clover-grill";
const good: RawReportInput = { spotId: SPOT, reason: "closed", t: 4000 };

describe("validateReport", () => {
  it("accepts a valid report and trims an optional detail", () => {
    const result = validateReport({ ...good, detail: "  Padlocked since Mardi Gras  " });
    expect(result.kind).toBe("valid");
    if (result.kind === "valid") {
      expect(result.value).toEqual({
        spotId: SPOT,
        reason: "closed",
        detail: "Padlocked since Mardi Gras",
      });
    }
  });

  it("accepts a report with no detail (null)", () => {
    const result = validateReport(good);
    expect(result.kind).toBe("valid");
    if (result.kind === "valid") expect(result.value.detail).toBeNull();
  });

  it("silently swallows the honeypot", () => {
    expect(validateReport({ ...good, website: "http://bot.example" }).kind).toBe("honeypot");
  });

  it("rejects an unknown spot", () => {
    const r = validateReport({ ...good, spotId: "not-real" });
    expect(r).toMatchObject({ kind: "invalid", status: 400 });
  });

  it("rejects a reason outside the allowlist", () => {
    expect(validateReport({ ...good, reason: "haunted" }).kind).toBe("invalid");
    expect(validateReport({ ...good, reason: 7 }).kind).toBe("invalid");
    expect(validateReport({ ...good, reason: undefined }).kind).toBe("invalid");
  });

  it("rejects an over-long detail", () => {
    const r = validateReport({ ...good, detail: "x".repeat(REPORT_DETAIL_MAX + 1) });
    expect(r).toMatchObject({ kind: "invalid", status: 400 });
  });

  it("rejects links in the detail", () => {
    expect(validateReport({ ...good, detail: "see www.spam.io" }).kind).toBe("invalid");
    expect(validateReport({ ...good, detail: "https://spam.io" }).kind).toBe("invalid");
  });

  it("rejects a too-fast submission with 429", () => {
    expect(validateReport({ ...good, t: 200 })).toMatchObject({ kind: "invalid", status: 429 });
    expect(validateReport({ ...good, t: undefined })).toMatchObject({ status: 429 });
  });
});

describe("exceedsReportRateLimit", () => {
  it("caps at 5 reports per day", () => {
    expect(exceedsReportRateLimit({ lastDay: 4 })).toBe(false);
    expect(exceedsReportRateLimit({ lastDay: 5 })).toBe(true);
    expect(exceedsReportRateLimit({ lastDay: 9 })).toBe(true);
  });
});
