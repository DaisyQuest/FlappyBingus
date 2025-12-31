const MAX_REPLAY_UPLOAD_BYTES = 5 * 1024 * 1024;
const DEFAULT_TICK_MS = 1000 / 120;

function clampInt(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.floor(num);
}

export function buildReplayEnvelope(run, { finalScore = 0, runStats = null, recordedAt = Date.now(), tickMs = DEFAULT_TICK_MS } = {}) {
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
          .map((a) => {
            if (typeof a === "string") {
              return { id: a };
            }
            return {
              id: a.id,
              cursor: a.cursor
                ? { x: clampInt(a.cursor.x), y: clampInt(a.cursor.y), has: !!a.cursor.has }
                : undefined
            };
          })
      : []
  }));

  const rngTape = Array.isArray(run.rngTape) ? [...run.rngTape] : [];
  const durationMs = Math.max(0, Math.round(ticks.length * tickMs));

  return {
    version: 1,
    score: clampInt(finalScore),
    seed: String(run.seed || ""),
    recordedAt,
    durationMs,
    ticks,
    rngTape,
    skillSettings: run.skillSettings ? JSON.parse(JSON.stringify(run.skillSettings)) : null,
    runStats: runStats ? JSON.parse(JSON.stringify(runStats)) : null
  };
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

  return {
    seed: parsed.seed || run.seed || "",
    ticks,
    rngTape: Array.isArray(parsed.rngTape) ? parsed.rngTape : [],
    rngTapeLength: Array.isArray(parsed.rngTape) ? parsed.rngTape.length : 0,
    ticksLength: ticks.length,
    ended: true,
    pendingActions: [],
    durationMs: run.durationMs || parsed.durationMs || 0,
    recordedAt: run.recordedAt || parsed.recordedAt || Date.now(),
    skillSettings: run.skillSettings || parsed.skillSettings || null,
    runStats: run.runStats || parsed.runStats || null,
    media: run.media || null
  };
}

export async function maybeUploadBestRun({
  activeRun,
  finalScore,
  runStats,
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

  const envelope = buildReplayEnvelope(activeRun, { finalScore: score, runStats });
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
  MAX_REPLAY_UPLOAD_BYTES
};
