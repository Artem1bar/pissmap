import { describe, expect, it } from "vitest";
import { datasetStats } from "../stats";
import { SPOTS } from "../spots";

describe("datasetStats", () => {
  const stats = datasetStats();

  it("counts the whole dataset", () => {
    expect(stats.total).toBe(SPOTS.length);
    expect(stats.total).toBeGreaterThanOrEqual(400);
  });

  it("derives consistent sub-counts", () => {
    expect(stats.byCategory.public + stats.byCategory.customers + stats.byCategory.lobby).toBe(
      stats.total,
    );
    expect(stats.open247).toBe(SPOTS.filter((s) => s.hours === "24/7").length);
    expect(stats.confirmedHours).toBeLessThanOrEqual(stats.total);
  });

  it("computes a sane confirmed-hours percentage", () => {
    expect(stats.confirmedHoursPct).toBeGreaterThan(0);
    expect(stats.confirmedHoursPct).toBeLessThanOrEqual(100);
  });

  it("counts real neighborhoods", () => {
    expect(stats.neighborhoods).toBeGreaterThan(5);
  });
});
