import { describe, expect, it } from "vitest";

describe("achievement service helpers", () => {
  it("accepts run time stats and rejects invalid values", async () => {
    const { validateRunStats } = await import("../services/achievements.cjs");

    const valid = validateRunStats({ runTime: 75, orbsCollected: 2 });
    expect(valid.ok).toBe(true);
    expect(valid.stats.runTime).toBe(75);

    const invalid = validateRunStats({ runTime: -1 });
    expect(invalid.ok).toBe(false);
    expect(invalid.error).toBe("invalid_run_stats");
  });

  it("tracks best run time and unlocks the one-minute achievement", async () => {
    const { evaluateRunForAchievements } = await import("../services/achievements.cjs");

    const result = evaluateRunForAchievements({
      previous: null,
      runStats: { runTime: 65 },
      score: 0
    });

    expect(result.state.progress.maxRunTime).toBe(65);
    expect(result.state.progress.totalRunTime).toBe(65);
    expect(result.unlocked).toContain("run_time_60");

    const locked = evaluateRunForAchievements({
      previous: result.state,
      runStats: { runTime: 30 },
      score: 0
    });
    expect(locked.unlocked).not.toContain("run_time_60");
    expect(locked.state.progress.maxRunTime).toBe(65);
    expect(locked.state.progress.totalRunTime).toBe(95);
  });

  it("unlocks the total-time achievement after 10 minutes of cumulative play", async () => {
    const { evaluateRunForAchievements } = await import("../services/achievements.cjs");

    const first = evaluateRunForAchievements({
      previous: null,
      runStats: { runTime: 540 },
      score: 0
    });
    expect(first.unlocked).not.toContain("total_run_time_600");
    expect(first.state.progress.totalRunTime).toBe(540);

    const second = evaluateRunForAchievements({
      previous: first.state,
      runStats: { runTime: 60 },
      score: 0
    });
    expect(second.state.progress.totalRunTime).toBe(600);
    expect(second.unlocked).toContain("total_run_time_600");
  });
});
