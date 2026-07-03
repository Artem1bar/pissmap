import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hasRealDomain, scanPath, scanUrl, siteUrl, spotPath, spotUrl } from "../site";

const ORIGINAL = {
  site: process.env.NEXT_PUBLIC_SITE_URL,
  vercel: process.env.VERCEL_PROJECT_PRODUCTION_URL,
};

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
});
afterEach(() => {
  restore("NEXT_PUBLIC_SITE_URL", ORIGINAL.site);
  restore("VERCEL_PROJECT_PRODUCTION_URL", ORIGINAL.vercel);
});
function restore(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("siteUrl precedence", () => {
  it("prefers an explicit NEXT_PUBLIC_SITE_URL (trailing slash trimmed)", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://pissmap.app/";
    expect(siteUrl()).toBe("https://pissmap.app");
    expect(hasRealDomain()).toBe(true);
  });

  it("falls back to the Vercel production URL", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "pissmap.vercel.app";
    expect(siteUrl()).toBe("https://pissmap.vercel.app");
    expect(hasRealDomain()).toBe(true);
  });

  it("falls back to localhost when nothing is configured", () => {
    expect(siteUrl()).toBe("http://localhost:3000");
    expect(hasRealDomain()).toBe(false);
  });
});

describe("path + url builders", () => {
  it("builds spot and scan paths", () => {
    expect(spotPath("erin-rose")).toBe("/spot/erin-rose");
    expect(scanPath("erin-rose")).toBe("/s/erin-rose");
  });

  it("builds absolute urls from the configured base", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://pissmap.app";
    expect(spotUrl("clover-grill")).toBe("https://pissmap.app/spot/clover-grill");
    expect(scanUrl("clover-grill")).toBe("https://pissmap.app/s/clover-grill");
  });
});
