import { describe, expect, it } from "vitest";
import { formatWorldwideRuns, normalizeWorldwideRuns } from "../worldwideStats.js";

describe("worldwide stats formatting", () => {
  it("normalizes non-numeric totals to zero", () => {
    expect(normalizeWorldwideRuns()).toBe(0);
    expect(normalizeWorldwideRuns("bad")).toBe(0);
    expect(normalizeWorldwideRuns(NaN)).toBe(0);
  });

  it("floors and clamps totals before formatting", () => {
    expect(normalizeWorldwideRuns(-3)).toBe(0);
    expect(normalizeWorldwideRuns(12.9)).toBe(12);
    expect(formatWorldwideRuns(1200)).toBe("Games Played (Worldwide): 1,200");
  });
});
