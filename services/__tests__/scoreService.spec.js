"use strict";

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createScoreService, clampScoreDefault, mapRecordScoreError } from "../scoreService.cjs";

function buildDeps(overrides = {}) {
  const dataStore = overrides.dataStore || { recordScore: vi.fn() };
  const ensureUserSchema = overrides.ensureUserSchema || vi.fn();
  const publicUser = overrides.publicUser
    || vi.fn((u, opts) => ({ name: u.username, bestScore: u.bestScore, recordHolder: !!opts?.recordHolder }));
  const listHighscores = overrides.listHighscores || vi.fn(async () => [{ username: "a", bestScore: 1 }]);
  const trails = overrides.trails || [{ id: "classic" }];
  const icons = overrides.icons || [{ id: "hi_vis_orange" }];
  const pipeTextures = overrides.pipeTextures || [{ id: "basic" }];
  const unlockables = overrides.unlockables || [];
  const syncUnlockablesState = overrides.syncUnlockablesState
    || vi.fn((state) => ({ state: state || { unlocked: {} }, unlocked: [] }));
  const normalizeAchievements = overrides.normalizeAchievements || ((state) => state || { unlocked: {}, progress: {} });
  const validateRunStats =
    overrides.validateRunStats || (() => ({
      ok: true,
      stats: {
        orbsCollected: null,
        abilitiesUsed: null,
        perfects: null,
        runTime: null,
        skillUsage: null
      }
    }));
  const evaluateAchievements =
    overrides.evaluateAchievements || vi.fn(({ previous }) => ({ state: previous || { unlocked: {}, progress: {} }, unlocked: [] }));
  const buildAchievementsPayload =
    overrides.buildAchievementsPayload || ((user, unlocked) => ({ state: user.achievements || {}, unlocked, definitions: [] }));
  return {
    dataStore,
    ensureUserSchema,
    publicUser,
    listHighscores,
    trails,
    icons,
    pipeTextures,
    unlockables,
    syncUnlockablesState,
    normalizeAchievements,
    validateRunStats,
    evaluateAchievements,
    buildAchievementsPayload
  };
}

