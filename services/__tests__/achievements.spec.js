"use strict";

import { describe, it, expect, vi } from "vitest";
import {
  ACHIEVEMENTS,
  DEFAULT_PROGRESS,
  normalizeAchievementState,
  validateRunStats,
  evaluateRunForAchievements
} from "../achievements.cjs";

describe("achievements definitions", () => {
  it("exposes the expected default set", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(ids).toContain("no_orbs_100");
    expect(ids).toContain("no_abilities_100");
    expect(ids).toContain("total_score_10000");
    expect(ids).toContain("perfects_run_10");
    expect(ids).toContain("perfects_total_100");
    expect(ids).toContain("orbs_run_100");
    expect(ids).toContain("orbs_total_2000");
  });

  it("normalizes malformed state safely", () => {
    const normalized = normalizeAchievementState({
      unlocked: { no_orbs_100: "not-a-number", no_abilities_100: 1234 },
      progress: {
        maxScoreNoOrbs: -5,
        maxScoreNoAbilities: 101.8,
        maxPerfectsInRun: 10.5,
        totalPerfects: 55.2,
        maxOrbsInRun: 33.3,
        totalOrbsCollected: "200",
        totalScore: 5000.9
      }
    });

    expect(normalized.unlocked).toEqual({ no_abilities_100: 1234 });
    expect(normalized.progress).toEqual({
      maxScoreNoOrbs: 0,
      maxScoreNoAbilities: 101,
      maxPerfectsInRun: 10,
      totalPerfects: 55,
      maxOrbsInRun: 33,
      totalOrbsCollected: 200,
      totalScore: 5000
    });
  });
});

describe("validateRunStats", () => {
  it("accepts omitted stats while rejecting malformed payloads", () => {
    expect(validateRunStats()).toEqual({ ok: true, stats: { orbsCollected: null, abilitiesUsed: null, perfects: null } });
    expect(validateRunStats({ orbsCollected: 2, abilitiesUsed: 1 })).toEqual({
      ok: true,
      stats: { orbsCollected: 2, abilitiesUsed: 1, perfects: null }
    });
    expect(validateRunStats({ orbsCollected: -1 })).toEqual({ ok: false, error: "invalid_run_stats" });
    expect(validateRunStats({ perfects: "bad" })).toEqual({ ok: false, error: "invalid_run_stats" });
    expect(validateRunStats("bad")).toEqual({ ok: false, error: "invalid_run_stats" });
  });

  it("ignores additional run metadata while preserving counters", () => {
    expect(
      validateRunStats({
        orbsCollected: 0,
        abilitiesUsed: 0,
        perfects: 1,
        scoreBreakdown: { orbs: { points: 99 } }
      })
    ).toEqual({ ok: true, stats: { orbsCollected: 0, abilitiesUsed: 0, perfects: 1 } });
  });
});

