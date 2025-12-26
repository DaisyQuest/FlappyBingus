import { describe, expect, it, vi } from "vitest";
import { Gate } from "../entities.js";
import { getPerfectGapThreshold, resolveGapPerfect, resolvePerfectGapAlignment } from "../perfectGaps.js";

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
    gameX._recordPerfectCombo = vi.fn();
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
    expect(gameX._recordPerfectCombo).toHaveBeenCalledWith(1);
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

  it("interpolates perpendicular motion for angled crossings", () => {
    const game = makeGame();
    const gate = prepGate({ axis: "x", prev: 10, pos: 50, v: 200, gapCenter: 160, gapHalf: 24, gapId: 44 });
    game._gapMeta.set(44, { perfected: false });

    const res = resolveGapPerfect({
      gate,
      game,
      playerAxis: 30, // midway along gate travel
      prevPerpAxis: 120,
      currPerpAxis: 200, // angled upward while crossing
      bonus: 8,
      windowScale: 0.18,
      leniency: 0.10
    });

    expect(res.awarded).toBe(true);
    expect(res.perp).toBeCloseTo(160, 5); // interpolated center
    expect(game.score).toBe(8);
    expect(game.perfectCombo).toBe(1);
    expect(game._perfectNiceSfx).toHaveBeenCalledTimes(1);
  });

  it("honors minimum window on tiny gaps while still permitting leniency", () => {
    const game = makeGame();
    const gate = prepGate({ axis: "y", prev: 12, pos: -6, v: -90, gapCenter: 75, gapHalf: 2, gapId: 55 });
    game._gapMeta.set(55, { perfected: false });

    const res = resolveGapPerfect({
      gate,
      game,
      playerAxis: 8,
      prevPerpAxis: 76.5,
      currPerpAxis: 76.5,
      bonus: 5,
      windowScale: 0.01 // would be <3 without minWindow
    });

    expect(res.awarded).toBe(true);
    expect(res.threshold).toBeGreaterThan(3); // minimum window applied then leniency
    expect(game.score).toBe(5);
    expect(game.perfectCombo).toBe(1);
  });

  it("supports re-entry from the opposite direction with allowCleared", () => {
    const game = makeGame();
    const gate = prepGate({ axis: "y", prev: 220, pos: 180, v: -160, gapCenter: 140, gapHalf: 30, gapId: 66 });
    game._gapMeta.set(66, { perfected: false });

    // First crossing from above: barely misses the perfect window.
    const first = resolveGapPerfect({
      gate,
      game,
      playerAxis: 200,
      prevPerpAxis: 168,
      currPerpAxis: 168,
      bonus: 7,
      windowScale: 0.20
    });
    expect(first.awarded).toBe(false);
    expect(game.perfectCombo).toBe(0);

    // Gate keeps moving upward; player dives back down through the same gap.
    gate.prev = 140; gate.pos = 100;
    const second = resolveGapPerfect({
      gate,
      game,
      playerAxis: 120,
      prevPerpAxis: 140,
      currPerpAxis: 140,
      bonus: 7,
      windowScale: 0.20
    });
    expect(second.awarded).toBe(true);
    expect(game.score).toBe(7);
    expect(game.perfectCombo).toBe(1);
  });

  it("does not double-award after a perfected gap, even if recrossed at different speed", () => {
    const game = makeGame();
    const gate = prepGate({ axis: "x", prev: -30, pos: 10, v: 400, gapCenter: 180, gapHalf: 36, gapId: 77 });
    game._gapMeta.set(77, { perfected: false });

    const first = resolveGapPerfect({
      gate,
      game,
      playerAxis: 0,
      prevPerpAxis: 180,
      currPerpAxis: 180,
      bonus: 9,
      windowScale: 0.22
    });
    expect(first.awarded).toBe(true);
    expect(game.score).toBe(9);
    expect(game.perfectCombo).toBe(1);

    gate.prev = 40; gate.pos = 120; // fast forward past player again
    const second = resolveGapPerfect({
      gate,
      game,
      playerAxis: 100,
      prevPerpAxis: 182,
      currPerpAxis: 182,
      bonus: 9,
      windowScale: 0.22
    });
    expect(second.awarded).toBe(false);
    expect(game.score).toBe(9);
    expect(game.perfectCombo).toBe(1);
  });

  it("delegates perfect scoring to a recorder when available", () => {
    const game = {
      score: 0,
      perfectCombo: 0,
      perfectT: 0,
      perfectMax: 0,
      _gapMeta: new Map(),
      _perfectNiceSfx: vi.fn()
    };
    const record = vi.fn((pts) => {
      game.score = (game.score || 0) + pts;
    });
    game._recordPerfectScore = record;
    const gate = prepGate({ axis: "x", gapCenter: 100, gapHalf: 20, gapId: 88 });
    game._gapMeta.set(88, { perfected: false });

    const res = resolveGapPerfect({
      gate,
      game,
      playerAxis: 50,
      prevPerpAxis: 100,
      currPerpAxis: 100,
      bonus: 5,
      windowScale: 0.2
    });

    expect(res.awarded).toBe(true);
    expect(record).toHaveBeenCalledWith(expect.any(Number));
    expect(game.perfectCombo).toBe(1);
    expect(game.score).toBeGreaterThan(0);
  });

  it("increments runStats perfect counters and clamps the flash duration", () => {
    const game = {
      score: 0,
      perfectCombo: 0,
      perfectT: 0,
      perfectMax: 0,
      runStats: { perfects: 0 },
      _gapMeta: new Map(),
      _perfectNiceSfx: vi.fn()
    };
    const gate = prepGate({ axis: "x", gapCenter: 140, gapHalf: 16, gapId: 99 });
    game._gapMeta.set(99, { perfected: false });

    const res = resolveGapPerfect({
      gate,
      game,
      playerAxis: 60,
      prevPerpAxis: 140,
      currPerpAxis: 140,
      bonus: 4,
      flashDuration: 5, // clamps to max 2s
      windowScale: 0.2
    });

    expect(res.awarded).toBe(true);
    expect(game.runStats.perfects).toBe(1);
    expect(game.perfectMax).toBeCloseTo(2);
    expect(game.perfectCombo).toBe(1);
  });

  it("short-circuits when a gate was already perfected while still reporting the threshold", () => {
    const game = makeGame();
    const gate = prepGate({ axis: "x", gapCenter: 120, gapHalf: 10, gapId: 100 });
    gate.perfected = true;

    const res = resolveGapPerfect({
      gate,
      game,
      playerAxis: 40,
      prevPerpAxis: 120,
      currPerpAxis: 120,
      bonus: 6,
      windowScale: 0.25
    });

    expect(res.awarded).toBe(false);
    expect(res.crossed).toBe(false);
    expect(res.distance).toBe(Infinity);
    expect(res.threshold).toBeGreaterThan(0);
  });
});

describe("perfect gap helpers", () => {
  it("computes a clamped threshold with leniency for small gaps", () => {
    const gate = prepGate({ gapHalf: 2 });
    const threshold = getPerfectGapThreshold({ gate, windowScale: 0.05, leniency: 0.2, minWindow: 3 });
    expect(threshold).toBeGreaterThan(3);
  });

  it("reports alignment based on perpendicular distance and guards invalid inputs", () => {
    const gate = prepGate({ gapCenter: 100, gapHalf: 20 });
    const aligned = resolvePerfectGapAlignment({ gate, perpAxis: 102, windowScale: 0.2 });
    expect(aligned.aligned).toBe(true);
    expect(aligned.distance).toBeLessThanOrEqual(aligned.threshold);

    const invalid = resolvePerfectGapAlignment({ gate, perpAxis: "nope", windowScale: 0.2 });
    expect(invalid.aligned).toBe(false);
    expect(invalid.distance).toBe(Infinity);
  });
});
