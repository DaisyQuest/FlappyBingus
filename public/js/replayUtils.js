const REPLAY_TARGET_FPS = 60;
const REPLAY_TPS = 120;
const MAX_FRAME_DT = 1 / 10; // cap catch-up to avoid runaway loops

function applyReplayTick({ tick, game, replayInput, simDt, step }) {
  const tk = tick || {};
  const normalizedActions = [];

  replayInput._move = tk.move || { dx: 0, dy: 0 };
  replayInput.cursor.x = tk.cursor?.x ?? 0;
  replayInput.cursor.y = tk.cursor?.y ?? 0;
  replayInput.cursor.has = !!tk.cursor?.has;

  if (Array.isArray(tk.actions)) {
    for (const a of tk.actions) {
      const actionId = typeof a === "string" ? a : a?.id;
      if (a && typeof a === "object" && a.cursor) {
        replayInput.cursor.x = a.cursor.x;
        replayInput.cursor.y = a.cursor.y;
        replayInput.cursor.has = !!a.cursor.has;
      }
      if (actionId) {
        normalizedActions.push(actionId);
        game.handleAction(actionId);
      }
    }
  }

  if (typeof step === "function") {
    step(simDt, []);
  } else {
    game.update(simDt);
  }
}

async function playbackTicksRaf({
  ticks,
  game,
  replayInput,
  captureMode = "none",
  simDt,
  requestFrame = null,
  step = null
} = {}) {
  const raf = requestFrame || (typeof requestAnimationFrame === "function" ? requestAnimationFrame : null);
  if (!raf) return;

  const tickStep = Math.max(simDt, 1 / (REPLAY_TPS * 2)); // guard against degenerate simDt
  let acc = 0;
  let lastTs = null;

  for (let i = 0; i < ticks.length;) {
    const ts = await new Promise((resolve) => raf(resolve));
    if (lastTs === null) {
      lastTs = ts;
      continue;
    }
    const frameDt = Math.min(MAX_FRAME_DT, Math.max(0, (ts - lastTs) / 1000));
    lastTs = ts;

    if (captureMode !== "none") {
      acc = tickStep; // exactly one tick per frame when capturing
    } else {
      acc += frameDt;
    }

    while (i < ticks.length && acc >= tickStep) {
      const tk = ticks[i++] || {};
      applyReplayTick({ tick: tk, game, replayInput, simDt, step });
      acc -= tickStep;

      if (game.state === 2 /* OVER */) break;
    }

    game.render();
    if (game.state === 2 /* OVER */) break;
  }
}

export async function playbackTicksDeterministic({
  ticks,
  game,
  replayInput,
  simDt,
  step = null,
  renderEveryTicks = null,
  renderMode = "cadence",
  renderFinal = true,
  yieldBetweenRenders = null
} = {}) {
  if (!Array.isArray(ticks) || !game || !replayInput || typeof simDt !== "number") return;

  const defaultCadence = Math.max(1, Math.round((1 / simDt) / REPLAY_TARGET_FPS));
  const cadence = Number.isInteger(renderEveryTicks) && renderEveryTicks > 0
    ? renderEveryTicks
    : defaultCadence;
  const renderAlways = renderMode === "always";
  let ticksProcessed = 0;

  const yieldAfterRender = typeof yieldBetweenRenders === "function"
    ? yieldBetweenRenders
    : (typeof requestAnimationFrame === "function"
      ? () => new Promise((resolve) => requestAnimationFrame(() => resolve()))
      : (typeof setTimeout === "function" ? () => new Promise((resolve) => setTimeout(resolve, 0)) : null));

  for (let i = 0; i < ticks.length; i += 1) {
    applyReplayTick({ tick: ticks[i], game, replayInput, simDt, step });
    ticksProcessed += 1;

    const shouldRender = renderAlways
      || ticksProcessed % cadence === 0
      || (renderFinal && game.state === 2 /* OVER */);

    if (shouldRender) {
      game.render();
      if (yieldAfterRender) {
        await yieldAfterRender();
      }
    }

    if (game.state === 2 /* OVER */) break;
  }

  if (!renderAlways && renderFinal && ticksProcessed > 0 && ticksProcessed % cadence !== 0 && game.state !== 2) {
    game.render();
    if (yieldAfterRender) {
      await yieldAfterRender();
    }
  }
}

export async function playbackTicks({
  ticks,
  game,
  replayInput,
  captureMode = "none",
  paceMode = "deterministic",
  simDt,
  requestFrame = null,
  step = null,
  renderEveryTicks = null,
  renderMode = "cadence",
  renderFinal = true,
  yieldBetweenRenders = null
} = {}) {
  if (!Array.isArray(ticks) || !game || !replayInput || typeof simDt !== "number") return;

  if (captureMode === "none" && paceMode !== "realtime") {
    await playbackTicksDeterministic({
      ticks,
      game,
      replayInput,
      simDt,
      step,
      renderEveryTicks,
      renderMode,
      renderFinal,
      yieldBetweenRenders
    });
    return;
  }

  await playbackTicksRaf({
    ticks,
    game,
    replayInput,
    captureMode,
    simDt,
    requestFrame,
    step
  });
}

export function chooseReplayRandSource(replayRun, { tapePlayer, seededRand } = {}) {
  if (!replayRun || typeof tapePlayer !== "function" || typeof seededRand !== "function") return null;
  const hasReplayTape = Array.isArray(replayRun.rngTape) && replayRun.rngTape.length > 0;
  const seedSource = seededRand(replayRun.seed);

  if (!hasReplayTape) {
    return seedSource;
  }

  const tapeSource = tapePlayer(replayRun.rngTape);
  if (typeof tapeSource !== "function") {
    return seedSource;
  }

  let fallback = false;
  return () => {
    if (fallback) return seedSource();
    try {
      return tapeSource();
    } catch {
      fallback = true;
      return seedSource();
    }
  };
}

export const __testables = {
  REPLAY_TARGET_FPS,
  REPLAY_TPS,
  MAX_FRAME_DT
};
