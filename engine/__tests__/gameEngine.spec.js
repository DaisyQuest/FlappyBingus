import { describe, expect, it, vi } from "vitest";
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
    const dashStartIndex = engine.events.events.findIndex((e) => e.type === "dash:start");
    const animDashIndex = engine.events.events.findIndex((e) => e.type === "anim:dash");
    expect(dashStartIndex).toBeGreaterThan(-1);
    expect(animDashIndex).toBeGreaterThan(dashStartIndex);

    engine.command("phase");
    expect(engine.state.player.invulnerable).toBe(true);
    const phaseStartIndex = engine.events.events.findIndex((e) => e.type === "ability:phase:start");
    const animPhaseIndex = engine.events.events.findIndex((e) => e.type === "anim:phase");
    expect(phaseStartIndex).toBeGreaterThan(-1);
    expect(animPhaseIndex).toBeGreaterThan(phaseStartIndex);

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

  it("rejects unsupported dash directions", () => {
    const engine = new GameEngine({});
    expect(() => engine.command("dash", { direction: "diagonal" })).toThrow();
  });

  it("defaults dash direction to right when omitted", () => {
    const engine = new GameEngine({ config: { dashSpeed: 50, dashDuration: 0.1 } });
    engine.command("dash");
    expect(engine.state.player.dash.active).toBe(true);
    expect(engine.state.player.vx).toBe(50);
    expect(engine.state.player.vy).toBe(0);
  });

  it("ticks down dash timer and emits dash:end exactly once", () => {
    const engine = new GameEngine({ config: { gravity: 0, dashDuration: 0.05 } });
    engine.command("dash", { direction: "left" });
    engine.step(0.03);
    engine.step(0.02);
    engine.step(0.02);

    const dashEndEvents = engine.events.events.filter((e) => e.type === "dash:end");
    expect(dashEndEvents).toHaveLength(1);
    expect(engine.state.player.dash.active).toBe(false);
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
    expect(snap.events).toHaveLength(3);
    expect(snap.events[0].type).toBe("score:orb");
    expect(snap.events[1].type).toBe("anim:orbPickup");
    expect(snap.events[2].type).toBe("gate:entered");
    expect(snap.events[0].time).toBe(0);
    expect(snap.events[1].time).toBe(0);
    expect(snap.events[2].time).toBeCloseTo(10, 5);
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

  it("caps fall speed at configured max when not dashing", () => {
    const engine = new GameEngine({ config: { gravity: 2000, maxFallSpeed: 300 } });
    engine.state.player.vy = 250;
    engine.step(0.2);
    expect(engine.state.player.vy).toBe(300);
  });

  it("keeps horizontal velocity when gravity applies without dash", () => {
    const engine = new GameEngine({ config: { gravity: 100, world: { width: 10, height: 10 } } });
    engine.state.player.vx = 5;
    const snap = engine.step(0.1);
    expect(snap.state.player.vx).toBeCloseTo(5, 5);
    expect(snap.state.player.vy).toBeGreaterThan(0); // gravity applied
  });

  it("skips gravity while dashing and resumes afterward", () => {
    const engine = new GameEngine({ config: { gravity: 1000, dashDuration: 0.05 } });
    engine.command("dash", { direction: "up" });
    const vyDuringDash = engine.state.player.vy;
    const dashSnap = engine.step(0.025); // still dashing
    expect(engine.state.player.vy).toBeCloseTo(vyDuringDash, 5);
    expect(dashSnap.events.some((e) => e.type === "dash:end")).toBe(false);

    engine.step(0.05); // dash should end
    expect(engine.state.player.dash.active).toBe(false);
    expect(engine.state.player.vy).toBeGreaterThan(vyDuringDash); // gravity applied
  });

  it("handles top, bottom, and left boundary collisions with bounce events", () => {
    const engine = new GameEngine({
      config: { gravity: 0, world: { width: 2, height: 2 }, dashSpeed: 10, dashDuration: 0.01 }
    });
    engine.state.player = { x: 0.1, y: 0.1, vx: -5, vy: -5, dash: { active: true, time: 0.01, direction: "left" }, invulnerable: false, invulnTime: 0, wallBounces: 0 };

    const snapTopLeft = engine.step(0.05);
    expect(snapTopLeft.state.player.x).toBe(0);
    expect(snapTopLeft.state.player.y).toBe(0);
    expect(snapTopLeft.state.player.vx).toBeGreaterThan(0); // reversed
    expect(snapTopLeft.state.player.vy).toBeGreaterThan(0);

    engine.state.player.vx = 0;
    engine.state.player.vy = 5;
    engine.state.player.x = 1;
    engine.state.player.y = 1.95;
    const snapBottom = engine.step(0.02);
    const bottomBounce = snapBottom.events.find((e) => e.payload?.side === "bottom");
    expect(bottomBounce).toBeTruthy();
    expect(snapBottom.state.player.wallBounces).toBeGreaterThan(0);
    expect(snapBottom.state.player.vy).toBeLessThan(0);
  });

  it("emits multiple bounce events when colliding with a corner", () => {
    const engine = new GameEngine({
      config: { gravity: 0, world: { width: 1, height: 1 } }
    });
    engine.state.player = { x: 1.2, y: 1.3, vx: 5, vy: 6, dash: { active: false, time: 0, direction: null }, invulnerable: false, invulnTime: 0, wallBounces: 0 };

    const snap = engine.step(0.05);
    const sides = snap.events.filter((e) => e.type === "dash:bounce").map((e) => e.payload.side);
    expect(sides).toContain("right");
    expect(sides).toContain("bottom");
    expect(snap.state.player.wallBounces).toBe(2);
  });

  it("does not emit bounce events when player is already inside bounds", () => {
    const engine = new GameEngine({ config: { world: { width: 5, height: 5 }, gravity: 0 } });
    engine.state.player = {
      x: 2,
      y: 2,
      vx: 0,
      vy: 0,
      dash: { active: false, time: 0, direction: null },
      invulnerable: false,
      invulnTime: 0,
      wallBounces: 0
    };

    const snap = engine.step(0.1);
    const bounceEvents = snap.events.filter((e) => e.type === "dash:bounce");

    expect(bounceEvents).toHaveLength(0);
    expect(snap.state.player.wallBounces).toBe(0);
  });

  it("maintains tick and time progression when abilities expire exactly at zero", () => {
    const engine = new GameEngine({ config: { gravity: 0, dashDuration: 0.01, phaseDuration: 0.01 } });
    engine.command("dash", { direction: "left" });
    engine.command("phase");
    const snap = engine.step(0.01);

    expect(snap.state.player.dash.active).toBe(false);
    expect(snap.state.player.invulnerable).toBe(false);
    expect(snap.events.some((e) => e.type === "dash:end")).toBe(true);
    expect(snap.events.some((e) => e.type === "ability:phase:end")).toBe(true);
    expect(snap.state.time).toBeCloseTo(0.01, 5);
    expect(snap.state.tick).toBe(1);
  });

  it("applies gravity the same frame a dash expires", () => {
    const engine = new GameEngine({ config: { gravity: 1000, dashDuration: 0.01 } });
    engine.command("dash", { direction: "up" });

    const beforeVy = engine.state.player.vy;
    const snap = engine.step(0.02); // dash ends during this frame
    const afterVy = snap.state.player.vy;

    expect(beforeVy).toBeLessThan(0);
    expect(afterVy).toBeGreaterThan(beforeVy); // gravity applied after dash end
    expect(snap.state.player.dash.active).toBe(false);
    expect(snap.events.filter((e) => e.type === "dash:end")).toHaveLength(1);
  });

  it("clamps positions without bounce events when moving back into bounds", () => {
    const engine = new GameEngine({ config: { gravity: 0, world: { width: 5, height: 5 } } });
    engine.state.player = {
      x: -1,
      y: 6,
      vx: 1,
      vy: -1,
      dash: { active: false, time: 0, direction: null },
      invulnerable: false,
      invulnTime: 0,
      wallBounces: 0
    };

    const snap = engine.step(0.01);
    expect(snap.state.player.x).toBe(0);
    expect(snap.state.player.y).toBe(5);
    expect(snap.state.player.vx).toBe(1);
    expect(snap.state.player.vy).toBe(-1);
    expect(snap.events.filter((e) => e.type === "dash:bounce")).toHaveLength(0);
    expect(snap.state.player.wallBounces).toBe(0);
  });

  it("does not cap upward velocity when below the fall speed limit", () => {
    const engine = new GameEngine({ config: { gravity: 100, maxFallSpeed: 200 } });
    engine.state.player.vy = -150; // moving upward faster than gravity can fully negate in one tick
    const snap = engine.step(0.05);

    expect(snap.state.player.vy).toBeLessThan(0);
    expect(snap.state.player.vy).toBeGreaterThan(-150); // gravity applied but not clamped to +200
  });

  it("preserves default world dimensions when partially overriding config", () => {
    const engine = new GameEngine({ config: { world: { width: 120 } } });
    const snap = engine.getSnapshot();

    expect(snap.state.player.x).toBeCloseTo(60, 5); // width / 2
    expect(snap.state.player.y).toBeCloseTo(150, 5); // default height / 2
    expect(engine.config.world.height).toBe(300);
  });

  it("emits phase end only once even after multiple steps", () => {
    const engine = new GameEngine({ config: { gravity: 0, phaseDuration: 0.01 } });
    engine.command("phase");
    engine.step(0.02);
    engine.step(0.02);

    const phaseEnds = engine.events.events.filter((e) => e.type === "ability:phase:end");
    expect(phaseEnds).toHaveLength(1);
    expect(engine.state.player.invulnerable).toBe(false);
  });

  it("exposes deterministic system names", () => {
    const engine = new GameEngine();

    expect(engine.getSystemNames()).toEqual(["tickAbilities", "applyPhysics", "handleBounds"]);
  });

  it("accepts a custom system pipeline", () => {
    const run = vi.fn();
    const engine = new GameEngine({
      pipeline: {
        systems: [{ name: "custom", run }],
        run
      }
    });

    expect(engine.getSystemNames()).toEqual(["custom"]);
    engine.step(0.01);
    expect(run).toHaveBeenCalled();
  });

  it("keeps rng-driven systems deterministic for the same seed", () => {
    const systems = [
      {
        name: "rng-score",
        run: ({ world, rng }) => {
          world.state.score.time = rng.next();
        }
      }
    ];

    const engineA = new GameEngine({ rngSeed: 10, systems });
    const engineB = new GameEngine({ rngSeed: 10, systems });
    const engineC = new GameEngine({ rngSeed: 11, systems });

    engineA.step(0.01);
    engineB.step(0.01);
    engineC.step(0.01);

    expect(engineA.state.score.time).toBeCloseTo(engineB.state.score.time, 7);
    expect(engineA.state.score.time).not.toBe(engineC.state.score.time);
  });
});
