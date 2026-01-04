import { SIM_TICK_MS, SIM_TPS } from "./simPrecision.js";

const MAX_REPLAY_UPLOAD_BYTES = 5 * 1024 * 1024;
const DEFAULT_TICK_MS = SIM_TICK_MS;

function cloneConfigSnapshot(raw) {
  if (!raw || typeof raw !== "object") return null;
  try {
    if (typeof structuredClone === "function") {
      return structuredClone(raw);
    }
    return JSON.parse(JSON.stringify(raw));
  } catch {
    return null;
  }
}

function normalizeSimTps(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num <= 0) return null;
  return Math.floor(num);
}

function clampInt(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.floor(num);
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

export function buildReplayEnvelope(
  run,
  {
    finalScore = 0,
    runStats = null,
    recordedAt = Date.now(),
    tickMs = DEFAULT_TICK_MS,
    cosmetics = null,
    configSnapshot = null,
    simTps = SIM_TPS
  } = {}
) {
  if (!run || !run.ended || !Array.isArray(run.ticks) || run.ticks.length === 0) return null;

  const ticks = run.ticks.map((tk) => ({
    move: {
      dx: clampInt(tk?.move?.dx),
      dy: clampInt(tk?.move?.dy)
    },
    cursor: {
      x: clampInt(tk?.cursor?.x),
      y: clampInt(tk?.cursor?.y),
      has: !!tk?.cursor?.has
    },
    actions: Array.isArray(tk?.actions)
      ? tk.actions
          .filter(Boolean)
          .map((a) => ({
            id: a.id,
            cursor: a.cursor
              ? { x: clampInt(a.cursor.x), y: clampInt(a.cursor.y), has: !!a.cursor.has }
              : undefined
          }))
      : []
  }));

  const rngTape = Array.isArray(run.rngTape) ? [...run.rngTape] : [];
  const durationMs = Math.max(0, Math.round(ticks.length * tickMs));
  const normalizedCosmetics = normalizeCosmetics(run.cosmetics || cosmetics);
  const normalizedConfig = cloneConfigSnapshot(configSnapshot ?? run.configSnapshot);
  const normalizedSimTps = normalizeSimTps(simTps ?? run.simTps) ?? SIM_TPS;

  const envelope = {
    version: 1,
    score: clampInt(finalScore),
    seed: String(run.seed || ""),
    recordedAt,
    durationMs,
    ticks,
    rngTape,
    runStats: runStats ? JSON.parse(JSON.stringify(runStats)) : null,
    simTps: normalizedSimTps
  };
  if (normalizedCosmetics) envelope.cosmetics = normalizedCosmetics;
  if (normalizedConfig) envelope.configSnapshot = normalizedConfig;
  return envelope;
}

export function serializeReplayEnvelope(envelope) {
  const json = JSON.stringify(envelope);
  const bytes = new TextEncoder().encode(json).byteLength;
  return { json, bytes };
}

export function hydrateBestRunPayload(run) {
  if (!run || typeof run.replayJson !== "string" || !run.replayJson) return null;
  let parsed = null;
  try {
    parsed = JSON.parse(run.replayJson);
  } catch {
    return null;
  }
  const ticks = Array.isArray(parsed.ticks) ? parsed.ticks : [];
  if (!ticks.length) return null;
  const normalizedCosmetics = normalizeCosmetics(parsed.cosmetics || run.cosmetics);
  const normalizedConfig = cloneConfigSnapshot(parsed.configSnapshot || run.configSnapshot);
  const normalizedSimTps = normalizeSimTps(parsed.simTps ?? run.simTps);

  const hydrated = {
    seed: parsed.seed || run.seed || "",
    ticks,
    rngTape: Array.isArray(parsed.rngTape) ? parsed.rngTape : [],
    rngTapeLength: Array.isArray(parsed.rngTape) ? parsed.rngTape.length : 0,
    ticksLength: ticks.length,
    ended: true,
    pendingActions: [],
    durationMs: run.durationMs || parsed.durationMs || 0,
    recordedAt: run.recordedAt || parsed.recordedAt || Date.now(),
    runStats: run.runStats || parsed.runStats || null
  };
  if (normalizedCosmetics) hydrated.cosmetics = normalizedCosmetics;
  if (normalizedConfig) hydrated.configSnapshot = normalizedConfig;
  if (normalizedSimTps) hydrated.simTps = normalizedSimTps;
  return hydrated;
}

export async function maybeUploadBestRun({
  activeRun,
  finalScore,
  runStats,
  configSnapshot,
  bestScore = 0,
  recordVideo,
  upload,
  logger,
  maxReplayBytes = MAX_REPLAY_UPLOAD_BYTES
} = {}) {
  if (!activeRun?.ended || typeof upload !== "function") return false;

  const score = clampInt(finalScore);
  if (score <= 0) return false;
  if (score < clampInt(bestScore)) {
    logger?.("Skipping best-run upload: score is below personal best.");
    return false;
  }

  const envelope = buildReplayEnvelope(activeRun, { finalScore: score, runStats, configSnapshot });
  if (!envelope) return false;

  const { json, bytes } = serializeReplayEnvelope(envelope);
  if (bytes > maxReplayBytes) {
    logger?.("Skipping best-run upload: replay payload exceeds cap.");
    return false;
  }

  const payload = {
    score,
    seed: envelope.seed,
    recordedAt: envelope.recordedAt,
    ticksLength: envelope.ticks.length,
    rngTapeLength: envelope.rngTape.length,
    durationMs: envelope.durationMs,
    replayJson: json,
    replayBytes: bytes,
    runStats: envelope.runStats
  };

  if (typeof recordVideo === "function") {
    try {
      const media = await recordVideo();
      if (media) payload.media = media;
    } catch {
      logger?.("Replay video capture failed; continuing without media.");
    }
  }

  try {
    const res = await upload(payload);
    if (res?.ok === false) {
      logger?.("Best run upload failed.");
      return false;
    }
    logger?.("Best run upload complete.");
    return true;
  } catch {
    logger?.("Best run upload failed.");
    return false;
  }
}

export const __testables = {
  MAX_REPLAY_UPLOAD_BYTES,
  normalizeCosmetics,
  cloneConfigSnapshot,
  normalizeSimTps
};
