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

  it("rejects zero or negative step intervals", () => {
    const engine = new GameEngine({});
    expect(() => engine.step(0)).toThrow();
    expect(() => engine.step(-0.01)).toThrow();
  });

  it("supports jump/dash/phase ability commands with timers", () => {
    const engine = new GameEngine({
      config: { gravity: 0, dashDuration: 0.05, phaseDuration: 0.05 }
    });

    const jumpSnap = engine.command("jump");
    expect(jumpSnap.events.at(-1).type).toBe("player:jump");
    expect(engine.state.player.vy).toBeLessThan(0);

    engine.command("dash", { direction: "left" });
    expect(engine.state.player.dash.active).toBe(true);
    expect(engine.state.player.vx).toBeLessThan(0);
    expect(engine.events.events.at(-1).type).toBe("dash:start");

    engine.command("phase");
    expect(engine.state.player.invulnerable).toBe(true);

    engine.step(0.05);
    expect(engine.state.player.dash.active).toBe(false);
    expect(engine.state.player.invulnerable).toBe(false);
    const emittedTypes = engine.events.events.map((e) => e.type);
    expect(emittedTypes).toContain("dash:end");
    expect(emittedTypes).toContain("ability:phase:end");
  });

  it("bounces off world bounds and emits dash:bounce", () => {
    const engine = new GameEngine({
      config: { gravity: 0, world: { width: 2, height: 2 }, dashSpeed: 10, dashDuration: 0.1 }
    });
    engine.state.player.x = 1.9;
    engine.command("dash", { direction: "right" });
    const snap = engine.step(0.1);

    expect(snap.state.player.x).toBeCloseTo(2, 3);
    expect(snap.state.player.vx).toBeLessThan(0); // bounced
    expect(snap.state.player.wallBounces).toBe(1);
    expect(snap.events.at(-1).type).toBe("dash:bounce");
    expect(snap.events.at(-1).payload.side).toBe("right");
  });

  it("rejects unknown commands", () => {
    const engine = new GameEngine({});
    expect(() => engine.command("boost")).toThrow();
  });

  it("exposes seeded metadata in snapshots", () => {
    const engine = new GameEngine({ rngSeed: 404 });
    const snap = engine.getSnapshot();
    expect(snap.state.meta.seed).toBe(404);
    expect(() => {
      // @ts-expect-error verifying deep freeze on metadata
      snap.state.meta.seed = 1;
    }).toThrow();
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

  it("trims event history when configured", () => {
    const engine = new GameEngine({ config: { eventBufferSize: 2 } });
    engine.emit("a");
    engine.emit("b");
    engine.emit("c");
    const snap = engine.getSnapshot();

    expect(snap.events).toHaveLength(2);
    expect(snap.events[0].type).toBe("b");
    expect(snap.events[1].type).toBe("c");
  });
});
