const REPLAY_TARGET_FPS = 60;
const REPLAY_TPS = 120;
const MAX_FRAME_DT = 1 / 15; // avoid runaway catch-up on long frames

function clampDt(dt) {
  if (!Number.isFinite(dt)) return 0;
  return Math.max(0, Math.min(MAX_FRAME_DT, dt));
}

export function ticksPerFrameForPlayback(captureMode = "none", targetFps = REPLAY_TARGET_FPS, tps = REPLAY_TPS) {
  if (captureMode !== "none") return 1;
  return Math.max(1, Math.round(tps / targetFps));
}

export async function playbackTicks({
  ticks,
  game,
  replayInput,
  captureMode = "none",
  simDt,
  requestFrame = null
} = {}) {
  if (!Array.isArray(ticks) || !game || !replayInput || typeof simDt !== "number") return;

  const raf = requestFrame || (typeof requestAnimationFrame === "function" ? requestAnimationFrame : null);
  if (!raf) return;

  const minTicksPerFrame = ticksPerFrameForPlayback(captureMode);
  let acc = 0;
  let lastTs = null;

  for (let i = 0; i < ticks.length;) {
    const ts = await new Promise((resolve) => raf(resolve));
    if (lastTs === null) {
      lastTs = ts;
      continue;
    }
    acc += clampDt((ts - lastTs) / 1000);
    lastTs = ts;

    const targetTicks = (captureMode !== "none")
      ? minTicksPerFrame
      : Math.max(minTicksPerFrame, Math.round(acc / simDt));

    let ran = 0;
    while (i < ticks.length && ran < targetTicks) {
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

      game.update(simDt);
      ran += 1;

      if (game.state === 2 /* OVER */) break;
    }

    acc = Math.max(0, acc - ran * simDt);

    game.render();
    if (game.state === 2 /* OVER */) break;
  }
}

export const __testables = {
  REPLAY_TARGET_FPS,
  REPLAY_TPS,
  MAX_FRAME_DT
};
