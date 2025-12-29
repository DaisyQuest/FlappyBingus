const REPLAY_TPS = 120;
const MAX_FRAME_DT = 1 / 10;

function clampNumber(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

function clampSpeed(speed) {
  return Math.min(3, Math.max(0.25, clampNumber(speed, 1)));
}

export function createReplayPlayback({
  game,
  replayInput,
  simDt,
  requestFrame,
  step,
  onProgress,
  onStateChange,
  onComplete
} = {}) {
  if (!game || !replayInput || typeof simDt !== "number") {
    throw new Error("Replay playback requires game, replayInput, and simDt.");
  }
  const raf = requestFrame || (typeof requestAnimationFrame === "function" ? requestAnimationFrame : null);
  if (!raf) {
    throw new Error("Replay playback requires requestAnimationFrame.");
  }

  let ticks = [];
  let index = 0;
  let acc = 0;
  let lastTs = null;
  let playing = false;
  let completed = false;
  let speed = 1;

  const tickStep = Math.max(simDt, 1 / (REPLAY_TPS * 2));

  const emitProgress = () => {
    if (typeof onProgress !== "function") return;
    const total = ticks.length || 0;
    const progress = total ? index / total : 0;
    onProgress({ index, total, progress });
  };

  const emitState = () => {
    if (typeof onStateChange !== "function") return;
    onStateChange({ playing, completed, speed });
  };

  const applyTick = (tk = {}) => {
    replayInput._move = tk.move || { dx: 0, dy: 0 };
    replayInput.cursor.x = tk.cursor?.x ?? 0;
    replayInput.cursor.y = tk.cursor?.y ?? 0;
    replayInput.cursor.has = !!tk.cursor?.has;

    if (Array.isArray(tk.actions)) {
      for (const a of tk.actions) {
        if (a && a.cursor) {
          replayInput.cursor.x = a.cursor.x;
          replayInput.cursor.y = a.cursor.y;
          replayInput.cursor.has = !!a.cursor.has;
        }
        game.handleAction?.(a.id);
      }
    }

    if (typeof step === "function") {
      step(simDt, tk.actions || []);
    } else {
      game.update?.(simDt);
    }
  };

  const finish = () => {
    playing = false;
    completed = true;
    emitState();
    emitProgress();
    onComplete?.();
  };

  const resetTiming = () => {
    acc = 0;
    lastTs = null;
  };

  const loop = (ts) => {
    if (!playing) {
      resetTiming();
      raf(loop);
      return;
    }

    if (lastTs === null) {
      lastTs = ts;
      raf(loop);
      return;
    }

    const frameDt = Math.min(MAX_FRAME_DT, Math.max(0, (ts - lastTs) / 1000)) * speed;
    lastTs = ts;
    acc += frameDt;

    while (index < ticks.length && acc >= tickStep) {
      const tk = ticks[index++] || {};
      applyTick(tk);
      acc -= tickStep;

      if (game.state === 2 /* OVER */) {
        finish();
        raf(loop);
        return;
      }
    }

    game.render?.();

    if (index >= ticks.length) {
      finish();
      raf(loop);
      return;
    }

    emitProgress();
    raf(loop);
  };

  raf(loop);

  const setTicks = (nextTicks = []) => {
    if (!Array.isArray(nextTicks) || nextTicks.length === 0) {
      ticks = [];
      index = 0;
      completed = false;
      playing = false;
      emitState();
      emitProgress();
      return false;
    }
    ticks = nextTicks.slice();
    index = 0;
    completed = false;
    playing = false;
    emitState();
    emitProgress();
    return true;
  };

  const restart = () => {
    index = 0;
    completed = false;
    resetTiming();
    game.startRun?.();
    game.render?.();
    emitProgress();
    emitState();
  };

  const play = () => {
    if (!ticks.length) return false;
    if (completed) restart();
    playing = true;
    emitState();
    return true;
  };

  const pause = () => {
    playing = false;
    emitState();
  };

  const toggle = () => (playing ? pause() : play());

  const stepOnce = () => {
    if (!ticks.length) return false;
    if (index >= ticks.length) {
      finish();
      return false;
    }
    applyTick(ticks[index++] || {});
    game.render?.();
    emitProgress();
    if (game.state === 2 /* OVER */ || index >= ticks.length) {
      finish();
    }
    return true;
  };

  const seek = (progress = 0) => {
    if (!ticks.length) return false;
    const total = ticks.length;
    const normalized = Math.min(1, Math.max(0, clampNumber(progress, 0)));
    index = Math.min(total, Math.max(0, Math.floor(normalized * total)));
    completed = index >= total;
    playing = false;
    resetTiming();
    game.startRun?.();
    for (let i = 0; i < index; i += 1) {
      applyTick(ticks[i]);
    }
    game.render?.();
    emitProgress();
    emitState();
    return true;
  };

  const setSpeed = (nextSpeed) => {
    speed = clampSpeed(nextSpeed);
    emitState();
    return speed;
  };

  const getState = () => ({
    playing,
    completed,
    speed,
    index,
    total: ticks.length,
    progress: ticks.length ? index / ticks.length : 0
  });

  return {
    setTicks,
    play,
    pause,
    toggle,
    restart,
    stepOnce,
    seek,
    setSpeed,
    getState
  };
}

export const __testables = {
  REPLAY_TPS,
  MAX_FRAME_DT,
  clampSpeed
};
