import { describe, expect, it } from "vitest";
import { buildGameOverStats, GAME_OVER_STAT_VIEWS } from "../gameOverStats.js";

describe("game over stats builder", () => {
  it("uses run stats by default with clamped combo values", () => {
    const runStats = { maxOrbCombo: 4.7, maxPerfectCombo: -2, skillUsage: { dash: 2 } };
    const achievementsState = {
      progress: { maxOrbComboInRun: 12, maxPerfectComboInRun: 8, skillTotals: { dash: 99 } }
    };
    const result = buildGameOverStats({ view: GAME_OVER_STAT_VIEWS.run, runStats, achievementsState });

    expect(result.view).toBe(GAME_OVER_STAT_VIEWS.run);
    expect(result.combo).toEqual({ orb: 4, perfect: 0 });
    expect(result.skillUsage).toEqual({ dash: 2 });
    expect(result.labels.orb).toBe("Best orb combo (this run)");
    expect(result.labels.toggle).toBe("Show lifetime stats");
  });

  it("uses lifetime stats and labels when selected", () => {
    const runStats = { maxOrbCombo: 2, maxPerfectCombo: 1, skillUsage: { dash: 1 } };
    const achievementsState = {
      progress: { maxOrbComboInRun: 10.2, maxPerfectComboInRun: 8, skillTotals: { dash: 5, phase: 1 } }
    };
    const skillTotals = { dash: 12.8, phase: -2, teleport: 1 };
    const result = buildGameOverStats({ view: GAME_OVER_STAT_VIEWS.lifetime, runStats, achievementsState, skillTotals });

    expect(result.view).toBe(GAME_OVER_STAT_VIEWS.lifetime);
    expect(result.combo).toEqual({ orb: 10, perfect: 8 });
    expect(result.skillUsage).toEqual({ dash: 12, phase: 0, teleport: 1 });
    expect(result.labels.orb).toBe("Best orb combo (lifetime)");
    expect(result.labels.toggle).toBe("Show run stats");
  });

  it("falls back to achievement skill totals when explicit values are invalid", () => {
    const achievementsState = {
      progress: { maxOrbComboInRun: 3, maxPerfectComboInRun: 2, skillTotals: { dash: 4, slowField: 2 } }
    };
    const result = buildGameOverStats({
      view: GAME_OVER_STAT_VIEWS.lifetime,
      runStats: null,
      achievementsState,
      skillTotals: "invalid"
    });

    expect(result.skillUsage).toEqual({ dash: 4, slowField: 2 });
  });

  it("returns null skill usage when no totals are available", () => {
    const result = buildGameOverStats({
      view: GAME_OVER_STAT_VIEWS.lifetime,
      runStats: null,
      achievementsState: { progress: { maxOrbComboInRun: 0, maxPerfectComboInRun: 0 } },
      skillTotals: {}
    });

    expect(result.skillUsage).toBeNull();
  });

  it("falls back to run view and empty stats when data is missing", () => {
    const result = buildGameOverStats({ view: "unknown", runStats: null, achievementsState: null });

    expect(result.view).toBe(GAME_OVER_STAT_VIEWS.run);
    expect(result.combo).toEqual({ orb: 0, perfect: 0 });
    expect(result.skillUsage).toBeNull();
    expect(result.labels.mode).toBe("Run stats");
  });

  it("uses surf labels and disables lifetime stats when run stats are in surf mode", () => {
    const runStats = { mode: "surf", maxChain: 5.4, maxBigAir: 220.2 };
    const result = buildGameOverStats({ view: GAME_OVER_STAT_VIEWS.lifetime, runStats });

    expect(result.view).toBe(GAME_OVER_STAT_VIEWS.run);
    expect(result.combo).toEqual({ orb: 5, perfect: 220 });
    expect(result.skillUsage).toBeNull();
    expect(result.labels.mode).toBe("Surf stats");
    expect(result.toggleEnabled).toBe(false);
  });
});
