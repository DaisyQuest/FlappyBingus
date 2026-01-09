import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnBurst, spawnCrossfire, spawnSinglePipe, spawnWall } from "../pipes/pipeSpawner.js";
import {
  computeSinglePipeWarningSegments,
  computeWallWarningSegments,
  computeWarningAlpha
} from "../pipes/pipeWarnings.js";
import { spawnOrb } from "../orbs/orbSpawner.js";
import { createSeededRand, setRandSource } from "../util.js";

function makeGame() {
  return {
    W: 200,
    H: 150,
    player: { x: 100, y: 75, r: 10 },
    pipes: [],
    gates: [],
    orbs: [],
    _gapMeta: new Map(),
    _nextGapId: 1,
    score: 0,
    timeAlive: 1,
    cfg: {
      catalysts: {
        orbs: {
          enabled: true,
          maxOnScreen: 3,
          radius: 12,
          lifetime: 5,
          safeDistance: 20,
          driftSpeedMin: 10,
          driftSpeedMax: 20,
          spawnSpread: {
            timeToMax: 2,
            scoreToMax: 100,
            mixTime: 0.5,
            mixScore: 0.5,
            startFraction: 1,
            endFraction: 0.8,
            maxRadiusMul: 1.5,
            maxLifetimeMul: 1.2
          }
        }
      }
    },
    _thickness: () => 20,
    _pipeSpeed: () => 100,
    _gapSize: () => 80,
    _difficulty01: () => 0.5
  };
}

beforeEach(() => {
  setRandSource(createSeededRand("spawn-tests"));
});

afterEach(() => {
  setRandSource();
});

describe("spawnSinglePipe", () => {
  it("aims at player when requested", () => {
    const game = makeGame();
    spawnSinglePipe(game, { side: 0, aimAtPlayer: true });
    expect(game.pipes).toHaveLength(1);
    expect(game.pipes[0].vx).toBeGreaterThan(0);
    expect(game.pipes[0].vy).not.toBe(0);
  });

  it("honors side selection and speed sign", () => {
    const game = makeGame();
    spawnSinglePipe(game, { side: 1, aimAtPlayer: false, speed: 150 });
    expect(game.pipes[0].vx).toBeLessThan(0);
    expect(Math.abs(game.pipes[0].vx)).toBeGreaterThan(0);
  });

  it("spawns vertical pipes from the top and bottom edges", () => {
    const game = makeGame();
    spawnSinglePipe(game, { side: 2, aimAtPlayer: false });
    spawnSinglePipe(game, { side: 3, aimAtPlayer: false });
    expect(game.pipes[0].vy).toBeGreaterThan(0);
    expect(game.pipes[1].vy).toBeLessThan(0);
  });

  it("anchors aimed pipes just outside the selected side", () => {
    const game = makeGame();
    spawnSinglePipe(game, { side: 3, aimAtPlayer: true, speed: 120 });
    expect(game.pipes[0].y).toBeCloseTo(game.H + 14, 5);
  });

  it("positions aimed pipes above the arena when spawned from the top", () => {
    const game = makeGame();
    spawnSinglePipe(game, { side: 2, aimAtPlayer: true, speed: 120 });
    expect(game.pipes[0].y).toBeLessThan(0);
  });
});

describe("spawnWall", () => {
  it("builds paired pipes and gate per wall", () => {
    const game = makeGame();
    spawnWall(game, { side: 0, gap: 60 });
    expect(game.pipes).toHaveLength(2);
    expect(game.gates).toHaveLength(1);
    expect(game.gates[0].axis).toBe("x");
    expect(game.gates[0].gapHalf).toBeCloseTo(30, 5);
    expect(game._gapMeta.size).toBe(1);
  });

  it("supports vertical walls with y-axis gate", () => {
    const game = makeGame();
    spawnWall(game, { side: 2, gap: 50, speed: 120 });
    expect(game.pipes.length).toBeGreaterThan(0);
    expect(game.gates[0].axis).toBe("y");
    expect(Math.abs(game.gates[0].v)).toBeCloseTo(120, 5);
  });

  it("spawns downward-moving walls when sourced from the bottom", () => {
    const game = makeGame();
    spawnWall(game, { side: 3, gap: 40, speed: 90 });
    expect(game.pipes.some((pipe) => pipe.vy < 0)).toBe(true);
  });

  it("skips pipes that fall below minimum length on horizontal walls", () => {
    const game = makeGame();
    setRandSource(() => 1);
    spawnWall(game, { side: 0, gap: 400 });
    expect(game.pipes).toHaveLength(1);
    expect(game.pipes[0].h).toBeGreaterThan(10);
  });

  it("skips pipes that fall below minimum length on vertical walls", () => {
    const game = makeGame();
    setRandSource(() => 1);
    spawnWall(game, { side: 2, gap: 400 });
    expect(game.pipes).toHaveLength(1);
    expect(game.pipes[0].w).toBeGreaterThan(10);
  });

  it("skips gap bookkeeping when metadata storage is missing", () => {
    const game = makeGame();
    game._gapMeta = null;
    spawnWall(game, { side: 1, gap: 50 });
    expect(game.gates).toHaveLength(1);
  });
});