describe("scoreService", () => {
  let deps;

  beforeEach(() => {
    deps = buildDeps();
  });

  it("throws when required dependencies are missing", () => {
    expect(() => createScoreService({})).toThrow("recordScore_required");
    expect(() => createScoreService({ dataStore: { recordScore: vi.fn() } })).toThrow("ensureUserSchema_required");
    expect(() =>
      createScoreService({
        dataStore: { recordScore: vi.fn() },
        ensureUserSchema: () => {},
        publicUser: null,
        listHighscores: () => []
      })
    ).toThrow("publicUser_required");
    expect(() =>
      createScoreService({
        dataStore: { recordScore: vi.fn() },
        ensureUserSchema: () => {},
        publicUser: () => {},
        listHighscores: null
      })
    ).toThrow("listHighscores_required");
  });

  it("rejects missing user", async () => {
    const svc = createScoreService(deps);
    const res = await svc.submitScore(null, 10);
    expect(res).toEqual({ ok: false, status: 401, error: "unauthorized" });
    expect(deps.dataStore.recordScore).not.toHaveBeenCalled();
  });

  it("rejects invalid score payloads", async () => {
    const svc = createScoreService(deps);
    const badInputs = [NaN, "abc", null, undefined, {}, [], { score: 10 }];
    for (const val of badInputs) {
      const res = await svc.submitScore({ key: "u" }, val);
      expect(res).toEqual({ ok: false, status: 400, error: "invalid_score" });
    }
    expect(deps.dataStore.recordScore).not.toHaveBeenCalled();
  });

  it("accepts numeric score strings and clamps them", async () => {
    const user = { key: "u", username: "Clamp" };
    const updated = { ...user, bestScore: 7, achievements: { unlocked: {}, progress: {} } };
    const clampScore = vi.fn(() => 7);
    deps.dataStore.recordScore.mockResolvedValue(updated);

    const svc = createScoreService({ ...deps, clampScore });
    const res = await svc.submitScore(user, "12");

    expect(clampScore).toHaveBeenCalledWith(12);
    expect(deps.dataStore.recordScore).toHaveBeenCalledWith(
      user,
      7,
      expect.objectContaining({ bustercoinsEarned: 0 })
    );
    expect(res.ok).toBe(true);
  });

  it("rejects non-finite bustercoin payloads", async () => {
    const svc = createScoreService(deps);
    const res = await svc.submitScore({ key: "u" }, 10, "bad");
    expect(res).toEqual({ ok: false, status: 400, error: "invalid_bustercoins" });
  });

  it("treats null bustercoin payloads as zero", async () => {
    const user = { key: "u", username: "Coinless" };
    const updated = { ...user, bestScore: 10, achievements: { unlocked: {}, progress: {} } };
    deps.dataStore.recordScore.mockResolvedValue(updated);

    const svc = createScoreService(deps);
    const res = await svc.submitScore(user, 10, null);

    expect(res.ok).toBe(true);
    expect(deps.dataStore.recordScore).toHaveBeenCalledWith(
      user,
      10,
      expect.objectContaining({ bustercoinsEarned: 0 })
    );
  });

  it("clamps, persists, and returns user + highscores", async () => {
    const user = { key: "u", username: "User" };
    const updated = { ...user, bestScore: 123, totalScore: 200, achievements: { unlocked: {}, progress: {} } };
    deps.dataStore.recordScore.mockResolvedValue(updated);

    const svc = createScoreService(deps);
    const res = await svc.submitScore(user, 123.9);

    expect(deps.dataStore.recordScore).toHaveBeenCalledWith(
      user,
      123,
      expect.objectContaining({ bustercoinsEarned: 0, runTime: null, unlockables: expect.anything() })
    );
    expect(deps.ensureUserSchema).toHaveBeenCalledWith(updated, { recordHolder: false });
    expect(deps.listHighscores).toHaveBeenCalled();
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      user: { name: "User", bestScore: 123, recordHolder: false },
      trails: deps.trails,
      icons: deps.icons,
      pipeTextures: deps.pipeTextures,
      highscores: [{ username: "a", bestScore: 1 }]
    });
    expect(res.body.achievements).toBeTruthy();
  });

  it("syncs unlockables based on the updated score", async () => {
    const user = { key: "u", username: "Sync", bestScore: 5, ownedIcons: [] };
    const updated = { ...user, bestScore: 10, achievements: { unlocked: {}, progress: {} } };
    const syncUnlockablesState = vi.fn(() => ({ state: { unlocked: { "pipe_texture:basic": 123 } }, unlocked: [] }));
    const localDeps = buildDeps({
      syncUnlockablesState,
      unlockables: [{ id: "basic", type: "pipe_texture", unlock: { type: "free" } }]
    });
    localDeps.dataStore.recordScore.mockResolvedValue(updated);
    const svc = createScoreService(localDeps);

    const res = await svc.submitScore(user, 10);
    expect(res.ok).toBe(true);
    expect(syncUnlockablesState).toHaveBeenCalledWith(
      user.unlockables,
      expect.any(Array),
      expect.objectContaining({ bestScore: 10, ownedIds: [] })
    );
  });

  it("accepts unlockable providers as functions", async () => {
    const user = { key: "u", username: "Dyn" };
    const updated = { ...user, bestScore: 2, achievements: { unlocked: {}, progress: {} } };
    const unlockables = vi.fn(() => [{ id: "basic", type: "pipe_texture", unlock: { type: "free" } }]);
    const syncUnlockablesState = vi.fn(() => ({ state: { unlocked: {} }, unlocked: [] }));
    const localDeps = buildDeps({ unlockables, syncUnlockablesState });
    localDeps.dataStore.recordScore.mockResolvedValue(updated);

    const svc = createScoreService(localDeps);
    const res = await svc.submitScore(user, 2);

    expect(res.ok).toBe(true);
    expect(unlockables).toHaveBeenCalled();
    expect(syncUnlockablesState).toHaveBeenCalledWith(
      undefined,
      expect.any(Array),
      expect.objectContaining({ bestScore: 2 })
    );
  });

  it("marks the submitting user as the record holder when appropriate", async () => {
    const user = { key: "u", username: "champ" };
    const updated = { ...user, bestScore: 9000, achievements: { unlocked: {}, progress: {} } };
    deps.dataStore.recordScore.mockResolvedValue(updated);
    deps.listHighscores = vi.fn(async () => [{ username: "champ", bestScore: 9000 }]);
    deps.publicUser = vi.fn((u, opts) => ({ user: u.username, recordHolder: opts?.recordHolder }));

    const svc = createScoreService(deps);
    const res = await svc.submitScore(user, 9000, 4);

    expect(deps.ensureUserSchema).toHaveBeenCalledWith(updated, { recordHolder: true });
    expect(res.body.user).toEqual({ user: "champ", recordHolder: true });
    expect(deps.dataStore.recordScore).toHaveBeenCalledWith(
      user,
      9000,
      expect.objectContaining({ bustercoinsEarned: 4 })
    );
  });

  it("validates and clamps bustercoin payloads before persisting", async () => {
    const user = { key: "u", username: "coinster" };
    const updated = { ...user, bestScore: 10, bustercoins: 3, achievements: { unlocked: {}, progress: {} } };
    deps.dataStore.recordScore.mockResolvedValue(updated);

    const svc = createScoreService(deps);
    const res = await svc.submitScore(user, 10, 2.9);

    expect(res.ok).toBe(true);
    expect(deps.dataStore.recordScore).toHaveBeenCalledWith(
      user,
      10,
      expect.objectContaining({ bustercoinsEarned: 2 })
    );

    const negative = await svc.submitScore(user, 10, -5);
    expect(negative.ok).toBe(false);
    expect(negative.status).toBe(400);
    expect(negative.error).toBe("invalid_bustercoins");
  });

  it("returns dynamic trail and icon catalogs when provided as functions", async () => {
    const user = { key: "u", username: "DynCatalog" };
    const updated = { ...user, bestScore: 10, achievements: { unlocked: {}, progress: {} } };
    const trails = vi.fn(() => [{ id: "t1" }]);
    const icons = vi.fn(() => [{ id: "i1" }]);
    const pipeTextures = vi.fn(() => [{ id: "p1" }]);
    const localDeps = buildDeps({ trails, icons, pipeTextures });
    localDeps.dataStore.recordScore.mockResolvedValue(updated);

    const svc = createScoreService(localDeps);
    const res = await svc.submitScore(user, 10);

    expect(res.ok).toBe(true);
    expect(trails).toHaveBeenCalled();
    expect(icons).toHaveBeenCalled();
    expect(pipeTextures).toHaveBeenCalled();
    expect(res.body.trails).toEqual([{ id: "t1" }]);
    expect(res.body.icons).toEqual([{ id: "i1" }]);
    expect(res.body.pipeTextures).toEqual([{ id: "p1" }]);
  });

  it("rejects invalid run metadata payloads", async () => {
    const svc = createScoreService({
      ...deps,
      validateRunStats: () => ({ ok: false, error: "invalid_run_stats" })
    });
    const res = await svc.submitScore({ key: "u" }, 10, 0, "oops");
    expect(res).toEqual({ ok: false, status: 400, error: "invalid_run_stats" });
    expect(deps.dataStore.recordScore).not.toHaveBeenCalled();
  });

  it("passes validated run stats into achievement evaluation and payload", async () => {
    const user = { key: "u", username: "achiever", totalScore: 50 };
    const updated = { ...user, bestScore: 101, achievements: { unlocked: { a: 1 }, progress: {} } };
    const evaluateAchievements = vi.fn(() => ({
      state: { unlocked: { a: 1, b: 2 }, progress: { maxScoreNoOrbs: 120 } },
      unlocked: ["b"]
    }));
    const buildAchievementsPayload = vi.fn(() => ({ unlocked: ["b"], definitions: ["defs"], state: updated.achievements }));
    const recordScore = vi.fn(async () => updated);
    const svc = createScoreService({
      ...deps,
      dataStore: { recordScore },
      evaluateAchievements,
      buildAchievementsPayload,
      validateRunStats: () => ({
        ok: true,
        stats: {
          orbsCollected: 0,
          abilitiesUsed: 0,
          runTime: 45,
          skillUsage: { dash: 1, phase: 0, teleport: 0, slowField: 0 }
        }
      })
    });

    const res = await svc.submitScore(user, 101, 0, { orbsCollected: 0, abilitiesUsed: 0, skillUsage: { dash: 1, phase: 0, teleport: 0, slowField: 0 } });

    expect(evaluateAchievements).toHaveBeenCalledWith({
      previous: { unlocked: {}, progress: {} },
      runStats: { orbsCollected: 0, abilitiesUsed: 0, runTime: 45, skillUsage: { dash: 1, phase: 0, teleport: 0, slowField: 0 } },
      score: 101,
      totalScore: 50,
      bestScore: undefined
    });
    expect(res.ok).toBe(true);
    expect(recordScore).toHaveBeenCalledWith(
      user,
      101,
      expect.objectContaining({ runTime: 45, skillUsage: { dash: 1, phase: 0, teleport: 0, slowField: 0 } })
    );
    expect(res.body.achievements).toEqual({ unlocked: ["b"], definitions: ["defs"], state: updated.achievements });
  });

  it("normalizes missing achievements before evaluation", async () => {
    const user = { key: "u", username: "norm" };
    const updated = { ...user, bestScore: 10, achievements: { unlocked: {}, progress: {} } };
    const normalizeAchievements = vi.fn(() => ({ unlocked: { a: 1 }, progress: {} }));
    const evaluateAchievements = vi.fn(() => ({ state: { unlocked: { a: 1 }, progress: {} }, unlocked: [] }));
    const localDeps = buildDeps({ normalizeAchievements, evaluateAchievements });
    localDeps.dataStore.recordScore.mockResolvedValue(updated);

    const svc = createScoreService(localDeps);
    const res = await svc.submitScore(user, 10);

    expect(res.ok).toBe(true);
    expect(normalizeAchievements).toHaveBeenCalledWith(undefined);
    expect(evaluateAchievements).toHaveBeenCalledWith(expect.objectContaining({ previous: { unlocked: { a: 1 }, progress: {} } }));
  });

  it("passes unlockable state through to recordScore", async () => {
    const user = { key: "u", username: "unlock" };
    const updated = { ...user, bestScore: 10, achievements: { unlocked: {}, progress: {} } };
    const syncUnlockablesState = vi.fn(() => ({ state: null, unlocked: [] }));
    const localDeps = buildDeps({ syncUnlockablesState });
    localDeps.dataStore.recordScore.mockResolvedValue(updated);

    const svc = createScoreService(localDeps);
    const res = await svc.submitScore(user, 10);

    expect(res.ok).toBe(true);
    expect(localDeps.dataStore.recordScore).toHaveBeenCalledWith(
      user,
      10,
      expect.objectContaining({ unlockables: null })
    );
  });

  it("maps recordScore failures to service errors", async () => {
    const user = { key: "u", username: "User" };
    const error = new Error("boom");
    deps.dataStore.recordScore.mockRejectedValue(error);

    const svc = createScoreService(deps);
    const res = await svc.submitScore(user, 10);

    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
    expect(res.error).toBe("score_persist_failed");
  });

  it("returns unauthorized when recordScore reports missing user keys", async () => {
    const user = { key: "u", username: "nope" };
    deps.dataStore.recordScore.mockRejectedValue({ code: "user_key_required" });

    const svc = createScoreService(deps);
    const res = await svc.submitScore(user, 5);

    expect(res).toEqual({ ok: false, status: 401, error: "unauthorized" });
  });

  it("treats empty highscores as non-record holder", async () => {
    const user = { key: "u", username: "none" };
    const updated = { ...user, bestScore: 5, achievements: { unlocked: {}, progress: {} } };
    deps.dataStore.recordScore.mockResolvedValue(updated);
    deps.listHighscores = vi.fn(async () => []);

    const svc = createScoreService(deps);
    const res = await svc.submitScore(user, 5);

    expect(res.ok).toBe(true);
    expect(res.body.user.recordHolder).toBe(false);
    expect(deps.ensureUserSchema).toHaveBeenCalledWith(updated, { recordHolder: false });
  });
});

describe("clampScoreDefault", () => {
  it("floors, clamps, and sanitizes scores", () => {
    expect(clampScoreDefault(10.9)).toBe(10);
    expect(clampScoreDefault(-5)).toBe(0);
    expect(clampScoreDefault(1_000_000_500)).toBe(1_000_000_000);
    expect(clampScoreDefault("abc")).toBe(0);
  });
});

describe("mapRecordScoreError", () => {
  it("returns unauthorized for user_key_required", () => {
    expect(mapRecordScoreError(new Error("user_key_required"))).toEqual({ status: 401, error: "unauthorized" });
  });

  it("defaults to persistence failure", () => {
    expect(mapRecordScoreError(new Error("other"))).toEqual({ status: 503, error: "score_persist_failed" });
  });
});
