import { describe, expect, it } from "vitest";
import { dashBounceMax, orbPoints, tickCooldowns } from "../mechanics.js";

describe("orbPoints", () => {
  it("uses base and combo bonus with clamping", () => {
    const cfg = { scoring: { orbBase: 2, orbComboBonus: 0.5 } };
    expect(orbPoints(cfg, 1)).toBe(2);
    expect(orbPoints(cfg, 5)).toBe(4); // 2 + 0.5*(5-1)
  });
});

describe("dashBounceMax", () => {
  it("defaults to Infinity when undefined", () => {
    expect(dashBounceMax({})).toBe(Infinity);
  });

  it("uses configured integer and treats negatives as unlimited", () => {
    expect(dashBounceMax({ skills: { dash: { maxBounces: 3.7 } } })).toBe(3);
    expect(dashBounceMax({ skills: { dash: { maxBounces: -1 } } })).toBe(Infinity);
    expect(dashBounceMax({ maxBounces: 0 })).toBe(0);
  });
});

describe("tickCooldowns", () => {
  it("decrements cooldowns without going below zero", () => {
    const cds = { dash: 0.05, phase: 0.1, teleport: 0, slowField: 0.02 };
    tickCooldowns(cds, 0.06);
    expect(cds.dash).toBeCloseTo(0, 5);
    expect(cds.phase).toBeCloseTo(0.04, 5);
    expect(cds.teleport).toBe(0);
    expect(cds.slowField).toBeCloseTo(0, 5);
  });
});
