const REPLAY_TARGET_FPS = 60;
const REPLAY_TPS = 120;
const MAX_FRAME_DT = 1 / 10; // cap catch-up to avoid runaway loops

function normalizeAction(action) {
  if (!action) return null;
  if (typeof action === "string") return { id: action };
  if (typeof action !== "object") return null;
  const id = action.id || action.action || action.actionId || action.name;
  if (!id) return null;
  return { id, cursor: action.cursor };
}

function normalizeActions(actions) {
  if (!Array.isArray(actions)) return [];
  return actions.map(normalizeAction).filter(Boolean);
}

function applyReplayTick({ tick, game, replayInput, simDt, step }) {
  const tk = tick || {};

  replayInput._move = tk.move || { dx: 0, dy: 0 };
  replayInput.cursor.x = tk.cursor?.x ?? 0;
  replayInput.cursor.y = tk.cursor?.y ?? 0;
  replayInput.cursor.has = !!tk.cursor?.has;

  const actions = normalizeActions(tk.actions);
  if (typeof step === "function") {
    step(simDt, actions);
    return;
  }

  for (const a of actions) {
    if (a.cursor) {
      replayInput.cursor.x = a.cursor.x ?? replayInput.cursor.x;
      replayInput.cursor.y = a.cursor.y ?? replayInput.cursor.y;
      replayInput.cursor.has = !!a.cursor.has;
    }
    game.handleAction(a.id);
  }

  game.update(simDt);
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
  playbackMode = "deterministic",
  simDt,
  requestFrame = null,
  step = null,
  renderEveryTicks = null,
  renderMode = "cadence",
  renderFinal = true,
  yieldBetweenRenders = null
} = {}) {
  if (!Array.isArray(ticks) || !game || !replayInput || typeof simDt !== "number") return;

  const useDeterministic = captureMode === "none" && playbackMode === "deterministic";
  if (useDeterministic) {
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

  const raf = requestFrame || (typeof requestAnimationFrame === "function" ? requestAnimationFrame : null);
  if (!raf) return;

  const tickStep = Math.max(simDt, 1 / (REPLAY_TPS * 2)); // guard against degenerate simDt
  let acc = 0;
  let lastTs = null;

  for (let i = 0; i < ticks.length;) {
    const ts = await new Promise((resolve) => raf(resolve));
    if (lastTs === null) {
      lastTs = ts - (1000 / REPLAY_TARGET_FPS);
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

export function chooseReplayRandSource(replayRun, { tapePlayer, seededRand } = {}) {
  if (!replayRun || typeof tapePlayer !== "function" || typeof seededRand !== "function") return null;
  const hasReplayTape = Array.isArray(replayRun.rngTape) && replayRun.rngTape.length > 0;
  return hasReplayTape ? tapePlayer(replayRun.rngTape) : seededRand(replayRun.seed);
}

export const __testables = {
  REPLAY_TARGET_FPS,
  REPLAY_TPS,
  MAX_FRAME_DT
};
