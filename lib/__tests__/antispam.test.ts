import { describe, expect, it } from "vitest";
import { clientIp, hasLink, hashIp, isHoneypot, tooFast } from "../antispam";

describe("isHoneypot", () => {
  it("trips only on a non-empty string", () => {
    expect(isHoneypot("http://x")).toBe(true);
    expect(isHoneypot("   ")).toBe(false);
    expect(isHoneypot("")).toBe(false);
    expect(isHoneypot(undefined)).toBe(false);
    expect(isHoneypot(0)).toBe(false);
  });
});

describe("tooFast", () => {
  it("rejects sub-threshold, non-numeric, and non-finite values", () => {
    expect(tooFast(500, 3000)).toBe(true);
    expect(tooFast(3000, 3000)).toBe(false);
    expect(tooFast(9000, 3000)).toBe(false);
    expect(tooFast("3000", 3000)).toBe(true);
    expect(tooFast(Number.NaN, 3000)).toBe(true);
    expect(tooFast(undefined, 3000)).toBe(true);
  });
});

describe("hasLink", () => {
  it("catches http(s) and bare www links, case-insensitively", () => {
    expect(hasLink("visit https://spam.io now")).toBe(true);
    expect(hasLink("WWW.Spam.Io")).toBe(true);
    expect(hasLink("clean bathroom, no notes")).toBe(false);
  });
});

describe("hashIp", () => {
  it("is deterministic, salted, and 16 hex chars", () => {
    const a = hashIp("1.2.3.4", "salt");
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(hashIp("1.2.3.4", "salt")).toBe(a);
    expect(hashIp("1.2.3.4", "other-salt")).not.toBe(a);
  });
});

describe("clientIp", () => {
  it("takes the first forwarded value, else unknown", () => {
    expect(clientIp("203.0.113.7, 10.0.0.1")).toBe("203.0.113.7");
    expect(clientIp(null)).toBe("unknown");
    expect(clientIp("")).toBe("unknown");
  });
});
