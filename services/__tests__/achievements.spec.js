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
    expect(ids).toEqual(expect.arrayContaining([
      "trail_classic_1",
      "trail_miami_950",
      "trail_world_record_3000",
      "play_10_games",
      "score_fire_cape_1000",
      "score_inferno_cape_2000",
      "no_orbs_100",
      "total_score_10000",
      "total_run_time_600"
    ]));
    expect(ids.length).toBeGreaterThan(10);
  });

  it("normalizes malformed state safely", () => {
    const normalized = normalizeAchievementState({
      unlocked: { no_orbs_100: "not-a-number", no_abilities_100: 1234, trail_ember_100: "9000" },
      progress: {
        bestScore: "1200",
        maxScoreNoOrbs: -5,
        maxScoreNoAbilities: 101.8,
        maxPerfectsInRun: 10.5,
        totalPerfects: 55.2,
        maxOrbsInRun: 33.3,
        totalOrbsCollected: "200",
        maxOrbComboInRun: 12.6,
        maxPerfectComboInRun: 9.2,
        maxPipesDodgedInRun: 400.4,
        totalPipesDodged: 2500.1,
        totalScore: 5000.9,
        maxRunTime: 64.8,
        totalRunTime: 601.2,
        totalRuns: 12.7,
        maxBrokenPipesInExplosion: 8.9,
        maxBrokenPipesInRun: -1,
        totalBrokenPipes: 250.4
      }
    });

    expect(normalized.unlocked).toEqual({ no_abilities_100: 1234, trail_ember_100: 9000 });
    expect(normalized.progress).toEqual({
      bestScore: 1200,
      maxScoreNoOrbs: 0,
      maxScoreNoAbilities: 101,
      maxPerfectsInRun: 10,
      totalPerfects: 55,
      maxOrbsInRun: 33,
      totalOrbsCollected: 200,
      maxOrbComboInRun: 12,
      maxPerfectComboInRun: 9,
      maxPipesDodgedInRun: 400,
      totalPipesDodged: 2500,
      totalScore: 5000,
      maxRunTime: 64,
      totalRunTime: 601,
      totalRuns: 12,
      maxBrokenPipesInExplosion: 8,
      maxBrokenPipesInRun: 0,
      totalBrokenPipes: 250,
      skillTotals: {
        dash: 0,
        phase: 0,
        teleport: 0,
        slowField: 0
      }
    });
  });
});

