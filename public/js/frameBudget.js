export const DEFAULT_MAX_SIM_STEPS_PER_FRAME = 8;

export function planSimulationFrame({
  accumulator,
  simDt,
  maxStepsPerFrame = DEFAULT_MAX_SIM_STEPS_PER_FRAME
} = {}) {
  const safeAcc = Number.isFinite(accumulator) ? Math.max(0, accumulator) : 0;
  const safeDt = Number.isFinite(simDt) ? simDt : 0;
  const safeMaxSteps = Number.isFinite(maxStepsPerFrame)
    ? Math.max(0, Math.floor(maxStepsPerFrame))
    : DEFAULT_MAX_SIM_STEPS_PER_FRAME;

  if (safeDt <= 0 || safeMaxSteps <= 0) {
    return {
      steps: 0,
      nextAccumulator: safeAcc,
      droppedTime: 0,
      overloaded: false
    };
  }

  const possibleSteps = Math.floor(safeAcc / safeDt);
  const steps = Math.min(possibleSteps, safeMaxSteps);
  const consumed = steps * safeDt;
  let nextAccumulator = Math.max(0, safeAcc - consumed);
  let droppedTime = 0;

  if (possibleSteps > safeMaxSteps) {
    const retainedRemainder = Math.min(nextAccumulator, safeDt);
    droppedTime = Math.max(0, nextAccumulator - retainedRemainder);
    nextAccumulator = retainedRemainder;
  }

  return {
    steps,
    nextAccumulator,
    droppedTime,
    overloaded: droppedTime > 0
  };
}
