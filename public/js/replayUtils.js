const REPLAY_TARGET_FPS = 60;
const REPLAY_TPS = 120;
const MAX_FRAME_DT = 1 / 10; // cap catch-up to avoid runaway loops

export async function playbackTicks({
  ticks,
  game,
  replayInput,
  captureMode = "none",
  simDt,
  requestFrame = null,
  step = null
} = {}) {
  if (!Array.isArray(ticks) || !game || !replayInput || typeof simDt !== "number") return;

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
          game.handleAction(a.id);
        }
      }

      if (typeof step === "function") {
        step(simDt, tk.actions || []);
      } else {
        game.update(simDt);
      }
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
