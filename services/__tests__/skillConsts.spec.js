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

  it("normalizes missing payloads to zero totals", () => {
    expect(normalizeSkillTotals(null)).toEqual({ dash: 0, phase: 0, teleport: 0, slowField: 0 });
    expect(normalizeSkillTotals("bad")).toEqual({ dash: 0, phase: 0, teleport: 0, slowField: 0 });
  });

  it("floors and clamps skill totals", () => {
    expect(normalizeSkillTotals({ dash: 1.9, phase: -2, teleport: 0.4, slowField: 5.2 })).toEqual({
      dash: 1,
      phase: 0,
      teleport: 0,
      slowField: 5
    });
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

  it("requires all skills when parsing totals", () => {
    expect(parseSkillTotals({ dash: 1, phase: 2 })).toBeNull();
  });

  it("floors numeric skill totals during parsing", () => {
    expect(parseSkillTotals({ dash: 1.2, phase: 0, teleport: 0, slowField: 0 })).toEqual({
      dash: 1,
      phase: 0,
      teleport: 0,
      slowField: 0
    });
  });

  it("sums only positive finite totals", () => {
    expect(sumSkillTotals({ dash: "3", phase: -2, teleport: 1.5, slowField: "bad" })).toBe(4);
  });
});