describe("validateRunStats", () => {
  it("accepts omitted stats while rejecting malformed payloads", () => {
    expect(validateRunStats()).toEqual({
      ok: true,
      stats: {
        orbsCollected: null,
        abilitiesUsed: null,
        perfects: null,
        pipesDodged: null,
        maxOrbCombo: null,
        maxPerfectCombo: null,
        brokenPipes: null,
        maxBrokenPipesInExplosion: null,
        runTime: null,
        skillUsage: null
      }
    });
    expect(validateRunStats({ orbsCollected: 2, abilitiesUsed: 1 })).toEqual({
      ok: true,
      stats: {
        orbsCollected: 2,
        abilitiesUsed: 1,
        perfects: null,
        pipesDodged: null,
        maxOrbCombo: null,
        maxPerfectCombo: null,
        brokenPipes: null,
        maxBrokenPipesInExplosion: null,
        runTime: null,
        skillUsage: null
      }
    });
    expect(validateRunStats({ orbsCollected: -1 })).toEqual({ ok: false, error: "invalid_run_stats" });
    expect(validateRunStats({ perfects: "bad" })).toEqual({ ok: false, error: "invalid_run_stats" });
    expect(validateRunStats({ pipesDodged: -5 })).toEqual({ ok: false, error: "invalid_run_stats" });
    expect(validateRunStats({ maxOrbCombo: "nope" })).toEqual({ ok: false, error: "invalid_run_stats" });
    expect(validateRunStats({ maxPerfectCombo: -2 })).toEqual({ ok: false, error: "invalid_run_stats" });
    expect(validateRunStats("bad")).toEqual({ ok: false, error: "invalid_run_stats" });
  });

  it("ignores additional run metadata while preserving counters", () => {
    expect(
      validateRunStats({
        orbsCollected: 0,
        abilitiesUsed: 0,
        perfects: 1,
        pipesDodged: 12,
        maxOrbCombo: 5,
        maxPerfectCombo: 4,
        brokenPipes: 4,
        maxBrokenPipesInExplosion: 2,
        scoreBreakdown: { orbs: { points: 99 } },
        skillUsage: { dash: 2, phase: 0, teleport: 1, slowField: 0 }
      })
    ).toEqual({
      ok: true,
      stats: {
        orbsCollected: 0,
        abilitiesUsed: 0,
        perfects: 1,
        pipesDodged: 12,
        maxOrbCombo: 5,
        maxPerfectCombo: 4,
        brokenPipes: 4,
        maxBrokenPipesInExplosion: 2,
        runTime: null,
        skillUsage: { dash: 2, phase: 0, teleport: 1, slowField: 0 }
      }
    });

    expect(validateRunStats({ skillUsage: { dash: -1 } })).toEqual({ ok: false, error: "invalid_run_stats" });
    expect(validateRunStats({ skillUsage: "bad" })).toEqual({ ok: false, error: "invalid_run_stats" });
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

    expect(unlocked.filter((id) => !id.startsWith("trail_"))).toEqual([]);
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

    const nonTrail = unlocked.filter((id) => !id.startsWith("trail_")).sort();
    expect(nonTrail).toEqual(["no_abilities_100", "no_orbs_100"].sort());
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
      const nonTrail = unlocked.filter((id) => !id.startsWith("trail_"));
      expect(nonTrail).toEqual(expected);
    });
  });

  it("accumulates per-skill totals when provided", () => {
    const { state } = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: DEFAULT_PROGRESS },
      runStats: { orbsCollected: 1, abilitiesUsed: 1, skillUsage: { dash: 2, phase: 1, teleport: 0, slowField: 3 } },
      score: 50,
      now: 123
    });

    expect(state.progress.skillTotals).toEqual({ dash: 2, phase: 1, teleport: 0, slowField: 3 });
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

    const nonTrail = unlocked.filter((id) => !id.startsWith("trail_"));
    expect(nonTrail).toEqual(["no_abilities_100"]);
    expect(state.unlocked.no_orbs_100).toBe(111);
  });

  it("unlocks orb-free runs even after prior orb-heavy attempts", () => {
    const first = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: DEFAULT_PROGRESS },
      runStats: { orbsCollected: 5, abilitiesUsed: 0 },
      score: 150,
      now: 10
    });
    expect(first.unlocked.filter((id) => !id.startsWith("trail_"))).toEqual(["no_abilities_100"]);
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
      runStats: { orbsCollected: 50, abilitiesUsed: 1, perfects: 9, runTime: 120 },
      score: 1200,
      totalScore: 9000,
      now: 42
    });
    expect(first.state.progress.totalScore).toBe(10_200);
    expect(first.state.progress.totalOrbsCollected).toBe(50);
    expect(first.state.progress.totalPerfects).toBe(9);
    expect(first.state.progress.maxPerfectsInRun).toBe(9);
    expect(first.state.progress.totalRunTime).toBe(120);
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

  it("unlocks the run-count achievement after ten games", () => {
    const { state, unlocked } = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: DEFAULT_PROGRESS },
      runStats: null,
      score: 0,
      totalRuns: 9,
      now: 44
    });

    expect(state.progress.totalRuns).toBe(10);
    expect(unlocked).toContain("play_10_games");
  });

  it("tracks pipe dodges and combo highs for run-based progress", () => {
    const { state, unlocked } = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: DEFAULT_PROGRESS },
      runStats: { pipesDodged: 520, maxOrbCombo: 20, maxPerfectCombo: 10 },
      score: 50,
      now: 55
    });

    expect(state.progress.totalPipesDodged).toBe(520);
    expect(state.progress.maxPipesDodgedInRun).toBe(520);
    expect(state.progress.maxOrbComboInRun).toBe(20);
    expect(state.progress.maxPerfectComboInRun).toBe(10);
    expect(unlocked).toEqual(expect.arrayContaining([
      "pipes_dodged_run_500",
      "orb_combo_20",
      "perfect_combo_10"
    ]));
  });

  it("tracks broken pipe totals and unlocks shatter achievements", () => {
    const first = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: DEFAULT_PROGRESS },
      runStats: { brokenPipes: 120, maxBrokenPipesInExplosion: 12 },
      score: 50,
      now: 100
    });

    expect(first.state.progress.totalBrokenPipes).toBe(120);
    expect(first.state.progress.maxBrokenPipesInRun).toBe(120);
    expect(first.state.progress.maxBrokenPipesInExplosion).toBe(12);
    expect(first.unlocked).toEqual(expect.arrayContaining([
      "pipes_broken_explosion_10",
      "pipes_broken_run_100"
    ]));

    const second = evaluateRunForAchievements({
      previous: first.state,
      runStats: { brokenPipes: 900, maxBrokenPipesInExplosion: 4 },
      score: 10,
      now: 200
    });

    expect(second.state.progress.totalBrokenPipes).toBe(1020);
    expect(second.unlocked).toContain("pipes_broken_total_1000");
  });

  it("does not unlock run-conditional achievements without telemetry", () => {
    const { unlocked, state } = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: DEFAULT_PROGRESS },
      runStats: null,
      score: 150,
      now: 10,
      totalScore: 0
    });
    expect(unlocked.filter((id) => !id.startsWith("trail_"))).toEqual([]);
    expect(state.progress.totalScore).toBe(150);
    expect(state.progress.maxScoreNoOrbs).toBe(0);
  });

  it("unlocks score-only trail achievements using bestScore progress", () => {
    const { state, unlocked } = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: { ...DEFAULT_PROGRESS, bestScore: 1200 } },
      runStats: null,
      score: 10,
      now: 10,
      totalScore: 0
    });

    expect(state.progress.bestScore).toBe(1200);
    expect(unlocked).toEqual(expect.arrayContaining(["trail_miami_950"]));
    expect(unlocked).not.toEqual(expect.arrayContaining(["run_time_60", "pipes_broken_explosion_10"]));
  });

  it("unlocks fire and inferno capes from a single best-score update", () => {
    const { state, unlocked } = evaluateRunForAchievements({
      previous: { unlocked: {}, progress: { ...DEFAULT_PROGRESS, bestScore: 999 } },
      runStats: null,
      score: 0,
      bestScore: 2100,
      now: 25
    });

    expect(state.progress.bestScore).toBe(2100);
    expect(unlocked).toEqual(expect.arrayContaining(["score_fire_cape_1000", "score_inferno_cape_2000"]));
  });

  it("can unlock every defined achievement when its requirement is satisfied", () => {
    const now = 321;
    ACHIEVEMENTS.forEach((def) => {
      const req = def.requirement || {};
      const progress = { ...DEFAULT_PROGRESS };
      const runStats = {
        orbsCollected: null,
        abilitiesUsed: null,
        perfects: null,
        pipesDodged: null,
        maxOrbCombo: null,
        maxPerfectCombo: null,
        brokenPipes: null,
        maxBrokenPipesInExplosion: null,
        runTime: null
      };

      let score = req.minScore ?? 0;
      let bestScore = req.minScore ?? 0;
      let totalScore = progress.totalScore;
      let totalRuns = progress.totalRuns;

      if (req.maxOrbs !== undefined) runStats.orbsCollected = req.maxOrbs;
      if (req.minOrbs !== undefined) runStats.orbsCollected = req.minOrbs;
      if (req.totalOrbs !== undefined) {
        progress.totalOrbsCollected = Math.max(0, req.totalOrbs - 1);
        runStats.orbsCollected = runStats.orbsCollected ?? 1;
      }

      if (req.maxAbilities !== undefined) runStats.abilitiesUsed = req.maxAbilities;

      if (req.minPerfects !== undefined) runStats.perfects = req.minPerfects;
      if (req.totalPerfects !== undefined) {
        progress.totalPerfects = Math.max(0, req.totalPerfects - 1);
        runStats.perfects = runStats.perfects ?? 1;
      }
      if (req.minOrbCombo !== undefined) {
        runStats.maxOrbCombo = req.minOrbCombo;
      }
      if (req.minPerfectCombo !== undefined) {
        runStats.maxPerfectCombo = req.minPerfectCombo;
      }
      if (req.minPipesDodged !== undefined) {
        runStats.pipesDodged = req.minPipesDodged;
      }
      if (req.totalPipesDodged !== undefined) {
        progress.totalPipesDodged = Math.max(0, req.totalPipesDodged - 1);
        runStats.pipesDodged = runStats.pipesDodged ?? 1;
      }

      if (req.totalScore !== undefined) {
        progress.totalScore = Math.max(0, req.totalScore - 1);
        totalScore = progress.totalScore;
        score = Math.max(score, 2);
      }
      if (req.minBrokenPipesInExplosion !== undefined) {
        runStats.maxBrokenPipesInExplosion = req.minBrokenPipesInExplosion;
      }
      if (req.minBrokenPipesInRun !== undefined) {
        runStats.brokenPipes = req.minBrokenPipesInRun;
      }
      if (req.totalBrokenPipes !== undefined) {
        progress.totalBrokenPipes = Math.max(0, req.totalBrokenPipes - 1);
        runStats.brokenPipes = runStats.brokenPipes ?? 1;
      }
      if (req.minRunTime !== undefined) {
        runStats.runTime = req.minRunTime;
        score = Math.max(score, 1);
      }
      if (req.totalRunTime !== undefined) {
        progress.totalRunTime = Math.max(0, req.totalRunTime - 1);
        runStats.runTime = runStats.runTime ?? 1;
      }
      if (req.totalRuns !== undefined) {
        totalRuns = Math.max(0, req.totalRuns - 1);
      }

      const previous = { unlocked: {}, progress };
      const { state, unlocked } = evaluateRunForAchievements({
        previous,
        runStats,
        score,
        bestScore,
        totalScore,
        totalRuns,
        now
      });

      expect(unlocked).toContain(def.id);
      expect(state.unlocked[def.id]).toBe(now);
    });
  });

  it("unlocks skill-usage achievements when totals are satisfied", () => {
    const definition = {
      id: "dash_master",
      title: "Dash Master",
      description: "Use dash often.",
      requirement: { minSkillUses: { dash: 3 } }
    };
    const previous = normalizeAchievementState({
      unlocked: {},
      progress: { skillTotals: { dash: 2, phase: 0, teleport: 0, slowField: 0 } }
    });
    const { unlocked, state } = evaluateRunForAchievements({
      previous,
      runStats: { skillUsage: { dash: 1, phase: 0, teleport: 0, slowField: 0 } },
      score: 0,
      definitions: [definition]
    });
    expect(unlocked).toEqual([definition.id]);
    expect(state.unlocked[definition.id]).toBeTypeOf("number");
  });
});
