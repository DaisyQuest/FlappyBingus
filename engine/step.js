import { tickAbilities } from "./systems/abilities.js";
import { applyPhysics } from "./systems/physics.js";
import { handleBounds } from "./systems/bounds.js";
import { createSystemPipeline } from "./systemPipeline.js";

const DEFAULT_SYSTEMS = [tickAbilities, applyPhysics, handleBounds];
const DEFAULT_PIPELINE = createSystemPipeline(DEFAULT_SYSTEMS);

export function stepWorld({ world, dt, clock, events, systems, pipeline, rng } = {}) {
  if (!world?.state) throw new Error("World state required.");
  if (!Number.isFinite(dt) || dt <= 0) throw new Error("Step delta must be positive.");

  const activePipeline = pipeline ?? createSystemPipeline(systems ?? DEFAULT_SYSTEMS);

  const context = Object.freeze({ world, dt, events, rng, clock });
  activePipeline.run(context);

  world.state.tick += 1;
  world.state.time += dt;
  clock?.advance?.(dt * 1000);

  return world;
}

export function getDefaultSystemPipeline() {
  return DEFAULT_PIPELINE;
}
