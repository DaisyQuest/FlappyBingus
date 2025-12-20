import { describe, expect, it } from "vitest";
import { spawnGate, spawnOrb, spawnOrbCluster, spawnPipe, runFixedSteps } from "../fixtures.js";
import { GameEngine } from "../gameEngine.js";

describe("fixture builders", () => {
  it("creates independent pipe/gate/orb fixtures with defaults", () => {
    const pipe = spawnPipe({ x: 10, y: 20 });
    const gate = spawnGate({ axis: "y", pos: 100, v: -5 });
    const orb = spawnOrb({ x: 1, y: 2, life: 3 });

    expect(pipe).toMatchObject({ kind: "pipe", x: 10, y: 20, w: 64, h: 256 });
    expect(gate.axis).toBe("y");
    expect(gate.pos).toBe(100);
    expect(gate.v).toBe(-5);
    expect(orb.life).toBe(3);
    expect(orb.max).toBe(3);
  });

  it("creates orb clusters with spacing", () => {
    const cluster = spawnOrbCluster({ count: 3, startX: 0, startY: 10, spacing: 5 });
    expect(cluster).toHaveLength(3);
    expect(cluster[1].x - cluster[0].x).toBe(5);
    expect(cluster[0].y).toBe(10);
  });
});

describe("runFixedSteps", () => {
  it("runs the engine for the provided number of steps", () => {
    const engine = new GameEngine({});
    const snaps = runFixedSteps(engine, 0.01, 3);
    expect(snaps).toHaveLength(3);
    expect(snaps.at(-1).state.tick).toBe(3);
    expect(snaps.at(-1).state.time).toBeCloseTo(0.03, 5);
  });

  it("validates inputs", () => {
    expect(() => runFixedSteps(null, 0.01, 1)).toThrow();
    const engine = new GameEngine({});
    expect(() => runFixedSteps(engine, -1, 1)).toThrow();
    expect(() => runFixedSteps(engine, 0.01, 0)).toThrow();
  });
});
