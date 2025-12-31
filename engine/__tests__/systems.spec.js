import { describe, expect, it, vi } from "vitest";
import { createWorld } from "../world.js";
import { tickAbilities } from "../systems/abilities.js";
import { applyPhysics } from "../systems/physics.js";
import { handleBounds } from "../systems/bounds.js";

describe("systems", () => {
  it("ticks abilities and emits end events", () => {
    const world = createWorld({ config: { dashDuration: 0.01, phaseDuration: 0.01 } });
    const events = { emit: vi.fn() };
    world.state.player.dash = { active: true, time: 0.01, direction: "left" };
    world.state.player.invulnerable = true;
    world.state.player.invulnTime = 0.01;

    tickAbilities(world, 0.02, events);

    expect(world.state.player.dash.active).toBe(false);
    expect(world.state.player.invulnerable).toBe(false);
    expect(events.emit).toHaveBeenCalledWith("dash:end", { direction: "left" });
    expect(events.emit).toHaveBeenCalledWith("ability:phase:end", {});
  });

  it("throws when ticking abilities without world state", () => {
    expect(() => tickAbilities(null, 0.1)).toThrow("World state required");
  });

  it("applies physics with gravity when not dashing", () => {
    const world = createWorld({ config: { gravity: 1000, maxFallSpeed: 300 } });
    world.state.player.vy = 250;
    world.state.player.vx = 5;

    applyPhysics(world, 0.2);

    expect(world.state.player.vy).toBe(300);
    expect(world.state.player.x).toBeCloseTo(world.config.world.width * 0.5 + 1, 5);
    expect(world.state.player.y).toBeGreaterThan(world.config.world.height * 0.5);
  });

  it("skips gravity while dashing but still integrates motion", () => {
    const world = createWorld({ config: { gravity: 1000 } });
    world.state.player.dash.active = true;
    world.state.player.vy = -10;
    world.state.player.vx = 2;

    applyPhysics(world, 0.5);

    expect(world.state.player.vy).toBe(-10);
    expect(world.state.player.x).toBeCloseTo(world.config.world.width * 0.5 + 1, 5);
  });

  it("throws when applying physics without required data", () => {
    expect(() => applyPhysics({ state: {} }, 0.1)).toThrow("World state and config required");
  });

  it("handles bounds and emits bounce events", () => {
    const world = createWorld({ config: { world: { width: 2, height: 2 }, gravity: 0 } });
    const events = { emit: vi.fn() };
    world.state.player.x = 3;
    world.state.player.y = -1;
    world.state.player.vx = 5;
    world.state.player.vy = -4;

    handleBounds(world, 0, events);

    expect(world.state.player.x).toBe(2);
    expect(world.state.player.y).toBe(0);
    expect(world.state.player.vx).toBeLessThan(0);
    expect(world.state.player.vy).toBeGreaterThan(0);
    expect(events.emit).toHaveBeenCalledWith("dash:bounce", { axis: "x", side: "right" });
    expect(events.emit).toHaveBeenCalledWith("dash:bounce", { axis: "y", side: "top" });
    expect(world.state.player.wallBounces).toBe(2);
  });

  it("does not emit bounce events when inside bounds", () => {
    const world = createWorld({ config: { world: { width: 2, height: 2 }, gravity: 0 } });
    const events = { emit: vi.fn() };

    handleBounds(world, 0, events);

    expect(events.emit).not.toHaveBeenCalled();
    expect(world.state.player.wallBounces).toBe(0);
  });

  it("throws when handling bounds without required data", () => {
    expect(() => handleBounds({ state: {} }, 0)).toThrow("World state and config required");
  });
});
