import { createRng } from "./rng.js";
import { createFixedClock } from "./clock.js";
import { EventLog } from "./eventLog.js";
import { makeSnapshot } from "./snapshot.js";

const DEFAULT_CONFIG = {
  gravity: 1200,
  jumpImpulse: 420,
  dashSpeed: 800,
  dashDuration: 0.2,
  phaseDuration: 0.35,
  maxFallSpeed: 900,
  world: { width: 300, height: 300 },
  eventBufferSize: 500
};

/**
 * Minimal headless engine skeleton for deterministic stepping.
 * Future mechanics (physics, collisions, scoring) will extend this core.
 */
export class GameEngine {
  constructor({ rngSeed = 1, rng = createRng(rngSeed), clock = createFixedClock(0), config = {} } = {}) {
    this.rng = rng;
    this.clock = clock;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      world: { ...DEFAULT_CONFIG.world, ...(config.world || {}) }
    };
    this.events = new EventLog(clock, { maxSize: this.config.eventBufferSize });

    this.state = {
      tick: 0,
      time: 0,
      meta: { seed: rngSeed },
      player: {
        x: this.config.world.width * 0.5,
        y: this.config.world.height * 0.5,
        vx: 0,
        vy: 0,
        dash: { active: false, time: 0, direction: null },
        invulnerable: false,
        invulnTime: 0,
        wallBounces: 0
      },
      score: { orbs: 0, time: 0, perfect: 0 }
    };
  }

  /**
   * Advance the engine by a fixed delta time (seconds).
   * Future: integrate physics/collisions; currently tracks tick/time only.
   */
  step(dt) {
    if (dt <= 0) throw new Error("Step delta must be positive.");
    this._tickAbilities(dt);
    this._applyPhysics(dt);
    this._handleBounds();
    this.state.tick += 1;
    this.state.time += dt;
    this.clock.advance(dt * 1000);
    return this.getSnapshot();
  }

  command(action, payload = {}) {
    const player = this.state.player;
    switch (action) {
      case "jump": {
        player.vy = -this.config.jumpImpulse;
        this.emit("player:jump", { vy: player.vy }, { action });
        break;
      }
      case "dash": {
        const direction = payload.direction || "right";
        const dirMap = {
          right: [1, 0],
          left: [-1, 0],
          up: [0, -1],
          down: [0, 1]
        };
        const vec = dirMap[direction];
        if (!vec) throw new Error(`Unsupported dash direction "${direction}".`);
        player.dash = { active: true, time: this.config.dashDuration, direction };
        player.vx = vec[0] * this.config.dashSpeed;
        player.vy = vec[1] * this.config.dashSpeed;
        this.emit("dash:start", { direction }, { action });
        break;
      }
      case "phase": {
        player.invulnerable = true;
        player.invulnTime = this.config.phaseDuration;
        this.emit("ability:phase:start", {}, { action });
        break;
      }
      default:
        throw new Error(`Unknown action "${action}".`);
    }
    return this.getSnapshot();
  }

  _tickAbilities(dt) {
    const player = this.state.player;
    if (player.dash.active) {
      player.dash.time = Math.max(0, player.dash.time - dt);
      if (player.dash.time === 0) {
        player.dash.active = false;
        this.emit("dash:end", { direction: player.dash.direction });
      }
    }

    if (player.invulnerable) {
      player.invulnTime = Math.max(0, player.invulnTime - dt);
      if (player.invulnTime === 0) {
        player.invulnerable = false;
        this.emit("ability:phase:end", {});
      }
    }
  }

  _applyPhysics(dt) {
    const player = this.state.player;
    if (!player.dash.active) {
      player.vy = Math.min(this.config.maxFallSpeed, player.vy + this.config.gravity * dt);
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
  }

  _handleBounds() {
    const player = this.state.player;
    const { width, height } = this.config.world;
    const bounces = [];
    if (player.x < 0) {
      player.x = 0;
      if (player.vx < 0) bounces.push({ axis: "x", side: "left" });
      player.vx = Math.abs(player.vx);
    }
    if (player.x > width) {
      player.x = width;
      if (player.vx > 0) bounces.push({ axis: "x", side: "right" });
      player.vx = -Math.abs(player.vx);
    }
    if (player.y < 0) {
      player.y = 0;
      if (player.vy < 0) bounces.push({ axis: "y", side: "top" });
      player.vy = Math.abs(player.vy);
    }
    if (player.y > height) {
      player.y = height;
      if (player.vy > 0) bounces.push({ axis: "y", side: "bottom" });
      player.vy = -Math.abs(player.vy);
    }

    bounces.forEach((bounce) => {
      player.wallBounces += 1;
      this.emit("dash:bounce", bounce);
    });
  }

  emit(type, payload = {}, meta = {}) {
    return this.events.emit(type, payload, meta);
  }

  getSnapshot() {
    return makeSnapshot(this.state, this.events.snapshot());
  }
}
