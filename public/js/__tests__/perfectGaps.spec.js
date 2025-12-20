import { describe, expect, it, vi } from "vitest";
import { Gate } from "../entities.js";
import { resolveGapPerfect } from "../perfectGaps.js";

function makeGame() {
  return {
    score: 0,
    perfectCombo: 0,
    perfectT: 0,
    perfectMax: 0,
    _gapMeta: new Map(),
    _perfectNiceSfx: vi.fn()
  };
}

function prepGate({ axis = "x", prev = 40, pos = 60, v = 20, gapCenter = 120, gapHalf = 30, gapId = 1 }) {
  const gate = new Gate(axis, pos, v, gapCenter, gapHalf, 12);
  gate.prev = prev;
  gate.entered = true;
  gate.gapId = gapId;
  return gate;
}

describe("resolveGapPerfect", () => {
  it("awards perfects on both axes with leniency and updates combo/meta", () => {
    const gameX = makeGame();
    const gateX = prepGate({ axis: "x", gapCenter: 150, gapHalf: 40, gapId: 11 });
    gameX._gapMeta.set(11, { perfected: false });

    const resX = resolveGapPerfect({
      gate: gateX,
      game: gameX,
      playerAxis: 50,
      prevPerpAxis: 150,
      currPerpAxis: 150,
      bonus: 10,
      flashDuration: 0.6,
      windowScale: 0.2,
      leniency: 0.10
    });

    expect(resX.awarded).toBe(true);
    expect(gameX.score).toBe(10);
    expect(gameX.perfectCombo).toBe(1);
    expect(gameX._gapMeta.get(11).perfected).toBe(true);
    expect(gameX.perfectT).toBeGreaterThan(0);

    const gameY = makeGame();
    const gateY = prepGate({ axis: "y", prev: 80, pos: 60, v: -30, gapCenter: 200, gapHalf: 32, gapId: 22 });
    gameY._gapMeta.set(22, { perfected: false });

    const resY = resolveGapPerfect({
      gate: gateY,
      game: gameY,
      playerAxis: 70,
      prevPerpAxis: 205.5,
      currPerpAxis: 205.5,
      bonus: 12,
      flashDuration: 0.6,
      windowScale: 0.25,
      leniency: 0.10
    });

    expect(resY.awarded).toBe(true);
    expect(resY.distance).toBeLessThanOrEqual(resY.threshold);
    expect(gameY.score).toBe(12);
    expect(gameY.perfectCombo).toBe(1);
    expect(gameY._gapMeta.get(22).perfected).toBe(true);
  });

  it("allows a second pass through a gap to earn perfect if first was missed", () => {
    const game = makeGame();
    const gate = prepGate({ axis: "x", gapCenter: 100, gapHalf: 20, gapId: 33 });
    game._gapMeta.set(33, { perfected: false });

    // First pass: outside the perfect window -> no award.
    const miss = resolveGapPerfect({
      gate,
      game,
      playerAxis: 50,
      prevPerpAxis: 112,
      currPerpAxis: 112,
      bonus: 10,
      windowScale: 0.2,
      leniency: 0.10
    });
    expect(miss.awarded).toBe(false);
    expect(game.perfectCombo).toBe(0);
    expect(gate.cleared).toBe(true);
    expect(gate.perfected).toBe(false);

    // Second pass through the same gap: centered -> perfect now counts.
    gate.prev = 60; gate.pos = 80;
    const hit = resolveGapPerfect({
      gate,
      game,
      playerAxis: 70,
      prevPerpAxis: 100,
      currPerpAxis: 100,
      bonus: 10,
      windowScale: 0.2,
      leniency: 0.10
    });

    expect(hit.awarded).toBe(true);
    expect(game.score).toBe(10);
    expect(game.perfectCombo).toBe(1);
    expect(gate.perfected).toBe(true);
    expect(game._gapMeta.get(33).perfected).toBe(true);
  });
});
