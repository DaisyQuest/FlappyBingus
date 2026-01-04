import { describe, it, expect } from "vitest";
import { buildRunStats } from "../gameStats.js";

describe("buildRunStats", () => {
  it("normalizes run stat values and score breakdown buckets", () => {
    const result = buildRunStats({
      runStats: {
        orbsCollected: "5.9",
        abilitiesUsed: -2,
        perfects: "nope",
        pipesDodged: 3.2,
        maxOrbCombo: "7",
        maxPerfectCombo: null,
        brokenPipes: undefined,
        maxBrokenPipesInExplosion: Infinity,
        skillUsage: {
          dash: 1.9,
          phase: -1,
          teleport: "bad",
          slowField: 4.1
        },
        scoreBreakdown: {
          orbs: { points: "10.5", count: 2.2 },
          perfects: { points: -1, count: "3" },
          pipes: null,
          other: { points: NaN, count: Infinity }
        }
      },
      timeAlive: "12.8",
      score: -5
    });

    expect(result).toEqual({
      orbsCollected: 5,
      abilitiesUsed: 0,
      perfects: 0,
      pipesDodged: 3,
      maxOrbCombo: 7,
      maxPerfectCombo: 0,
      brokenPipes: 0,
      maxBrokenPipesInExplosion: 0,
      runTime: 12,
      totalScore: 0,
      skillUsage: {
        dash: 1,
        phase: 0,
        teleport: 0,
        slowField: 4
      },
      scoreBreakdown: {
        orbs: { points: 10, count: 2 },
        perfects: { points: 0, count: 3 },
        pipes: { points: 0, count: 0 },
        other: { points: 0, count: 0 }
      }
    });
  });

  it("fills missing values with zeroed defaults", () => {
    const result = buildRunStats();

    expect(result).toEqual({
      orbsCollected: 0,
      abilitiesUsed: 0,
      perfects: 0,
      pipesDodged: 0,
      maxOrbCombo: 0,
      maxPerfectCombo: 0,
      brokenPipes: 0,
      maxBrokenPipesInExplosion: 0,
      runTime: 0,
      totalScore: 0,
      skillUsage: {
        dash: 0,
        phase: 0,
        teleport: 0,
        slowField: 0
      },
      scoreBreakdown: {
        orbs: { points: 0, count: 0 },
        perfects: { points: 0, count: 0 },
        pipes: { points: 0, count: 0 },
        other: { points: 0, count: 0 }
      }
    });
  });
});
