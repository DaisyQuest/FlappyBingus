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
    clampScore = clampScoreDefault
  } = deps;

  const zlib = require("node:zlib");

  if (!dataStore?.recordScore) throw new Error("recordScore_required");
  if (typeof ensureUserSchema !== "function") throw new Error("ensureUserSchema_required");
  if (typeof publicUser !== "function") throw new Error("publicUser_required");
  if (typeof listHighscores !== "function") throw new Error("listHighscores_required");

  function decodeReplayBuffer(data) {
    if (!data) return null;
    try {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const text = buf.toString("utf8");
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function decodeReplayPayload(replay) {
    if (!replay) return replay;
    if (replay && replay.compression === "gzip-base64" && typeof replay.data === "string") {
      try {
        const raw = Buffer.from(replay.data, "base64");
        const inflated = zlib.gunzipSync(raw);
        const text = inflated.toString("utf8");
        return JSON.parse(text);
      } catch {
        return null;
      }
    }
    if (replay && replay.compression === "gzip" && replay.data) {
      try {
        const inflated = zlib.gunzipSync(replay.data);
        const text = inflated.toString("utf8");
        return JSON.parse(text);
      } catch {
        return null;
      }
    }
    if (replay && replay.compression === "none" && replay.data) {
      return decodeReplayBuffer(replay.data);
    }
    return replay;
  }

  async function submitScore(user, rawScore, replay) {
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

    try {
      const updated = await dataStore.recordScore(user, score);
      const isNewBest = (updated.bestScore | 0) > (user.bestScore | 0);
      let replaySaved = false;
      let replayError = null;
      const decodedReplay = decodeReplayPayload(replay);

      if (isNewBest && replay !== undefined && typeof dataStore.saveBestReplay === "function") {
        try {
          const replayKey = updated.key || user.key;
          if (!replayKey) throw new Error("user_key_required");
          if (decodedReplay !== null) {
            await dataStore.saveBestReplay(replayKey, decodedReplay, { score });
          } else {
            replaySaved = false;
            replayError = "replay_decode_failed";
          }
          replaySaved = true;
        } catch (replayErr) {
          replaySaved = false;
          replayError = replayErr?.message || "replay_persist_failed";
        }
      }

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
