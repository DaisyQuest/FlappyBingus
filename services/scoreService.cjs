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
    clampScore = clampScoreDefault,
    sanitizeReplayPayload = () => ({ ok: false, error: "replay_disabled" }),
    saveReplayForBest = async () => null
  } = deps;

  if (!dataStore?.recordScore) throw new Error("recordScore_required");
  if (typeof ensureUserSchema !== "function") throw new Error("ensureUserSchema_required");
  if (typeof publicUser !== "function") throw new Error("publicUser_required");
  if (typeof listHighscores !== "function") throw new Error("listHighscores_required");

  async function submitScore(user, rawScore, { replay } = {}) {
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
    const priorBest = Number(user.bestScore) || 0;
    const replayCandidate = replay ? sanitizeReplayPayload(replay, { score }) : null;

    try {
      const updated = await dataStore.recordScore(user, score);
      const newPersonalBest = (updated.bestScore | 0) > priorBest;
      let replaySaved = false;
      let replayError = null;
      let bestUser = updated;

      if (newPersonalBest) {
        if (replayCandidate?.ok) {
          try {
            const saved = await saveReplayForBest(updated, replayCandidate.replay);
            if (saved) {
              bestUser = saved;
              replaySaved = true;
            }
          } catch (err) {
            replayError = err?.message || "replay_save_failed";
          }
        } else if (replay) {
          replayError = replayCandidate?.error || "invalid_replay";
        }
      }

      const highscores = await listHighscores();
      const recordHolder = highscores?.[0]?.username === updated.username;
      ensureUserSchema(bestUser, { recordHolder });

      return {
        ok: true,
        status: 200,
        body: {
          ok: true,
          user: publicUser(bestUser, { recordHolder }),
          trails,
          highscores,
          replaySaved,
          replayError
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
