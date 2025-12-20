import { describe, expect, it } from "vitest";
import { GameEngine } from "../gameEngine.js";
import { createFixedClock } from "../clock.js";
import { createRng } from "../rng.js";

describe("GameEngine", () => {
  it("advances time and tick deterministically", () => {
    const clock = createFixedClock(0);
    const engine = new GameEngine({ rngSeed: 123, rng: createRng(123), clock });

    const snap1 = engine.step(0.016);
    const snap2 = engine.step(0.016);

    expect(snap1.state.tick).toBe(1);
    expect(snap2.state.tick).toBe(2);
    expect(snap2.state.time).toBeCloseTo(0.032, 5);
    expect(clock.now()).toBeCloseTo(32, 5); // ms
  });

  it("keeps snapshots immutable", () => {
    const engine = new GameEngine({});
    const snap = engine.step(0.02);

    expect(() => {
      // @ts-expect-error testing immutability
      snap.state.time = 99;
    }).toThrow();
    expect(engine.state.time).not.toBe(99);
  });

  it("records events with clock time", () => {
    const clock = createFixedClock(0);
    const engine = new GameEngine({ clock });
    engine.emit("score:orb", { value: 1 });
    engine.step(0.01);
    engine.emit("gate:entered", { id: "g1" });

    const snap = engine.getSnapshot();
    expect(snap.events).toHaveLength(2);
    expect(snap.events[0].time).toBe(0);
    expect(snap.events[1].time).toBeCloseTo(10, 5);
  });
});
