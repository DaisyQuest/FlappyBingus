import { GameEngine } from "./gameEngine.js";
import { createRng } from "./rng.js";
import { createFixedClock } from "./clock.js";

const EPS = 1e-9;

export function validateScenario(scenario) {
  if (!scenario || typeof scenario !== "object") throw new Error("Scenario must be an object.");
  if (!scenario.name || typeof scenario.name !== "string") throw new Error("Scenario.name is required.");
  if (!Array.isArray(scenario.steps)) throw new Error("Scenario.steps must be an array.");

  scenario.steps.forEach((step, idx) => {
    if (typeof step.at !== "number" || step.at < 0) throw new Error(`Step ${idx} has invalid 'at' time.`);
    if (!step.action || typeof step.action !== "string") throw new Error(`Step ${idx} missing 'action'.`);
    if (!["step", "emit"].includes(step.action)) throw new Error(`Step ${idx} has unsupported action '${step.action}'.`);
    if (step.action === "step" && (typeof step.dt !== "number" || step.dt <= 0)) {
      throw new Error(`Step ${idx} 'step' requires positive 'dt'.`);
    }
    if (step.action === "emit" && typeof step.type !== "string") {
      throw new Error(`Step ${idx} 'emit' requires string 'type'.`);
    }
  });
}

/**
 * Runs a declarative scenario against a deterministic engine.
 * Steps are processed in chronological order (by 'at') with gaps auto-stepped.
 */
export function runScenario({
  scenario,
  makeEngine = (seed) => new GameEngine({ rngSeed: seed, rng: createRng(seed), clock: createFixedClock(0) })
}) {
  validateScenario(scenario);

  const seed = scenario.seed ?? 1;
  const engine = makeEngine(seed);
  const steps = [...scenario.steps];
  let currentTime = 0;
  const snapshots = [];

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    if (step.at + EPS < currentTime) throw new Error(`Scenario steps out of order at index ${i}.`);
    const gap = step.at - currentTime;
    if (gap > EPS) {
      engine.step(gap);
      currentTime += gap;
      snapshots.push(engine.getSnapshot());
    }

    if (step.action === "step") {
      engine.step(step.dt);
      currentTime += step.dt;
      snapshots.push(engine.getSnapshot());
    } else if (step.action === "emit") {
      engine.emit(step.type, step.payload ?? {}, { stepIndex: i, at: step.at });
      snapshots.push(engine.getSnapshot());
    }
  }

  return {
    scenario: scenario.name,
    seed,
    snapshots
  };
}

/**
 * Runs a scenario and evaluates a list of assertion functions.
 * Each assertion receives the run result and should return { pass, message }.
 */
export function evaluateScenario({ scenario, assertions = [], makeEngine }) {
  const runResult = runScenario({ scenario, makeEngine });
  const assertionResults = assertions.map((fn) => fn(runResult));
  const failures = assertionResults.filter((r) => !r.pass);
  return {
    ...runResult,
    assertions: assertionResults,
    pass: failures.length === 0
  };
}
