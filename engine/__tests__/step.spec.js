import { describe, expect, it, vi } from "vitest";
import { createFixedClock } from "../clock.js";
import { createWorld } from "../world.js";
import { stepWorld } from "../step.js";

describe("stepWorld", () => {
  it("advances tick, time, and clock using default systems", () => {
    const world = createWorld({ config: { gravity: 0 } });
    const clock = createFixedClock(0);

    stepWorld({ world, dt: 0.1, clock });

    expect(world.state.tick).toBe(1);
    expect(world.state.time).toBeCloseTo(0.1, 5);
    expect(clock.now()).toBeCloseTo(100, 5);
  });

  it("throws for invalid dt and missing world", () => {
    const world = createWorld();
    expect(() => stepWorld({ world, dt: 0 })).toThrow("Step delta must be positive");
    expect(() => stepWorld({ world: null, dt: 0.1 })).toThrow("World state required");
  });

  it("runs custom systems and ignores non-functions", () => {
    const world = createWorld();
    const events = { emit: vi.fn() };
    const system = vi.fn((currentWorld, dt, evt) => {
      currentWorld.state.score.time += dt;
      evt.emit("tick");
    });

    stepWorld({ world, dt: 0.2, events, systems: [system, null] });

    expect(system).toHaveBeenCalledWith(world, 0.2, events);
    expect(world.state.score.time).toBeCloseTo(0.2, 5);
    expect(events.emit).toHaveBeenCalledWith("tick");
  });

  it("supports an empty system list", () => {
    const world = createWorld();
    stepWorld({ world, dt: 0.05, systems: [] });
    expect(world.state.tick).toBe(1);
  });
});
