import { describe, expect, it } from "vitest";
import { GameEngine } from "../gameEngine.js";
import { createFixedStepLoop } from "../fixedStepLoop.js";

describe("fixed step loop", () => {
  it("requires an engine with step and command", () => {
    expect(() => createFixedStepLoop({})).toThrow("Engine with step");
  });

  it("validates stepSeconds and maxSteps", () => {
    const engine = new GameEngine({ config: { gravity: 0 } });
    expect(() => createFixedStepLoop({ engine, stepSeconds: 0 })).toThrow("Step seconds must be positive");
    expect(() => createFixedStepLoop({ engine, maxSteps: 0 })).toThrow("Max steps must be positive");
  });

  it("queues actions and applies them on the next tick", () => {
    const engine = new GameEngine({ config: { gravity: 0 } });
    const loop = createFixedStepLoop({ engine, stepSeconds: 0.1 });

    loop.enqueue("jump");
    const noStep = loop.advance(0.05);
    expect(noStep.steps).toBe(0);
    expect(engine.state.player.vy).toBe(0);
    expect(loop.getQueueLength()).toBe(1);

    const stepped = loop.advance(0.05);
    expect(stepped.steps).toBe(1);
    expect(engine.state.player.vy).toBeLessThan(0);
    expect(loop.getQueueLength()).toBe(0);
  });

  it("applies multiple queued actions before stepping", () => {
    const engine = new GameEngine({ config: { gravity: 0 } });
    const loop = createFixedStepLoop({ engine, stepSeconds: 0.1 });

    loop.enqueue("jump");
    loop.enqueue("dash", { direction: "right" });
    const { snapshots } = loop.advance(0.1);

    const types = snapshots[0].events.map((event) => event.type);
    expect(types).toContain("player:jump");
    expect(types).toContain("dash:start");
  });

  it("caps steps to maxSteps and preserves accumulator", () => {
    const engine = new GameEngine({ config: { gravity: 0 } });
    const loop = createFixedStepLoop({ engine, stepSeconds: 0.1, maxSteps: 1 });

    const { steps, accumulator } = loop.advance(0.25);

    expect(steps).toBe(1);
    expect(accumulator).toBeCloseTo(0.15, 5);
  });

  it("rejects invalid action names and negative delta times", () => {
    const engine = new GameEngine({ config: { gravity: 0 } });
    const loop = createFixedStepLoop({ engine, stepSeconds: 0.1 });

    expect(() => loop.enqueue("")).toThrow("Action name is required");
    expect(() => loop.advance(-0.1)).toThrow("Delta time must be non-negative");
  });

  it("clears queued actions explicitly", () => {
    const engine = new GameEngine({ config: { gravity: 0 } });
    const loop = createFixedStepLoop({ engine, stepSeconds: 0.1 });

    loop.enqueue("jump");
    expect(loop.getQueueLength()).toBe(1);
    loop.clearQueue();
    expect(loop.getQueueLength()).toBe(0);
  });
});
