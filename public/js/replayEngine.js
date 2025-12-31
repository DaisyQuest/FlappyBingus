const DEFAULT_CAPTURE_FPS = 60;
const DEFAULT_RENDER_FPS = 60;

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

function applyReplayTick({ tick, game, replayInput, simDt, step }) {
  const tk = tick || {};

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
}

function resolveYield({ yieldBetweenRenders, requestFrame }) {
  if (typeof yieldBetweenRenders === "function") return yieldBetweenRenders;
  if (typeof requestFrame === "function") {
    return () => new Promise((resolve) => requestFrame(() => resolve()));
  }
  if (typeof setTimeout === "function") {
    return () => new Promise((resolve) => setTimeout(resolve, 0));
  }
  return null;
}

function resolveRenderCadence({ renderEveryTicks, simDt }) {
  if (Number.isInteger(renderEveryTicks) && renderEveryTicks > 0) return renderEveryTicks;
  const approxTicksPerFrame = Math.max(1, Math.round((1 / simDt) / DEFAULT_RENDER_FPS));
  return approxTicksPerFrame;
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

export function createReplayEngine({
  canvas,
  game,
  input,
  menu,
  over,
  setRandSource,
  getRandSource,
  tapeRecorder,
  tapePlayer,
  seededRand,
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

  const play = async ({
    captureMode = "none",
    run = activeRun,
    renderEveryTicks = null,
    renderMode = "cadence",
    renderFinal = true,
    yieldBetweenRenders = null
  } = {}) => {
    stopMusic?.();

    if (!hasReplayData(run)) {
      notifyStatus({ className: "hint bad", text: "No replay available yet (finish a run first)." });
      return null;
    }

    replaying = true;
    const replayInput = createReplayInput();
    const originalInput = game?.input;
    const originalRandSource = typeof getRandSource === "function" ? getRandSource() : null;
    let webmBlob = null;
    let recorder = null;
    let recordedChunks = null;

    try {
      const hasReplayTape = Array.isArray(run.rngTape) && run.rngTape.length > 0;
      const replayRandSource = hasReplayTape
        ? tapePlayer?.(run.rngTape)
        : seededRand?.(run.seed);
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

      const cadence = resolveRenderCadence({ renderEveryTicks, simDt });
      const renderAlways = renderMode === "always";
      const yieldAfterRender = resolveYield({ yieldBetweenRenders, requestFrame });
      let ticksProcessed = 0;

      for (let i = 0; i < run.ticks.length; i += 1) {
        applyReplayTick({ tick: run.ticks[i], game, replayInput, simDt, step });
        ticksProcessed += 1;

        const shouldRender = renderAlways
          || ticksProcessed % cadence === 0
          || (renderFinal && game?.state === 2 /* OVER */);

        if (shouldRender) {
          game?.render?.();
          if (yieldAfterRender) {
            await yieldAfterRender();
          }
        }

        if (game?.state === 2 /* OVER */) break;
      }

      if (!renderAlways && renderFinal && ticksProcessed > 0 && ticksProcessed % cadence !== 0 && game?.state !== 2) {
        game?.render?.();
        if (yieldAfterRender) {
          await yieldAfterRender();
        }
      }

      if (recorder) {
        webmBlob = await stopCapture({ recorder, recordedChunks });
      }
    } finally {
      if (game) {
        game.input = originalInput;
      }
      if (originalRandSource && typeof setRandSource === "function") {
        setRandSource(originalRandSource);
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
  DEFAULT_RENDER_FPS
};
