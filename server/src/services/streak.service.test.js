import { describe, it, expect } from "@jest/globals";
import { computeStreak, toISODateString } from "./streak.service.js";

const NOW = new Date("2026-07-16T12:00:00.000Z"); // a Thursday

describe("toISODateString", () => {
  it("formats a date as a UTC YYYY-MM-DD string", () => {
    expect(toISODateString(NOW)).toBe("2026-07-16");
  });
});

describe("computeStreak", () => {
  it("returns 0 when no days were met", () => {
    expect(computeStreak(new Set(), NOW)).toBe(0);
  });

  it("counts today when today was met", () => {
    expect(computeStreak(new Set(["2026-07-16"]), NOW)).toBe(1);
  });

  it("does not break the streak when only today is unmet", () => {
    const metDates = new Set(["2026-07-15", "2026-07-14"]);
    expect(computeStreak(metDates, NOW)).toBe(2);
  });

  it("counts consecutive days walking backward from today", () => {
    const metDates = new Set(["2026-07-16", "2026-07-15", "2026-07-14"]);
    expect(computeStreak(metDates, NOW)).toBe(3);
  });

  it("stops at the first missing day before today", () => {
    const metDates = new Set(["2026-07-16", "2026-07-15", "2026-07-13"]); // gap on the 14th
    expect(computeStreak(metDates, NOW)).toBe(2);
  });

  it("stops immediately if yesterday is missing, even if today was met", () => {
    const metDates = new Set(["2026-07-16", "2026-07-10"]);
    expect(computeStreak(metDates, NOW)).toBe(1);
  });
});
