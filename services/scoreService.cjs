"use strict";

/**
 * Score submission service that encapsulates validation, persistence, and response
 * shaping for the /api/score endpoint. Keeping this logic here makes it easy to
 * unit test without spinning up the HTTP server.
 */
function createScoreService(deps) {
  const {
    dataStore,
    ensureUserSchema,
    publicUser,
    listHighscores,
    trails,
    icons,
    clampScore = clampScoreDefault,
    normalizeAchievements = (state) => state,
    validateRunStats = () => ({ ok: true, stats: { orbsCollected: null, abilitiesUsed: null, perfects: null } }),
    evaluateAchievements = () => ({ state: null, unlocked: [] }),
    buildAchievementsPayload = () => null
  } = deps;

  if (!dataStore?.recordScore) throw new Error("recordScore_required");
  if (typeof ensureUserSchema !== "function") throw new Error("ensureUserSchema_required");
  if (typeof publicUser !== "function") throw new Error("publicUser_required");
  if (typeof listHighscores !== "function") throw new Error("listHighscores_required");

  async function submitScore(user, rawScore, rawBustercoinsEarned = 0, rawRunStats = null) {
    if (!user) return { ok: false, status: 401, error: "unauthorized" };

    if (rawScore === null || rawScore === undefined) {
      return { ok: false, status: 400, error: "invalid_score" };
    }
    if (typeof rawScore === "object") {
      return { ok: false, status: 400, error: "invalid_score" };
    }

    const parsed = Number(rawScore);
    if (!Number.isFinite(parsed)) return { ok: false, status: 400, error: "invalid_score" };

    const score = clampScore(parsed);
    const coins =
      rawBustercoinsEarned === undefined || rawBustercoinsEarned === null
        ? 0
        : Number(rawBustercoinsEarned);
    if (!Number.isFinite(coins) || coins < 0) {
      return { ok: false, status: 400, error: "invalid_bustercoins" };
    }
    const bustercoinsEarned = Math.max(0, Math.floor(coins));

    const parsedRun = validateRunStats(rawRunStats);
    if (!parsedRun?.ok) {
      return { ok: false, status: 400, error: parsedRun.error || "invalid_run_stats" };
    }

    const runStats = parsedRun.stats;
    const achievementEval = evaluateAchievements({
      previous: normalizeAchievements(user.achievements),
      runStats,
      score,
      totalScore: user.totalScore
    });

    try {
      const updated = await dataStore.recordScore(user, score, {
        bustercoinsEarned,
        achievements: achievementEval.state
      });
      const highscores = await listHighscores();
      const recordHolder = highscores?.[0]?.username === updated.username;
      ensureUserSchema(updated, { recordHolder });

      return {
        ok: true,
        status: 200,
        body: {
          ok: true,
          user: publicUser(updated, { recordHolder }),
          trails,
          icons,
          highscores,
          achievements: buildAchievementsPayload(updated, achievementEval.unlocked)
        }
      };
    } catch (err) {
      const mapped = mapRecordScoreError(err);
      return { ok: false, status: mapped.status, error: mapped.error };
    }
  }

  return { submitScore };
}

function mapRecordScoreError(err) {
  const code = err?.message || err?.code || "";
  if (code === "user_key_required") return { status: 401, error: "unauthorized" };
  return { status: 503, error: "score_persist_failed" };
}

function clampScoreDefault(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1_000_000_000, Math.floor(n)));
}

module.exports = { createScoreService, clampScoreDefault, mapRecordScoreError };
