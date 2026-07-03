import { describe, expect, it } from "vitest";
import {
  BODY_MAX,
  clientIp,
  exceedsRateLimit,
  hashIp,
  MIN_COMPOSE_MS,
  NICKNAME_MAX,
  RATE_DAY_MAX,
  RATE_HOUR_MAX,
  validateReview,
  type RawReviewInput,
} from "../validate";

// A real curated spot id — validation checks membership against the dataset.
const SPOT = "washington-artillery-park";

const ok: RawReviewInput = {
  spotId: SPOT,
  rating: 4,
  body: "  Clean and always open. ",
  nickname: "  Erin  ",
  website: "",
  t: 5000,
};

describe("validateReview — happy path", () => {
  it("accepts a sane review and trims body + nickname", () => {
    const result = validateReview(ok);
    expect(result.kind).toBe("valid");
    if (result.kind !== "valid") return;
    expect(result.value).toEqual({
      spotId: SPOT,
      rating: 4,
      body: "Clean and always open.",
      nickname: "Erin",
    });
  });

  it("maps a blank nickname to null (anonymous)", () => {
    const result = validateReview({ ...ok, nickname: "   " });
    expect(result.kind === "valid" && result.value.nickname).toBeNull();
  });

  it("omitted nickname is allowed", () => {
    const { nickname, ...noNick } = ok;
    void nickname;
    const result = validateReview(noNick);
    expect(result.kind === "valid" && result.value.nickname).toBeNull();
  });
});

describe("validateReview — honeypot", () => {
  it("flags a filled honeypot and short-circuits everything else", () => {
    // Even with otherwise-garbage input, a filled honeypot wins first.
    const result = validateReview({ website: "http://spam.example", rating: 99, body: "" });
    expect(result.kind).toBe("honeypot");
  });
});

describe("validateReview — field validation (400)", () => {
  const bad: Array<[string, RawReviewInput]> = [
    ["unknown spot", { ...ok, spotId: "not-a-real-spot" }],
    ["non-string spot", { ...ok, spotId: 42 }],
    ["rating below range", { ...ok, rating: 0 }],
    ["rating above range", { ...ok, rating: 6 }],
    ["non-integer rating", { ...ok, rating: 3.5 }],
    ["string rating", { ...ok, rating: "4" }],
    ["non-string body", { ...ok, body: 123 }],
    ["empty body", { ...ok, body: "   " }],
    ["overlong body", { ...ok, body: "x".repeat(BODY_MAX + 1) }],
    ["http link in body", { ...ok, body: "great https://spam.io" }],
    ["www link in body", { ...ok, body: "see www.spam.io" }],
    ["overlong nickname", { ...ok, nickname: "x".repeat(NICKNAME_MAX + 1) }],
  ];

  it.each(bad)("rejects %s with 400", (_label, input) => {
    const result = validateReview(input);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") expect(result.status).toBe(400);
  });
});

describe("validateReview — too fast (429)", () => {
  it.each([
    ["missing t", (() => { const { t, ...rest } = ok; void t; return rest; })()],
    ["t below threshold", { ...ok, t: MIN_COMPOSE_MS - 1 }],
    ["non-number t", { ...ok, t: "5000" }],
  ] as Array<[string, RawReviewInput]>)("rejects %s with 429", (_label, input) => {
    const result = validateReview(input);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") expect(result.status).toBe(429);
  });

  it("accepts exactly at the threshold", () => {
    expect(validateReview({ ...ok, t: MIN_COMPOSE_MS }).kind).toBe("valid");
  });
});

describe("exceedsRateLimit", () => {
  it("trips at the hourly cap", () => {
    expect(exceedsRateLimit({ lastHour: RATE_HOUR_MAX, lastDay: 3 })).toBe(true);
  });
  it("trips at the daily cap", () => {
    expect(exceedsRateLimit({ lastHour: 0, lastDay: RATE_DAY_MAX })).toBe(true);
  });
  it("passes under both caps", () => {
    expect(exceedsRateLimit({ lastHour: RATE_HOUR_MAX - 1, lastDay: RATE_DAY_MAX - 1 })).toBe(false);
  });
});

describe("hashIp", () => {
  it("is deterministic, 16 hex chars, and salt-sensitive", () => {
    const a = hashIp("1.2.3.4", "salt-one");
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(hashIp("1.2.3.4", "salt-one")).toBe(a);
    expect(hashIp("1.2.3.4", "salt-two")).not.toBe(a);
    expect(hashIp("9.9.9.9", "salt-one")).not.toBe(a);
  });
});

describe("clientIp", () => {
  it("takes the first forwarded value, defaulting to unknown", () => {
    expect(clientIp("1.2.3.4, 5.6.7.8")).toBe("1.2.3.4");
    expect(clientIp("  9.9.9.9  ")).toBe("9.9.9.9");
    expect(clientIp(null)).toBe("unknown");
    expect(clientIp("")).toBe("unknown");
    expect(clientIp(" , ")).toBe("unknown");
  });
});
