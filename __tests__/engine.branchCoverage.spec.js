import { describe, expect, it, vi } from "vitest";

import { applyAction, getDashDirections } from "../engine/actions.js";
import { stepWorld } from "../engine/step.js";
import { createWorld } from "../engine/world.js";
import { tickAbilities } from "../engine/systems/abilities.js";
import { applyPhysics } from "../engine/systems/physics.js";
import { handleBounds } from "../engine/systems/bounds.js";
import { BoundsHandler } from "../engine/systems/boundsHandler.js";

function createEvents() {
  return { emit: vi.fn() };
}

describe("actions", () => {
  it("applies jump actions and emits events", () => {
    const world = createWorld();
    const events = createEvents();

    applyAction({ state: world.state, config: world.config, events }, "jump");

    expect(world.state.player.vy).toBe(-world.config.jumpImpulse);
    expect(events.emit).toHaveBeenCalledWith(
      "player:jump",
      { vy: world.state.player.vy },
      { action: "jump" }
    );
  });

  it("applies dash actions and validates direction", () => {
    const world = createWorld();
    const events = createEvents();

    applyAction({ state: world.state, config: world.config, events }, "dash", { direction: "up" });

    expect(world.state.player.dash.active).toBe(true);
    expect(world.state.player.dash.direction).toBe("up");
    expect(world.state.player.vx).toBe(0);
    expect(world.state.player.vy).toBe(-world.config.dashSpeed);
    expect(events.emit).toHaveBeenCalledWith("dash:start", { direction: "up" }, { action: "dash" });

    expect(() =>
      applyAction({ state: world.state, config: world.config, events }, "dash", { direction: "warp" })
    ).toThrow('Unsupported dash direction "warp".');
  });

  it("applies phase actions and rejects unknown actions", () => {
    const world = createWorld();
    const events = createEvents();

    applyAction({ state: world.state, config: world.config, events }, "phase");

    expect(world.state.player.invulnerable).toBe(true);
    expect(world.state.player.invulnTime).toBe(world.config.phaseDuration);
    expect(events.emit).toHaveBeenCalledWith("ability:phase:start", {}, { action: "phase" });

    expect(() => applyAction({ state: world.state, config: world.config, events }, "teleport")).toThrow(
      'Unknown action "teleport".'
    );
  });

  it("returns isolated dash direction vectors", () => {
    const first = getDashDirections();
    const second = getDashDirections();

    first.right[0] = 999;

    expect(second.right[0]).toBe(1);
  });
});

