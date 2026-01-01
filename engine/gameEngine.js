import { createRng } from "./rng.js";
import { createFixedClock } from "./clock.js";
import { EventLog } from "./eventLog.js";
import { applyAction } from "./actions.js";
import { stepWorld, getDefaultSystemPipeline } from "./step.js";
import { createSystemPipeline, listSystemNames } from "./systemPipeline.js";
import { createWorld } from "./world.js";
import { serializeWorld } from "./serialize.js";

/**
 * Minimal headless engine skeleton for deterministic stepping.
 * Future mechanics (physics, collisions, scoring) will extend this core.
 */
export class GameEngine {
  constructor({ rngSeed = 1, rng = createRng(rngSeed), clock = createFixedClock(0), config = {}, systems, pipeline } = {}) {
    this.rng = rng;
    this.clock = clock;
    this.world = createWorld({ seed: rngSeed, config });
    this.config = this.world.config;
    this.events = new EventLog(clock, { maxSize: this.config.eventBufferSize });
    this.state = this.world.state;
    const basePipeline = getDefaultSystemPipeline();
    const baseSystems = basePipeline.systems.map((system) => ({
      name: system.name,
      order: system.order,
      run: system.run
    }));
    this.pipeline = pipeline ?? createSystemPipeline(systems ?? baseSystems);
  }

  /**
   * Advance the engine by a fixed delta time (seconds).
   * Future: integrate physics/collisions; currently tracks tick/time only.
   */
  step(dt) {
    stepWorld({
      world: this.world,
      dt,
      clock: this.clock,
      events: this.events,
      pipeline: this.pipeline,
      rng: this.rng
    });
    return this.getSnapshot();
  }

  command(action, payload = {}) {
    applyAction({ state: this.state, config: this.config, events: this.events }, action, payload);
    return this.getSnapshot();
  }

  emit(type, payload = {}, meta = {}) {
    return this.events.emit(type, payload, meta);
  }

  getSnapshot() {
    return serializeWorld(this.world, this.events);
  }

  getSystemNames() {
    return listSystemNames(this.pipeline);
  }
}
