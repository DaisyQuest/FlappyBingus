import { tickAbilities } from "./systems/abilities.js";
import { applyPhysics } from "./systems/physics.js";
import { handleBounds } from "./systems/bounds.js";

const DEFAULT_SYSTEMS = [tickAbilities, applyPhysics, handleBounds];

export function stepWorld({ world, dt, clock, events, systems = DEFAULT_SYSTEMS } = {}) {
  if (!world?.state) throw new Error("World state required.");
  if (!Number.isFinite(dt) || dt <= 0) throw new Error("Step delta must be positive.");
  const toRun = systems || [];

  toRun.forEach((system) => {
    if (typeof system === "function") {
      system(world, dt, events);
    }
  });

  world.state.tick += 1;
  world.state.time += dt;
  clock?.advance?.(dt * 1000);

  return world;
}
