import { createRng } from "./rng.js";
import { createFixedClock } from "./clock.js";
import { EventLog } from "./eventLog.js";
import { makeSnapshot } from "./snapshot.js";

/**
 * Minimal headless engine skeleton for deterministic stepping.
 * Future mechanics (physics, collisions, scoring) will extend this core.
 */
export class GameEngine {
  constructor({ rngSeed = 1, rng = createRng(rngSeed), clock = createFixedClock(0) } = {}) {
    this.rng = rng;
    this.clock = clock;
    this.events = new EventLog(clock);

    this.state = {
      tick: 0,
      time: 0,
      meta: { seed: rngSeed },
      player: { x: 0, y: 0, vx: 0, vy: 0 },
      score: { orbs: 0, time: 0, perfect: 0 }
    };
  }

  /**
   * Advance the engine by a fixed delta time (seconds).
   * Future: integrate physics/collisions; currently tracks tick/time only.
   */
  step(dt) {
    if (dt <= 0) throw new Error("Step delta must be positive.");
    this.state.tick += 1;
    this.state.time += dt;
    this.clock.advance(dt * 1000);
    return this.getSnapshot();
  }

  emit(type, payload = {}, meta = {}) {
    return this.events.emit(type, payload, meta);
  }

  getSnapshot() {
    return makeSnapshot(this.state, this.events.snapshot());
  }
}
