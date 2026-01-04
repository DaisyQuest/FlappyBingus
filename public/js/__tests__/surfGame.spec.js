import { describe, expect, it, vi } from "vitest";
import { SurfGame, __testables } from "../surfGame.js";

function buildGame({ segments = [], inputKeys = {}, onGameOver } = {}) {
  const input = { keys: { ...inputKeys } };
  const game = new SurfGame({
    canvas: null,
    ctx: null,
    input,
    onGameOver: onGameOver || (() => {}),
    disableAutoTerrain: true
  });
  game.W = 1280;
  game.H = 720;
  game.startRun({ seed: "test" });
  game.setTerrainSegments(segments);
  return { game, input };
}

describe("surfGame physics", () => {
  it("applies gravity when space is held and dampens when released", () => {
    const { game, input } = buildGame({ inputKeys: { Space: true } });
    game.player.y = 100;
    game.player.vy = 0;
    game.player.grounded = false;

    game.update(1);
    const vyAfterGravity = game.player.vy;
    expect(vyAfterGravity).toBeGreaterThan(0);

    input.keys.Space = false;
    game.update(1);
    expect(game.player.vy).toBeLessThan(vyAfterGravity);
  });

  it("lands on downhill slopes and increments chain bonuses", () => {
    const segment = { x0: 0, y0: 300, x1: 200, y1: 420, type: "down" };
    const { game, input } = buildGame({ segments: [segment] });
    game.player.x = 100;
    game.player.y = 340;
    game.player.vy = 180;
    game.player.grounded = false;
    input.keys.Space = true;

    game.update(0.25);

    expect(game.player.grounded).toBe(true);
    expect(game.chain).toBe(1);
    expect(game.scoreBreakdown.chain.points).toBeGreaterThan(0);
  });

  it("resets chain on poor landings", () => {
    const segment = { x0: 0, y0: 360, x1: 200, y1: 260, type: "up" };
    const { game, input } = buildGame({ segments: [segment] });
    game.chain = 3;
    game.player.x = 100;
    game.player.y = 340;
    game.player.vy = 120;
    game.player.grounded = false;
    input.keys.Space = true;

    game.update(0.3);

    expect(game.chain).toBe(0);
  });

  it("ends the run after holding restart", () => {
    const onGameOver = vi.fn();
    const { game, input } = buildGame({ inputKeys: { KeyR: true }, onGameOver });
    game.update(0.7);

    expect(game.state).toBe(2);
    expect(onGameOver).toHaveBeenCalledTimes(1);
  });
});

describe("surfGame helpers", () => {
  it("computes slope tangents and landing quality", () => {
    const segment = { x0: 0, y0: 0, x1: 100, y1: 100 };
    const tangent = __testables.computeSlopeTangent(segment);
    expect(tangent.x).toBeCloseTo(0.71, 2);
    expect(tangent.y).toBeCloseTo(0.71, 2);

    const quality = __testables.landingQuality({ x: 10, y: 10 }, tangent);
    expect(quality).toBeGreaterThan(0.9);
  });

  it("identifies downhill segments", () => {
    expect(__testables.isDownhill({ x0: 0, y0: 100, x1: 20, y1: 150 })).toBe(true);
    expect(__testables.isDownhill({ x0: 0, y0: 100, x1: 20, y1: 90 })).toBe(false);
  });
});
