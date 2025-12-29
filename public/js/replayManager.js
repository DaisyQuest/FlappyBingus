import { chooseReplayRandSource } from "./replayUtils.js";

const DEFAULT_CAPTURE_FPS = 60;

function createReplayInput() {
  return {
    cursor: { x: 0, y: 0, has: false },
    _move: { dx: 0, dy: 0 },
    getMove() { return this._move; }
  };
}

function hasReplayData(run) {
  return !!(run && run.ended && Array.isArray(run.ticks) && run.ticks.length);
}

function ensureClassList(el) {
  return el?.classList;
}

function startCapture({ canvas, fps }) {
  if (!canvas?.captureStream) {
    throw new Error("Replay capture requires a canvas with captureStream().");
  }
  if (typeof MediaRecorder !== "function") {
    throw new Error("Replay capture requires MediaRecorder support.");
  }
  const stream = canvas.captureStream(fps);
  const mime = MediaRecorder.isTypeSupported?.("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm;codecs=vp8";
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const recordedChunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) recordedChunks.push(e.data);
  };
  recorder.start();
  return { recorder, recordedChunks };
}

async function stopCapture({ recorder, recordedChunks }) {
  await new Promise((resolve) => {
    recorder.onstop = resolve;
    recorder.stop();
  });
  return new Blob(recordedChunks, { type: recorder.mimeType || "video/webm" });
}

export function createReplayRun(seed) {
  return {
    seed: String(seed || ""),
    ticks: [],
    pendingActions: [],
    ended: false,
    rngTape: []
  };
}

export function cloneReplayRun(run) {
  if (!run) return null;
  return {
    ...run,
    ticks: Array.isArray(run.ticks) ? run.ticks.slice() : [],
    rngTape: Array.isArray(run.rngTape) ? run.rngTape.slice() : [],
    pendingActions: Array.isArray(run.pendingActions) ? run.pendingActions.slice() : []
  };
}

export function createReplayManager({
  canvas,
  game,
  input,
  menu,
  over,
  setRandSource,
  tapeRecorder,
  tapePlayer,
  seededRand,
  playbackTicks,
  simDt,
  requestFrame,
  stopMusic,
  onStatus,
  step
} = {}) {
  let activeRun = null;
  let replaying = false;

  const notifyStatus = (payload) => {
    if (typeof onStatus !== "function") return;
    onStatus(payload);
  };

  const startRecording = (seed) => {
    activeRun = createReplayRun(seed);
    if (typeof setRandSource === "function" && typeof tapeRecorder === "function") {
      setRandSource(tapeRecorder(activeRun.seed, activeRun.rngTape));
    }
    notifyStatus({ className: "hint", text: `Recording replay… Seed: ${activeRun.seed}` });
    return activeRun;
  };

  const reset = () => {
    activeRun = null;
    replaying = false;
  };

  const queueAction = (action) => {
    if (!activeRun || activeRun.ended) return;
    activeRun.pendingActions.push(action);
  };

  const drainPendingActions = () => {
    if (!activeRun || activeRun.ended) return [];
    return activeRun.pendingActions.splice(0);
  };

  const clearPendingActions = () => {
    if (activeRun) activeRun.pendingActions.length = 0;
  };

  const recordTick = (snapshot, actions) => {
    if (!activeRun || activeRun.ended) return;
    activeRun.ticks.push({
      move: snapshot.move,
      cursor: snapshot.cursor,
      actions
    });
  };

  const markEnded = () => {
    if (!activeRun) return null;
    activeRun.ended = true;
    return activeRun;
  };

  const getActiveRun = () => activeRun;

  const isReplaying = () => replaying;

  const play = async ({ captureMode = "none", run = activeRun } = {}) => {
    stopMusic?.();

    if (!hasReplayData(run)) {
      notifyStatus({ className: "hint bad", text: "No replay available yet (finish a run first)." });
      return null;
    }

    replaying = true;
    const replayInput = createReplayInput();
    const originalInput = game?.input;
    let webmBlob = null;
    let recorder = null;
    let recordedChunks = null;

    try {
      const replayRandSource = chooseReplayRandSource(run, { tapePlayer, seededRand });
      if (replayRandSource && typeof setRandSource === "function") {
        setRandSource(replayRandSource);
      }

      if (game) {
        game.input = replayInput;
      }

      input?.reset?.();
      ensureClassList(menu)?.add("hidden");
      ensureClassList(over)?.add("hidden");
      game?.startRun?.();

      if (captureMode !== "none") {
        ({ recorder, recordedChunks } = startCapture({
          canvas,
          fps: DEFAULT_CAPTURE_FPS
        }));
      }

      if (typeof playbackTicks === "function") {
        await playbackTicks({
          ticks: run.ticks,
          game,
          replayInput,
          captureMode,
          simDt,
          requestFrame,
          step
        });
      }

      if (recorder) {
        webmBlob = await stopCapture({ recorder, recordedChunks });
      }
    } finally {
      if (game) {
        game.input = originalInput;
      }
      ensureClassList(over)?.remove("hidden");
      replaying = false;
    }

    if (captureMode === "none") return true;
    return webmBlob;
  };

  return {
    startRecording,
    reset,
    queueAction,
    drainPendingActions,
    clearPendingActions,
    recordTick,
    markEnded,
    getActiveRun,
    isReplaying,
    play
  };
}

export const __testables = {
  DEFAULT_CAPTURE_FPS,
  createReplayInput,
  hasReplayData,
  startCapture,
  stopCapture
};
