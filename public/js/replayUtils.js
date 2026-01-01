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
  const hasTickCursor = !!(tk.cursor && typeof tk.cursor === "object");
  if (hasTickCursor) {
    const nextX = tk.cursor.x;
    const nextY = tk.cursor.y;
    if (Number.isFinite(nextX)) replayInput.cursor.x = nextX;
    if (Number.isFinite(nextY)) replayInput.cursor.y = nextY;
    if ("has" in tk.cursor) replayInput.cursor.has = !!tk.cursor.has;
  }
  const baseCursor = { ...replayInput.cursor };

  const actions = normalizeActions(tk.actions);
  if (typeof step === "function") {
    step(simDt, actions);
    if (!hasTickCursor) {
      const lastActionCursor = [...actions].reverse().find((action) => action?.cursor)?.cursor;
      if (lastActionCursor) {
        replayInput.cursor.x = Number.isFinite(lastActionCursor.x) ? lastActionCursor.x : replayInput.cursor.x;
        replayInput.cursor.y = Number.isFinite(lastActionCursor.y) ? lastActionCursor.y : replayInput.cursor.y;
        if ("has" in lastActionCursor) replayInput.cursor.has = !!lastActionCursor.has;
      }
    }
    return;
  }

  for (const a of actions) {
    if (a.cursor) {
      replayInput.cursor.x = a.cursor.x ?? replayInput.cursor.x;
      replayInput.cursor.y = a.cursor.y ?? replayInput.cursor.y;
      replayInput.cursor.has = !!a.cursor.has;
    }
    game.handleAction(a.id);
    if (hasTickCursor) {
      replayInput.cursor.x = baseCursor.x;
      replayInput.cursor.y = baseCursor.y;
      replayInput.cursor.has = baseCursor.has;
    } else if (a.cursor) {
      baseCursor.x = replayInput.cursor.x;
      baseCursor.y = replayInput.cursor.y;
      baseCursor.has = replayInput.cursor.has;
    }
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
  yieldBetweenRenders = null,
  paceWithSim = false,
  shouldPause = null,
  waitForResume = null,
  shouldStop = null,
  onProgress = null,
  now = null,
  wait = null
} = {}) {
  if (!Array.isArray(ticks) || !game || !replayInput || typeof simDt !== "number") return;

  const defaultCadence = Math.max(1, Math.round((1 / simDt) / REPLAY_TARGET_FPS));
  const cadence = Number.isInteger(renderEveryTicks) && renderEveryTicks > 0
    ? renderEveryTicks
    : defaultCadence;
  const renderAlways = renderMode === "always";
  let ticksProcessed = 0;

  const resolveNow = typeof now === "function"
    ? now
    : (typeof performance !== "undefined" && typeof performance.now === "function"
      ? () => performance.now()
      : null);
  const resolveWait = typeof wait === "function"
    ? wait
    : (typeof setTimeout === "function"
      ? (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      : (typeof requestAnimationFrame === "function"
        ? () => new Promise((resolve) => requestAnimationFrame(() => resolve()))
        : null));
  const shouldPace = paceWithSim && resolveNow && resolveWait;
  const yieldAfterRender = shouldPace
    ? null
    : (typeof yieldBetweenRenders === "function"
      ? yieldBetweenRenders
      : (typeof requestAnimationFrame === "function"
        ? () => new Promise((resolve) => requestAnimationFrame(() => resolve()))
        : (typeof setTimeout === "function" ? () => new Promise((resolve) => setTimeout(resolve, 0)) : null)));
  let startTimeMs = shouldPace ? resolveNow() : null;

  for (let i = 0; i < ticks.length; i += 1) {
    if (typeof shouldStop === "function" && shouldStop()) break;
    if (typeof shouldPause === "function" && shouldPause()) {
      if (typeof waitForResume === "function") {
        await waitForResume();
      }
    }
    applyReplayTick({ tick: ticks[i], game, replayInput, simDt, step });
    ticksProcessed += 1;
    if (typeof onProgress === "function") {
      onProgress({ tickIndex: ticksProcessed, ticksLength: ticks.length });
    }

    const shouldRender = renderAlways
      || ticksProcessed % cadence === 0
      || (renderFinal && game.state === 2 /* OVER */);

    if (shouldRender) {
      game.render();
      if (shouldPace) {
        const targetElapsedMs = ticksProcessed * simDt * 1000;
        const elapsedMs = resolveNow() - startTimeMs;
        const remainingMs = targetElapsedMs - elapsedMs;
        if (remainingMs > 0) {
          await resolveWait(remainingMs);
        }
      } else if (yieldAfterRender) {
        await yieldAfterRender();
      }
    }

    if (game.state === 2 /* OVER */) break;
  }

  if (!renderAlways && renderFinal && ticksProcessed > 0 && ticksProcessed % cadence !== 0 && game.state !== 2) {
    game.render();
    if (shouldPace) {
      const targetElapsedMs = ticksProcessed * simDt * 1000;
      const elapsedMs = resolveNow() - startTimeMs;
      const remainingMs = targetElapsedMs - elapsedMs;
      if (remainingMs > 0) {
        await resolveWait(remainingMs);
      }
    } else if (yieldAfterRender) {
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
  yieldBetweenRenders = null,
  shouldPause = null,
  waitForResume = null,
  shouldStop = null,
  onProgress = null
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
      yieldBetweenRenders,
      shouldPause,
      waitForResume,
      shouldStop,
      onProgress
    });
    return;
  }

  const raf = requestFrame || (typeof requestAnimationFrame === "function" ? requestAnimationFrame : null);
  if (!raf) return;

  const tickStep = Math.max(simDt, 1 / (REPLAY_TPS * 2)); // guard against degenerate simDt
  let acc = 0;
  let lastTs = null;

  for (let i = 0; i < ticks.length;) {
    if (typeof shouldStop === "function" && shouldStop()) break;
    if (typeof shouldPause === "function" && shouldPause()) {
      if (typeof waitForResume === "function") {
        await waitForResume();
      }
    }
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
      if (typeof shouldStop === "function" && shouldStop()) break;
      const tk = ticks[i++] || {};
      applyReplayTick({ tick: tk, game, replayInput, simDt, step });
      acc -= tickStep;
      if (typeof onProgress === "function") {
        onProgress({ tickIndex: i, ticksLength: ticks.length });
      }

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
