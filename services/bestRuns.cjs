"use strict";

const { createHash } = require("node:crypto");
const { clampScoreDefault } = require("./scoreService.cjs");

const MAX_REPLAY_BYTES = 5 * 1024 * 1024;
const MAX_MEDIA_BYTES = 6 * 1024 * 1024;
const DEFAULT_TICK_MS = 1000 / 120;

function utf8Bytes(str = "") {
  return Buffer.byteLength(String(str), "utf8");
}

function normalizeCosmetics(raw) {
  if (!raw || typeof raw !== "object") return null;
  const trailId = typeof raw.trailId === "string" ? raw.trailId.trim() : "";
  const iconId = typeof raw.iconId === "string" ? raw.iconId.trim() : "";
  const pipeTextureId = typeof raw.pipeTextureId === "string" ? raw.pipeTextureId.trim() : "";
  const pipeTextureMode = typeof raw.pipeTextureMode === "string" ? raw.pipeTextureMode.trim() : "";
  const cosmetics = {
    ...(trailId ? { trailId } : {}),
    ...(iconId ? { iconId } : {}),
    ...(pipeTextureId ? { pipeTextureId } : {}),
    ...(pipeTextureMode ? { pipeTextureMode } : {})
  };
  return Object.keys(cosmetics).length ? cosmetics : null;
}

function normalizeSimTps(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num <= 0) return null;
  return Math.floor(num);
}

function sanitizeMime(mime) {
  if (typeof mime !== "string" || !mime.trim()) return "application/octet-stream";
  return mime.slice(0, 128);
}

function normalizeMedia(media) {
  if (!media) return { ok: true, value: null };
  if (typeof media.dataUrl !== "string" || !media.dataUrl) return { ok: true, value: null };

  const bytes = utf8Bytes(media.dataUrl);
  if (bytes > MAX_MEDIA_BYTES) return { ok: false, error: "media_too_large" };

  return {
    ok: true,
    value: {
      dataUrl: media.dataUrl,
      bytes,
      mimeType: sanitizeMime(media.mimeType || media.type || "")
    }
  };
}

function normalizeBestRunRequest(
  body,
  { bestScore = 0, clampScore = clampScoreDefault, validateRunStats = () => ({ ok: true, stats: null }) } = {}
) {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_payload" };

  const score = clampScore(body.score);
  if (!Number.isFinite(score) || score <= 0) return { ok: false, error: "invalid_score" };
  const baseline = clampScore(bestScore);
  if (score < baseline) return { ok: false, error: "not_best" };

  const seed = typeof body.seed === "string" ? body.seed.slice(0, 160) : "";
  const recordedAt = Number(body.recordedAt || Date.now()) || Date.now();

  let replayJson = null;
  if (typeof body.replayJson === "string") {
    replayJson = body.replayJson;
  } else if (body.replay && typeof body.replay === "object") {
    try {
      replayJson = JSON.stringify(body.replay);
    } catch {
      return { ok: false, error: "invalid_replay" };
    }
  }

  if (!replayJson) return { ok: false, error: "missing_replay" };

  const replayBytes = utf8Bytes(replayJson);
  if (replayBytes > MAX_REPLAY_BYTES) return { ok: false, error: "replay_too_large" };

  let parsedReplay = null;
  try {
    parsedReplay = JSON.parse(replayJson);
  } catch {
    return { ok: false, error: "invalid_replay" };
  }

  const ticksLength = Math.max(
    0,
    Math.floor(Number(body.ticksLength ?? parsedReplay?.ticks?.length ?? 0) || 0)
  );
  const rngTapeLength = Math.max(
    0,
    Math.floor(Number(body.rngTapeLength ?? parsedReplay?.rngTape?.length ?? 0) || 0)
  );
  if (!ticksLength) return { ok: false, error: "empty_replay" };

  const durationMs = Math.max(
    0,
    Math.floor(
      Number(body.durationMs ?? parsedReplay?.durationMs ?? ticksLength * DEFAULT_TICK_MS) || 0
    )
  );

  const replayHash = createHash("sha256").update(replayJson).digest("hex");

  const parsedRunStats = validateRunStats(body.runStats);
  if (!parsedRunStats?.ok) {
    return { ok: false, error: parsedRunStats.error || "invalid_run_stats" };
  }

  const media = normalizeMedia(body.media);
  if (!media.ok) return { ok: false, error: media.error || "invalid_media" };

  return {
    ok: true,
    payload: {
      score,
      seed,
      recordedAt,
      durationMs,
      ticksLength,
      rngTapeLength,
      replayJson,
      replayBytes,
      replayHash,
      runStats: parsedRunStats.stats,
      media: media.value
    }
  };
}

function hydrateReplayFromJson(run) {
  if (!run || typeof run.replayJson !== "string" || !run.replayJson) return null;
  let parsed = null;
  try {
    parsed = JSON.parse(run.replayJson);
  } catch {
    return null;
  }

  const ticks = Array.isArray(parsed?.ticks) ? parsed.ticks : [];
  if (!ticks.length) return null;
  const rngTape = Array.isArray(parsed?.rngTape) ? parsed.rngTape : [];
  const cosmetics = normalizeCosmetics(parsed?.cosmetics || run.cosmetics);
  const configSnapshot = (parsed?.configSnapshot && typeof parsed.configSnapshot === "object")
    ? parsed.configSnapshot
    : null;
  const simTps = normalizeSimTps(parsed?.simTps ?? run.simTps);

  const hydrated = {
    seed: String(parsed.seed || run.seed || ""),
    ticks,
    rngTape,
    recordedAt: Number(run.recordedAt || parsed.recordedAt || Date.now()),
    durationMs: Number(run.durationMs || parsed.durationMs || ticks.length * DEFAULT_TICK_MS) || 0,
    rngTapeLength: rngTape.length,
    ticksLength: ticks.length
  };
  if (cosmetics) hydrated.cosmetics = cosmetics;
  if (configSnapshot) hydrated.configSnapshot = configSnapshot;
  if (simTps) hydrated.simTps = simTps;
  return hydrated;
}

module.exports = {
  MAX_MEDIA_BYTES,
  MAX_REPLAY_BYTES,
  normalizeBestRunRequest,
  hydrateReplayFromJson
};
