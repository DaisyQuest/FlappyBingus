import { clamp } from "./util.js";

export function createFixedStepLoop({
  simDt,
  maxFrame = 1 / 10,
  onFrameStart,
  onTick,
  onFrameEnd
} = {}) {
  const dt = Number(simDt);
  if (!Number.isFinite(dt) || dt <= 0) {
    throw new Error("createFixedStepLoop requires a positive simDt.");
  }

  let acc = 0;
  let lastTs = null;

  const advance = (ts) => {
    if (!Number.isFinite(ts)) return;

    if (lastTs === null) {
      lastTs = ts;
      return;
    }

    const frameDt = clamp((ts - lastTs) / 1000, 0, maxFrame);
    lastTs = ts;
    onFrameStart?.(frameDt);
    acc += frameDt;

    while (acc >= dt) {
      const shouldContinue = onTick?.(dt);
      acc -= dt;
      if (shouldContinue === false) {
        acc = 0;
        break;
      }
    }

    onFrameEnd?.(frameDt);
  };

  const reset = () => {
    acc = 0;
    lastTs = null;
  };

  return {
    advance,
    reset,
    getAccumulator: () => acc
  };
}
