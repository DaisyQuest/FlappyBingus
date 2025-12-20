"use strict";

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createScoreService, clampScoreDefault, mapRecordScoreError } from "../scoreService.cjs";

function buildDeps(overrides = {}) {
  const dataStore = overrides.dataStore || { recordScore: vi.fn() };
  const ensureUserSchema = overrides.ensureUserSchema || vi.fn();
  const publicUser = overrides.publicUser || vi.fn((u) => ({ name: u.username, bestScore: u.bestScore }));
  const listHighscores = overrides.listHighscores || vi.fn(async () => [{ username: "a", bestScore: 1 }]);
  const trails = overrides.trails || [{ id: "classic" }];
  return { dataStore, ensureUserSchema, publicUser, listHighscores, trails };
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
    expect(deps.ensureUserSchema).toHaveBeenCalledWith(updated);
    expect(deps.listHighscores).toHaveBeenCalled();
    expect(res).toEqual({
      ok: true,
      status: 200,
      body: {
        ok: true,
        user: { name: "User", bestScore: 123 },
        trails: deps.trails,
        highscores: [{ username: "a", bestScore: 1 }]
      }
    });
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
