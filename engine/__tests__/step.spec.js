import { describe, expect, it, vi } from "vitest";
import { createFixedClock } from "../clock.js";
import { createWorld } from "../world.js";
import { createSystemPipeline } from "../systemPipeline.js";
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

  it("uses an injected pipeline when provided", () => {
    const world = createWorld();
    const events = { emit: vi.fn() };
    const pipeline = createSystemPipeline([
      {
        name: "mutator",
        run: ({ world: ctxWorld }) => {
          ctxWorld.state.score.perfect += 1;
        }
      }
    ]);

    stepWorld({ world, dt: 0.1, events, pipeline });

    expect(world.state.score.perfect).toBe(1);
  });

  it("provides rng and clock in the context for context-mode systems", () => {
    const world = createWorld();
    const events = { emit: vi.fn() };
    const clock = createFixedClock(0);
    const rng = { next: vi.fn(() => 0.5) };
    const system = vi.fn(({ rng: ctxRng, clock: ctxClock }) => {
      ctxRng.next();
      ctxClock.advance(10);
    });
    const pipeline = createSystemPipeline([{ name: "context", run: system }]);

    stepWorld({ world, dt: 0.1, events, clock, rng, pipeline });

    expect(system).toHaveBeenCalled();
    expect(rng.next).toHaveBeenCalled();
    expect(clock.now()).toBeCloseTo(110, 5);
  });
});
