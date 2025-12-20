import { GameEngine } from "./gameEngine.js";
import { createRng } from "./rng.js";
import { createFixedClock } from "./clock.js";
import { makeSnapshot } from "./snapshot.js";

const EPS = 1e-9;

/**
 * Bridges the headless GameEngine with a provided game instance (UI or stub).
 * The driver advances both engine and game in lockstep, invoking game.update(dt)
 * and game.handleAction(action) when scheduled actions fire.
 */
export class GameDriver {
  constructor({
    game,
    engine = new GameEngine({ rng: createRng(1), clock: createFixedClock(0) }),
    syncRandSource
  }) {
    if (!game || typeof game.update !== "function") throw new Error("Game with update(dt) is required.");
    this.game = game;
    this.engine = engine;
    this.snapshots = [];

    if (typeof syncRandSource === "function" && engine.rng?.next) {
      syncRandSource(() => engine.rng.next());
    }
  }

  /**
   * Run a timeline of actions [{ at: seconds, action: string }] through the game.
   * Returns engine snapshots after each step for assertions.
   */
  run({ timeline = [], duration = 0 }) {
    const steps = [...timeline];
    let current = 0;

    for (const evt of steps) {
      if (evt.at + EPS < current) throw new Error("Timeline out of order.");
      const gap = evt.at - current;
      if (gap > EPS) this._step(gap);
      this._applyAction(evt.action);
      current = evt.at;
    }

    if (duration > current + EPS) {
      this._step(duration - current);
    }

    return this.snapshots;
  }

  _applyAction(action) {
    if (typeof this.game.handleAction === "function") {
      this.game.handleAction(action);
    }
    this.snapshots.push(this.engine.getSnapshot());
  }

  _step(dt) {
    this.engine.step(dt);
    this.game.update(dt);
    this.snapshots.push(this.engine.getSnapshot());
  }
}
