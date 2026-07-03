import { describe, expect, it } from "vitest";
import { anonName, displayName, nicknameColor, relativeTime } from "../format";

const NOW = new Date("2026-07-03T12:00:00Z").getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("relativeTime", () => {
  it("buckets ages into compact chat labels", () => {
    expect(relativeTime(ago(5_000), NOW)).toBe("just now");
    expect(relativeTime(ago(90_000), NOW)).toBe("1m");
    expect(relativeTime(ago(20 * 60_000), NOW)).toBe("20m");
    expect(relativeTime(ago(3 * 3600_000), NOW)).toBe("3h");
    expect(relativeTime(ago(2 * 86_400_000), NOW)).toBe("2d");
    expect(relativeTime(ago(3 * 7 * 86_400_000), NOW)).toBe("3w");
    expect(relativeTime(ago(2 * 30 * 86_400_000), NOW)).toBe("2mo");
    expect(relativeTime(ago(400 * 86_400_000), NOW)).toBe("1y");
  });

  it("never goes negative for a future or invalid timestamp", () => {
    expect(relativeTime(ago(-10_000), NOW)).toBe("just now");
    expect(relativeTime("not-a-date", NOW)).toBe("");
  });
});

describe("nicknameColor", () => {
  it("is deterministic and a valid hsl string", () => {
    const c = nicknameColor("Erin Rose");
    expect(c).toMatch(/^hsl\(\d{1,3} 72% 68%\)$/);
    expect(nicknameColor("Erin Rose")).toBe(c);
  });
  it("varies by input", () => {
    expect(nicknameColor("a")).not.toBe(nicknameColor("b"));
  });
});

describe("anonName / displayName", () => {
  it("gives a stable anon critter per seed", () => {
    const a = anonName("review-1");
    expect(a).toMatch(/^anon /);
    expect(anonName("review-1")).toBe(a);
  });

  it("prefers a real nickname, falling back to anon for blanks", () => {
    expect(displayName("Nightcrawler", "id-1")).toBe("Nightcrawler");
    expect(displayName("  ", "id-1")).toBe(anonName("id-1"));
    expect(displayName(null, "id-1")).toBe(anonName("id-1"));
  });
});