describe("evaluateRunForAchievements", () => {
  it("tracks score progress only when the relevant constraint is met", () => {
    const { state, unlocked } = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: { ...DEFAULT_PROGRESS, maxScoreNoOrbs: 50 } },
      runStats: { orbsCollected: 0, abilitiesUsed: 2 },
      score: 80,
      now: 500
    });

    expect(unlocked).toEqual([]);
    expect(state.progress.maxScoreNoOrbs).toBe(80);
    expect(state.progress.maxScoreNoAbilities).toBe(0);
    expect(state.progress.totalScore).toBe(80);
  });

  it("unlocks both achievements when the player avoids orbs and abilities", () => {
    const now = 1_000;
    const { state, unlocked } = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: DEFAULT_PROGRESS },
      runStats: { orbsCollected: 0, abilitiesUsed: 0, perfects: 0 },
      score: 100,
      now
    });

    expect(unlocked.sort()).toEqual(["no_abilities_100", "no_orbs_100"].sort());
    expect(state.unlocked.no_abilities_100).toBe(now);
    expect(state.unlocked.no_orbs_100).toBe(now);
  });

  it("unlocks ability-free and orb-free achievements independently across scenarios", () => {
    const combos = [
      { stats: { orbsCollected: 5, abilitiesUsed: 0 }, expected: ["no_abilities_100"] },
      { stats: { orbsCollected: 0, abilitiesUsed: 3 }, expected: ["no_orbs_100"] },
      { stats: { orbsCollected: 4, abilitiesUsed: 2 }, expected: [] }
    ];

    combos.forEach(({ stats, expected }) => {
      const { unlocked } = evaluateRunForAchievements({
        previous: { unlocked: {}, progress: DEFAULT_PROGRESS },
        runStats: stats,
        score: 100,
        now: 2_000
      });
      expect(unlocked).toEqual(expected);
    });
  });

  it("does not regress unlocked achievements", () => {
    const initial = {
      unlocked: { no_orbs_100: 111 },
      progress: { maxScoreNoOrbs: 200, maxScoreNoAbilities: 0 }
    };
    const { state, unlocked } = evaluateRunForAchievements({
      previous: initial,
      runStats: { orbsCollected: 0, abilitiesUsed: 0 },
      score: 150,
      now: 10_000
    });

    expect(unlocked).toEqual(["no_abilities_100"]);
    expect(state.unlocked.no_orbs_100).toBe(111);
  });

  it("unlocks orb-free runs even after prior orb-heavy attempts", () => {
    const first = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: DEFAULT_PROGRESS },
      runStats: { orbsCollected: 5, abilitiesUsed: 0 },
      score: 150,
      now: 10
    });
    expect(first.unlocked).toEqual(["no_abilities_100"]);
    expect(first.state.progress.maxScoreNoOrbs).toBe(0);

    const clean = evaluateRunForAchievements({
      previous: first.state,
      runStats: { orbsCollected: 0, abilitiesUsed: 0, perfects: 2 },
      score: 175,
      now: 20
    });

    expect(clean.unlocked).toContain("no_orbs_100");
    expect(clean.state.progress.maxScoreNoOrbs).toBe(175);
    expect(clean.state.progress.totalPerfects).toBe(2);
  });

  it("tracks cumulative totals and per-run bests for perfects and orbs", () => {
    const first = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: { ...DEFAULT_PROGRESS, totalScore: 9000 } },
      runStats: { orbsCollected: 50, abilitiesUsed: 1, perfects: 9 },
      score: 1200,
      totalScore: 9000,
      now: 42
    });
    expect(first.state.progress.totalScore).toBe(10_200);
    expect(first.state.progress.totalOrbsCollected).toBe(50);
    expect(first.state.progress.totalPerfects).toBe(9);
    expect(first.state.progress.maxPerfectsInRun).toBe(9);
    expect(first.unlocked).toContain("total_score_10000");

    const second = evaluateRunForAchievements({
      previous: first.state,
      runStats: { orbsCollected: 120, abilitiesUsed: 2, perfects: 15 },
      score: 100,
      totalScore: first.state.progress.totalScore,
      now: 100
    });

    expect(second.state.progress.totalOrbsCollected).toBe(170);
    expect(second.state.progress.maxOrbsInRun).toBe(120);
    expect(second.state.progress.totalPerfects).toBe(24);
    expect(second.unlocked).toContain("perfects_run_10");
  });

  it("unlocks cumulative orb and perfect achievements", () => {
    const { unlocked, state } = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: DEFAULT_PROGRESS },
      runStats: { orbsCollected: 2000, abilitiesUsed: 5, perfects: 120 },
      score: 10,
      now: 10,
      totalScore: 0
    });

    expect(unlocked).toEqual(expect.arrayContaining(["orbs_total_2000", "perfects_total_100"]));
    expect(state.unlocked.orbs_total_2000).toBe(10);
    expect(state.unlocked.perfects_total_100).toBe(10);
  });

  it("does not unlock run-conditional achievements without telemetry", () => {
    const { unlocked, state } = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: DEFAULT_PROGRESS },
      runStats: null,
      score: 150,
      now: 10,
      totalScore: 0
    });
    expect(unlocked).toEqual([]);
    expect(state.progress.totalScore).toBe(150);
    expect(state.progress.maxScoreNoOrbs).toBe(0);
  });
});
