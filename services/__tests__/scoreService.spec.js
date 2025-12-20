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
  const sanitizeReplayPayload = overrides.sanitizeReplayPayload || vi.fn(() => ({ ok: false, error: "disabled" }));
  const saveReplayForBest = overrides.saveReplayForBest || vi.fn(async () => null);
  return { dataStore, ensureUserSchema, publicUser, listHighscores, trails, sanitizeReplayPayload, saveReplayForBest };
}

describe("scoreService", () => {
  let deps;

  beforeEach(() => {
    deps = buildDeps();
  });

  it("rejects missing user", async () => {
    const svc = createScoreService(deps);
    const res = await svc.submitScore(null, 10);
    expect(res).toEqual({ ok: false, status: 401, error: "unauthorized" });
    expect(deps.dataStore.recordScore).not.toHaveBeenCalled();
  });

  it("rejects invalid score payloads", async () => {
    const svc = createScoreService(deps);
    const badInputs = [NaN, "abc", null, undefined, {}, []];
    for (const val of badInputs) {
      const res = await svc.submitScore({ key: "u" }, val);
      expect(res).toEqual({ ok: false, status: 400, error: "invalid_score" });
    }
    expect(deps.dataStore.recordScore).not.toHaveBeenCalled();
  });

  it("clamps, persists, and returns user + highscores", async () => {
    const user = { key: "u", username: "User" };
    const updated = { ...user, bestScore: 123, totalScore: 200 };
    deps.dataStore.recordScore.mockResolvedValue(updated);

    const svc = createScoreService(deps);
    const res = await svc.submitScore(user, 123.9);

    expect(deps.dataStore.recordScore).toHaveBeenCalledWith(user, 123);
    expect(deps.ensureUserSchema).toHaveBeenCalledWith(updated, { recordHolder: false });
    expect(deps.listHighscores).toHaveBeenCalled();
    expect(res).toEqual({
      ok: true,
      status: 200,
      body: {
        ok: true,
        user: { name: "User", bestScore: 123, recordHolder: false },
        trails: deps.trails,
        highscores: [{ username: "a", bestScore: 1 }],
        replaySaved: false,
        replayError: null
      }
    });
  });

  it("marks the submitting user as the record holder when appropriate", async () => {
    const user = { key: "u", username: "champ" };
    const updated = { ...user, bestScore: 9000 };
    deps.dataStore.recordScore.mockResolvedValue(updated);
    deps.listHighscores = vi.fn(async () => [{ username: "champ", bestScore: 9000 }]);
    deps.publicUser = vi.fn((u, opts) => ({ user: u.username, recordHolder: opts?.recordHolder }));

    const svc = createScoreService(deps);
    const res = await svc.submitScore(user, 9000);

    expect(deps.ensureUserSchema).toHaveBeenCalledWith(updated, { recordHolder: true });
    expect(res.body.user).toEqual({ user: "champ", recordHolder: true });
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

  it("saves replay payloads when a new personal best is submitted", async () => {
    const user = { key: "u", username: "User", bestScore: 5 };
    const updated = { ...user, bestScore: 10 };
    deps.dataStore.recordScore.mockResolvedValue(updated);
    deps.sanitizeReplayPayload = vi.fn(() => ({ ok: true, replay: { seed: "abc" } }));
    deps.saveReplayForBest = vi.fn(async () => ({ ...updated, bestReplayMeta: { seed: "abc", tickCount: 1 } }));
    deps.publicUser = vi.fn((u) => ({ username: u.username, hasReplay: !!u.bestReplayMeta }));

    const svc = createScoreService(deps);
    const res = await svc.submitScore(user, 10, { replay: { seed: "abc" } });

    expect(deps.sanitizeReplayPayload).toHaveBeenCalled();
    expect(deps.saveReplayForBest).toHaveBeenCalledWith(updated, { seed: "abc" });
    expect(res.body.replaySaved).toBe(true);
    expect(res.body.user.hasReplay).toBe(true);
  });

  it("saves replay payloads again when tying an existing personal best", async () => {
    const user = { key: "u", username: "User", bestScore: 10 };
    const updated = { ...user, bestScore: 10 };
    deps.dataStore.recordScore.mockResolvedValue(updated);
    deps.sanitizeReplayPayload = vi.fn(() => ({ ok: true, replay: { seed: "abc" } }));
    deps.saveReplayForBest = vi.fn(async () => ({ ...updated, bestReplayMeta: { seed: "abc", tickCount: 1 } }));
    deps.publicUser = vi.fn((u) => ({ username: u.username, hasReplay: !!u.bestReplayMeta }));

    const svc = createScoreService(deps);
    const res = await svc.submitScore(user, 10, { replay: { seed: "abc" } });

    expect(deps.saveReplayForBest).toHaveBeenCalled();
    expect(res.body.replaySaved).toBe(true);
    expect(res.body.user.hasReplay).toBe(true);
  });

  it("surfaces replay errors without blocking score submissions", async () => {
    const user = { key: "u", username: "User", bestScore: 1 };
    deps.dataStore.recordScore.mockResolvedValue({ ...user, bestScore: 2 });
    deps.sanitizeReplayPayload = vi.fn(() => ({ ok: false, error: "bad_replay" }));
    deps.saveReplayForBest = vi.fn();

    const svc = createScoreService(deps);
    const res = await svc.submitScore(user, 2, { replay: { seed: "" } });

    expect(res.body.replaySaved).toBe(false);
    expect(res.body.replayError).toBe("bad_replay");
    expect(deps.saveReplayForBest).not.toHaveBeenCalled();
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

  it("maps connection failures to database_unavailable", () => {
    expect(mapRecordScoreError(new Error("ECONNREFUSED"))).toEqual({ status: 503, error: "database_unavailable" });
    expect(mapRecordScoreError({ code: "ENOTFOUND" })).toEqual({ status: 503, error: "database_unavailable" });
  });

  it("defaults to persistence failure", () => {
    expect(mapRecordScoreError(new Error("other"))).toEqual({ status: 503, error: "score_persist_failed" });
  });
});
