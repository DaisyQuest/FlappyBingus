const CLIENT_REPLAY_LIMITS = Object.freeze({
  maxTicks: 120_000,
  maxActionsPerTick: 8,
  maxRngTape: 240_000
});

export function buildReplayPayload(run, score, { maxTicks = CLIENT_REPLAY_LIMITS.maxTicks, maxActions = CLIENT_REPLAY_LIMITS.maxActionsPerTick, maxRng = CLIENT_REPLAY_LIMITS.maxRngTape } = {}) {
  if (
    !run ||
    !run.ended ||
    !run.seed ||
    !Array.isArray(run.ticks) ||
    !run.ticks.length ||
    !Array.isArray(run.rngTape) ||
    !run.rngTape.length
  ) {
    return null;
  }

  const ticks = run.ticks.slice(0, maxTicks);
  const tape = run.rngTape.slice(0, maxRng);
  if (!ticks.length || !tape.length) return null;

  let actionCount = 0;
  const safeTicks = ticks.map((tk) => {
    const actions = Array.isArray(tk?.actions)
      ? tk.actions
          .slice(0, maxActions)
          .map((a) => {
            if (!a || !a.id) return null;
            const id = String(a.id);
            if (!id) return null;
            const cursor = a.cursor
              ? {
                  x: Number(a.cursor.x) || 0,
                  y: Number(a.cursor.y) || 0,
                  has: !!a.cursor.has
                }
              : null;
            return cursor ? { id, cursor } : { id };
          })
          .filter(Boolean)
      : [];
    actionCount += actions.length;
    return {
      move: {
        dx: Number(tk?.move?.dx) || 0,
        dy: Number(tk?.move?.dy) || 0
      },
      cursor: {
        x: Number(tk?.cursor?.x) || 0,
        y: Number(tk?.cursor?.y) || 0,
        has: !!tk?.cursor?.has
      },
      actions
    };
  });

  return {
    version: 1,
    seed: String(run.seed),
    rngTape: tape.map((v) => Number(v) || 0),
    ticks: safeTicks,
    tickCount: safeTicks.length,
    durationMs: Math.round(safeTicks.length * (1000 / 120)),
    actionCount,
    score: Number(score) || 0,
    recordedAt: Date.now(),
    ended: true
  };
}

export function hydrateReplayFromServer(replay, limits = CLIENT_REPLAY_LIMITS) {
  if (!replay || typeof replay !== "object") return null;
  const seed = String(replay.seed || "").trim();
  const ticks = Array.isArray(replay.ticks) ? replay.ticks.slice(0, limits.maxTicks) : [];
  const tape = Array.isArray(replay.rngTape) ? replay.rngTape.slice(0, limits.maxRngTape) : [];
  if (!seed || !ticks.length || !tape.length) return null;

  const safeTicks = ticks.map((tk) => ({
    move: {
      dx: Number(tk?.move?.dx) || 0,
      dy: Number(tk?.move?.dy) || 0
    },
    cursor: {
      x: Number(tk?.cursor?.x) || 0,
      y: Number(tk?.cursor?.y) || 0,
      has: !!tk?.cursor?.has
    },
    actions: Array.isArray(tk?.actions)
      ? tk.actions
          .slice(0, limits.maxActionsPerTick)
          .map((a) => {
            if (!a || !a.id) return null;
            const id = String(a.id);
            if (!id) return null;
            const cursor = a.cursor
              ? {
                  x: Number(a.cursor.x) || 0,
                  y: Number(a.cursor.y) || 0,
                  has: !!a.cursor.has
                }
              : null;
            return cursor ? { id, cursor } : { id };
          })
          .filter(Boolean)
      : []
  }));

  return {
    version: Number(replay.version) || 1,
    seed,
    rngTape: tape.map((v) => Number(v) || 0),
    ticks: safeTicks,
    tickCount: safeTicks.length,
    durationMs: Number(replay.durationMs) || Math.round(safeTicks.length * (1000 / 120)),
    actionCount: Number(replay.actionCount) || 0,
    recordedAt: Number(replay.recordedAt) || Date.now(),
    ended: true,
    pendingActions: []
  };
}

export function formatDurationMs(ms) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes) return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  return `${seconds}s`;
}

export function describeReplayMeta(meta, hasReplay = false) {
  if (!hasReplay || !meta) return "Replay not captured yet.";
  const ticks = meta.tickCount ? `${meta.tickCount} ticks` : null;
  const actions = meta.actionCount ? `${meta.actionCount} inputs` : null;
  const duration = formatDurationMs(meta.durationMs || 0);
  const parts = [duration];
  if (ticks) parts.push(ticks);
  if (actions) parts.push(actions);
  return `Replay: ${parts.join(" • ")}`;
}

export const __replayLimits = CLIENT_REPLAY_LIMITS;