describe("spawnBurst", () => {
  it("creates multiple aimed pipes based on difficulty", () => {
    const game = makeGame();
    spawnBurst(game);
    expect(game.pipes).toHaveLength(6); // lerp(5,8,0.5) floored
    const vxVals = game.pipes.map((p) => p.vx);
    expect(vxVals.every((v) => Math.abs(v) > 0)).toBe(true);
  });

  it("anchors single-burst timing when difficulty collapses to one pipe", () => {
    const game = makeGame();
    game._difficulty01 = () => -1.2;
    setRandSource(() => 0);
    spawnBurst(game);
    expect(game.pipes).toHaveLength(1);
    expect(game.pipes[0].vx).toBeGreaterThan(0);
  });
});

describe("spawnCrossfire", () => {
  it("creates a four-direction pipe volley", () => {
    const game = makeGame();
    spawnCrossfire(game);
    expect(game.pipes).toHaveLength(4);
    const vxSigns = game.pipes.map((p) => Math.sign(p.vx));
    expect(vxSigns.filter((s) => s !== 0)).not.toHaveLength(0);
  });
});

describe("spawnOrb", () => {
  it("respects max orbs and safe spacing", () => {
    const game = makeGame();
    spawnOrb(game);
    expect(game.orbs).toHaveLength(1);
    const orb = game.orbs[0];
    const dist = Math.hypot(orb.x - game.player.x, orb.y - game.player.y);
    expect(dist).toBeGreaterThan(game.player.r + game.cfg.catalysts.orbs.safeDistance - 1e-6);
  });

  it("does not spawn when capped", () => {
    const game = makeGame();
    game.orbs = [{}, {}, {}];
    spawnOrb(game);
    expect(game.orbs).toHaveLength(3);
  });

  it("skips spawning when disabled", () => {
    const game = makeGame();
    game.cfg.catalysts.orbs.enabled = false;
    spawnOrb(game);
    expect(game.orbs).toHaveLength(0);
  });

  it("falls back to full bounds when spread is too tight", () => {
    const game = makeGame();
    game.cfg.catalysts.orbs.spawnSpread.startFraction = 0.05;
    game.cfg.catalysts.orbs.spawnSpread.endFraction = 0.05;
    spawnOrb(game);
    const orb = game.orbs[0];
    expect(orb.x).toBeGreaterThanOrEqual(orb.r + 10);
    expect(orb.x).toBeLessThanOrEqual(game.W - orb.r - 10);
  });

  it("keeps centered spawns when safe distance cannot be satisfied", () => {
    const game = makeGame();
    game.cfg.catalysts.orbs.safeDistance = 10000;
    spawnOrb(game);
    const orb = game.orbs[0];
    expect(orb.x).toBeCloseTo(game.W * 0.5, 5);
    expect(orb.y).toBeCloseTo(game.H * 0.5, 5);
  });
});

describe("pipe warning helpers", () => {
  it("computes wall warning segments with a centered gap (left side)", () => {
    const segments = computeWallWarningSegments({
      side: 0,
      gapCenter: 50,
      gapSize: 20,
      width: 200,
      height: 100
    });
    expect(segments).toEqual([
      { start: 0, end: 40 },
      { start: 60, end: 100 }
    ]);
  });

  it("computes wall warning segments with a centered gap (top side)", () => {
    const segments = computeWallWarningSegments({
      side: 2,
      gapCenter: 100,
      gapSize: 40,
      width: 200,
      height: 120
    });
    expect(segments).toEqual([
      { start: 0, end: 80 },
      { start: 120, end: 200 }
    ]);
  });

  it("drops the short segment when the gap hugs an edge", () => {
    const segments = computeWallWarningSegments({
      side: 1,
      gapCenter: 8,
      gapSize: 20,
      width: 200,
      height: 100
    });
    expect(segments).toEqual([{ start: 18, end: 100 }]);
  });

  it("computes single pipe warning segments and clamps to bounds", () => {
    const segmentsLeft = computeSinglePipeWarningSegments({
      side: 0,
      x: -12,
      y: -5,
      w: 20,
      h: 40,
      width: 200,
      height: 100
    });
    const segmentsTop = computeSinglePipeWarningSegments({
      side: 2,
      x: 190,
      y: -10,
      w: 30,
      h: 20,
      width: 200,
      height: 100
    });
    expect(segmentsLeft).toEqual([{ start: 0, end: 35 }]);
    expect(segmentsTop).toEqual([{ start: 190, end: 200 }]);
  });

  it("computes warning alpha bounds deterministically", () => {
    const min = computeWarningAlpha({ time: 0, flashHz: 2, minAlpha: 0.2, maxAlpha: 0.8 });
    const max = computeWarningAlpha({ time: 0.125, flashHz: 2, minAlpha: 0.2, maxAlpha: 0.8 });
    const flat = computeWarningAlpha({ time: 2, flashHz: 0, minAlpha: 0.4, maxAlpha: 0.6 });
    expect(min).toBeCloseTo(0.2, 5);
    expect(max).toBeCloseTo(0.8, 5);
    expect(flat).toBeCloseTo(0.4, 5);
  });
});
