import { createActionQueue } from "./actionQueue.js";

const EPS = 1e-9;

export function createFixedStepLoop({ engine, stepSeconds = 1 / 60, maxSteps = 5 } = {}) {
  if (!engine || typeof engine.step !== "function" || typeof engine.command !== "function") {
    throw new Error("Engine with step(dt) and command(action) is required.");
  }
  if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) throw new Error("Step seconds must be positive.");
  if (!Number.isFinite(maxSteps) || maxSteps <= 0) throw new Error("Max steps must be positive.");

  let accumulator = 0;
  const queue = createActionQueue();

  const enqueue = (action, payload = {}) => {
    queue.enqueue(action, payload);
  };

  const getQueueLength = () => queue.size();
  const getAccumulator = () => accumulator;

  const advance = (dt) => {
    if (!Number.isFinite(dt) || dt < 0) throw new Error("Delta time must be non-negative.");
    accumulator += dt;
    const snapshots = [];
    let steps = 0;

    while (accumulator + EPS >= stepSeconds && steps < maxSteps) {
      const actions = queue.drain();
      for (const action of actions) {
        engine.command(action.action, action.payload);
      }
      engine.step(stepSeconds);
      snapshots.push(engine.getSnapshot());
      accumulator -= stepSeconds;
      steps += 1;
    }

    return { steps, accumulator, snapshots };
  };

  return {
    enqueue,
    advance,
    getQueueLength,
    getAccumulator,
    clearQueue: queue.clear,
    stepSeconds,
    maxSteps
  };
}
