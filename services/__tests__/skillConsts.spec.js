"use strict";

import { describe, expect, it } from "vitest";

import { DEFAULT_SKILL_TOTALS, normalizeSkillTotals, parseSkillTotals, sumSkillTotals } from "../skillConsts.cjs";

describe("skill constants helpers", () => {
  it("normalizes and sums skill totals safely", () => {
    expect(normalizeSkillTotals({ dash: 2, phase: "3", teleport: -1, slowField: 1 })).toEqual({
      dash: 2,
      phase: 3,
      teleport: 0,
      slowField: 1
    });
    expect(sumSkillTotals({ dash: 1, phase: 2, teleport: 3, slowField: 4 })).toBe(10);
    expect(sumSkillTotals()).toBe(0);
    expect(DEFAULT_SKILL_TOTALS).toEqual({ dash: 0, phase: 0, teleport: 0, slowField: 0 });
  });

  it("rejects invalid payloads when parsing", () => {
    expect(parseSkillTotals(null)).toBeNull();
    expect(parseSkillTotals("bad")).toBeNull();
    expect(parseSkillTotals({ dash: -1 })).toBeNull();
    expect(parseSkillTotals({ dash: 1, phase: 0, teleport: 0, slowField: 0 })).toEqual({
      dash: 1,
      phase: 0,
      teleport: 0,
      slowField: 0
    });
  });
});