describe("abilities system", () => {
  it("counts down dash and emits when it ends", () => {
    const world = createWorld();
    const events = createEvents();

    world.state.player.dash = { active: true, time: 0.05, direction: "left" };

    tickAbilities(world, 0.1, events);

    expect(world.state.player.dash.time).toBe(0);
    expect(world.state.player.dash.active).toBe(false);
    expect(events.emit).toHaveBeenCalledWith("dash:end", { direction: "left" });
  });

  it("keeps abilities active when timers remain", () => {
    const world = createWorld();
    const events = createEvents();

    world.state.player.dash = { active: true, time: 0.3, direction: "right" };
    world.state.player.invulnerable = true;
    world.state.player.invulnTime = 0.2;

    tickAbilities(world, 0.1, events);

    expect(world.state.player.dash.time).toBeCloseTo(0.2, 5);
    expect(world.state.player.dash.active).toBe(true);
    expect(world.state.player.invulnTime).toBeCloseTo(0.1, 5);
    expect(world.state.player.invulnerable).toBe(true);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("ends invulnerability and emits when timer expires", () => {
    const world = createWorld();
    const events = createEvents();

    world.state.player.invulnerable = true;
    world.state.player.invulnTime = 0.05;

    tickAbilities(world, 0.1, events);

    expect(world.state.player.invulnerable).toBe(false);
    expect(world.state.player.invulnTime).toBe(0);
    expect(events.emit).toHaveBeenCalledWith("ability:phase:end", {});
  });
});

describe("physics system", () => {
  it("applies gravity when not dashing", () => {
    const world = createWorld({ config: { gravity: 10, maxFallSpeed: 15 } });

    world.state.player.vy = 7;
    world.state.player.vx = 2;

    applyPhysics(world, 1);

    expect(world.state.player.vy).toBe(15);
    expect(world.state.player.x).toBe(2 + world.config.world.width * 0.5);
    expect(world.state.player.y).toBe(15 + world.config.world.height * 0.5);
  });

  it("skips gravity while dashing but still integrates position", () => {
    const world = createWorld({ config: { gravity: 10, maxFallSpeed: 15 } });

    world.state.player.dash.active = true;
    world.state.player.vx = 3;
    world.state.player.vy = -4;

    applyPhysics(world, 2);

    expect(world.state.player.vy).toBe(-4);
    expect(world.state.player.x).toBe(3 * 2 + world.config.world.width * 0.5);
    expect(world.state.player.y).toBe(-4 * 2 + world.config.world.height * 0.5);
  });
});

describe("bounds handling", () => {
  it("validates bounds and player inputs", () => {
    expect(() => new BoundsHandler()).toThrow("World bounds required.");
    expect(() => new BoundsHandler({ width: 10, height: 10 }).resolve()).toThrow("Player required.");
  });

  it("resolves left and right boundary bounces", () => {
    const handler = new BoundsHandler({ width: 10, height: 10 });
    const player = { x: -1, y: 5, vx: -3, vy: 0, wallBounces: 0 };

    const bounces = handler.resolve(player);

    expect(player.x).toBe(0);
    expect(player.vx).toBe(3);
    expect(bounces).toEqual([{ axis: "x", side: "left" }]);

    player.x = 12;
    player.vx = 4;

    const rightBounces = handler.resolve(player);

    expect(player.x).toBe(10);
    expect(player.vx).toBe(-4);
    expect(rightBounces).toEqual([{ axis: "x", side: "right" }]);
  });

  it("clamps without emitting when moving away from walls", () => {
    const handler = new BoundsHandler({ width: 10, height: 10 });
    const player = { x: -2, y: 0, vx: 5, vy: 0, wallBounces: 0 };

    const bounces = handler.resolve(player);

    expect(player.x).toBe(0);
    expect(player.vx).toBe(5);
    expect(bounces).toEqual([]);
  });

  it("resolves top and bottom boundary bounces", () => {
    const handler = new BoundsHandler({ width: 10, height: 10 });
    const player = { x: 5, y: -4, vx: 0, vy: -6, wallBounces: 0 };

    const topBounces = handler.resolve(player);

    expect(player.y).toBe(0);
    expect(player.vy).toBe(6);
    expect(topBounces).toEqual([{ axis: "y", side: "top" }]);

    player.y = 14;
    player.vy = 7;

    const bottomBounces = handler.resolve(player);

    expect(player.y).toBe(10);
    expect(player.vy).toBe(-7);
    expect(bottomBounces).toEqual([{ axis: "y", side: "bottom" }]);
  });

  it("emits bounce events and increments wall bounce count", () => {
    const world = createWorld({ config: { world: { width: 10, height: 10 } } });
    const events = createEvents();

    world.state.player.x = -5;
    world.state.player.vx = -2;
    world.state.player.y = 15;
    world.state.player.vy = 3;

    handleBounds(world, 0, events);

    expect(world.state.player.wallBounces).toBe(2);
    expect(events.emit).toHaveBeenNthCalledWith(1, "dash:bounce", { axis: "x", side: "left" });
    expect(events.emit).toHaveBeenNthCalledWith(2, "dash:bounce", { axis: "y", side: "bottom" });
  });
});

describe("stepWorld", () => {
  it("requires valid world and positive delta", () => {
    expect(() => stepWorld({})).toThrow("World state required.");

    const world = createWorld();
    expect(() => stepWorld({ world, dt: 0 })).toThrow("Step delta must be positive.");
  });

  it("runs pipeline and advances time", () => {
    const world = createWorld();
    const clock = { advance: vi.fn() };
    const pipeline = { run: vi.fn() };

    stepWorld({ world, dt: 0.25, clock, pipeline });

    expect(pipeline.run).toHaveBeenCalled();
    expect(world.state.tick).toBe(1);
    expect(world.state.time).toBeCloseTo(0.25, 5);
    expect(clock.advance).toHaveBeenCalledWith(250);
  });
});
