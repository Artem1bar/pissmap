import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminCookie,
  ADMIN_COOKIE,
  adminToken,
  cookieAuthorized,
  isAdminEnabled,
  readCookie,
  requestAuthorized,
  secretMatches,
} from "../auth";

const SECRET = "super-secret-moderator-key";
const original = process.env.ADMIN_SECRET;

beforeEach(() => {
  process.env.ADMIN_SECRET = SECRET;
});
afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_SECRET;
  else process.env.ADMIN_SECRET = original;
});

describe("admin enablement", () => {
  it("is enabled only when ADMIN_SECRET is set", () => {
    expect(isAdminEnabled()).toBe(true);
    delete process.env.ADMIN_SECRET;
    expect(isAdminEnabled()).toBe(false);
    expect(adminToken()).toBeNull();
    expect(secretMatches(SECRET)).toBe(false);
  });
});

describe("secretMatches", () => {
  it("accepts the exact secret and rejects everything else", () => {
    expect(secretMatches(SECRET)).toBe(true);
    expect(secretMatches("wrong")).toBe(false);
    expect(secretMatches(SECRET + "x")).toBe(false);
    expect(secretMatches("")).toBe(false);
  });
});

describe("cookieAuthorized", () => {
  it("accepts the hashed token and rejects tampering", () => {
    const token = adminToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(cookieAuthorized(token)).toBe(true);
    expect(cookieAuthorized("nope")).toBe(false);
    expect(cookieAuthorized(null)).toBe(false);
    expect(cookieAuthorized(SECRET)).toBe(false); // the raw secret is not the token
  });
});

describe("readCookie", () => {
  it("extracts a named cookie from a header", () => {
    expect(readCookie("a=1; pissmap_admin=xyz; b=2", ADMIN_COOKIE)).toBe("xyz");
    expect(readCookie("pissmap_admin=only", ADMIN_COOKIE)).toBe("only");
    expect(readCookie("other=1", ADMIN_COOKIE)).toBeNull();
    expect(readCookie(null, ADMIN_COOKIE)).toBeNull();
  });
});

describe("requestAuthorized", () => {
  it("authorizes a request carrying the valid token cookie", () => {
    const token = adminToken()!;
    const authed = new Request("http://x/api/admin/reviews", {
      headers: { cookie: `${ADMIN_COOKIE}=${token}` },
    });
    const anon = new Request("http://x/api/admin/reviews");
    expect(requestAuthorized(authed)).toBe(true);
    expect(requestAuthorized(anon)).toBe(false);
  });
});

describe("adminCookie", () => {
  it("is HttpOnly, scoped, and time-boxed", () => {
    const cookie = adminCookie("token123", 3600);
    expect(cookie).toContain("pissmap_admin=token123");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=3600");
  });
});
