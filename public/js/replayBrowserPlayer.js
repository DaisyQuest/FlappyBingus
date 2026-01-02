import { applyReplayTick } from "./replayUtils.js";
import { SIM_DT } from "./simPrecision.js";

const SPEED_MIN = 0.25;
const SPEED_MAX = 3;

function clampSpeed(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(SPEED_MIN, Math.min(SPEED_MAX, num));
}

function createReplayInput() {
  return {
    cursor: { x: 0, y: 0, has: false },
    _move: { dx: 0, dy: 0 },
    getMove() {
      return this._move;
    }
  };
}

function resolveRequestFrame(requestFrame) {
  if (typeof requestFrame === "function") return requestFrame;
  if (typeof requestAnimationFrame === "function") return requestAnimationFrame;
  return (cb) => setTimeout(() => cb(Date.now()), 16);
}

export function createReplayPlaybackController({
  game,
  simDt = SIM_DT,
  step = null,
  requestFrame,
  onProgress
} = {}) {
  let run = null;
  let replayInput = createReplayInput();
  let playing = false;
  let speed = 1;
  let tickIndex = 0;
  let acc = 0;
  let lastTs = null;
  const raf = resolveRequestFrame(requestFrame);

  const totalTicks = () => (Array.isArray(run?.ticks) ? run.ticks.length : 0);

  const notifyProgress = () => {
    if (typeof onProgress !== "function") return;
    onProgress({
      index: tickIndex,
      total: totalTicks(),
      playing,
      speed
    });
  };

  const resetGameForRun = () => {
    if (game?.setStateMenu) game.setStateMenu();
    if (game?.startRun) game.startRun();
    if (game) game.input = replayInput;
    if (game?.render) game.render();
  };

  const resetCounters = () => {
    tickIndex = 0;
    acc = 0;
    lastTs = null;
  };

  const loadRun = (nextRun) => {
    run = nextRun;
    replayInput = createReplayInput();
    playing = false;
    resetCounters();
    if (run) resetGameForRun();
    notifyProgress();
  };

  const restart = () => {
    if (!run) return false;
    replayInput = createReplayInput();
    playing = false;
    resetCounters();
    resetGameForRun();
    notifyProgress();
    return true;
  };

  const applyTick = () => {
    if (!run || tickIndex >= totalTicks()) return false;
    applyReplayTick({ tick: run.ticks[tickIndex], game, replayInput, simDt, step });
    tickIndex += 1;
    if (game?.render) game.render();
    return true;
  };

  const stepOnce = () => {
    if (!run) return false;
    if (tickIndex >= totalTicks()) return false;
    if (game?.state === 2) return false;
    applyTick();
    notifyProgress();
    return true;
  };

  const frameLoop = (ts) => {
    if (!playing) return;
    if (lastTs === null) lastTs = ts;
    const frameDt = Math.max(0, (ts - lastTs) / 1000);
    lastTs = ts;
    acc += frameDt * speed;

    while (acc >= simDt && tickIndex < totalTicks()) {
      applyReplayTick({ tick: run.ticks[tickIndex], game, replayInput, simDt, step });
      tickIndex += 1;
      acc -= simDt;
      if (game?.state === 2) break;
    }

    if (game?.render) game.render();
    if (tickIndex >= totalTicks() || game?.state === 2) {
      playing = false;
      notifyProgress();
      return;
    }

    notifyProgress();
    raf(frameLoop);
  };

  const play = () => {
    if (!run) return false;
    if (tickIndex >= totalTicks() || game?.state === 2) restart();
    if (playing) return true;
    playing = true;
    notifyProgress();
    raf(frameLoop);
    return true;
  };

  const pause = () => {
    if (!playing) return false;
    playing = false;
    notifyProgress();
    return true;
  };

  const stop = () => {
    if (!run) {
      playing = false;
      resetCounters();
      notifyProgress();
      return false;
    }
    replayInput = createReplayInput();
    playing = false;
    resetCounters();
    resetGameForRun();
    notifyProgress();
    return true;
  };

  const setSpeed = (value) => {
    speed = clampSpeed(value);
    notifyProgress();
    return speed;
  };

  const getState = () => ({
    run,
    playing,
    speed,
    index: tickIndex,
    total: totalTicks()
  });

  return {
    loadRun,
    restart,
    play,
    pause,
    stop,
    stepOnce,
    setSpeed,
    getState
  };
}

export const __testables = {
  SPEED_MIN,
  SPEED_MAX,
  clampSpeed,
  createReplayInput,
  resolveRequestFrame
};
