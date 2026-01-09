import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createSpaceBackground, updateSpaceBackground, renderSpaceBackground, __testables } from "../spaceBackground.js";

const makeCtx = () => ({
  drawImage: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  clearRect: vi.fn(),
  fillStyle: "",
  globalAlpha: 1
});

describe("spaceBackground", () => {
  const originalOffscreen = globalThis.OffscreenCanvas;

  beforeEach(() => {
    globalThis.OffscreenCanvas = class {
      constructor(w, h) {
        this.width = w;
        this.height = h;
      }
      getContext() {
        return makeCtx();
      }
    };
  });

  afterEach(() => {
    globalThis.OffscreenCanvas = originalOffscreen;
  });

  it("creates a deterministic space background with layered stars", () => {
    const state = createSpaceBackground({ width: 200, height: 100, rand: () => 0.5 });
    expect(state.type).toBe("space");
    expect(state.stars).toHaveLength(175);
    expect(Object.keys(state.layers)).toEqual(["far", "mid", "near"]);
    expect(state.stars[0]).toMatchObject({
      driftX: expect.any(Number),
      driftY: expect.any(Number),
      driftSpeedX: expect.any(Number),
      driftSpeedY: expect.any(Number),
      driftPhaseX: expect.any(Number),
      driftPhaseY: expect.any(Number)
    });
    const layeredTotal = Object.values(state.layers).reduce(
      (sum, layer) => sum + layer.staticStars.length + layer.twinkleStars.length,
      0
    );
    expect(layeredTotal).toBe(state.stars.length);
  });

  it("avoids updates when extremeLowDetail is enabled", () => {
    const state = createSpaceBackground({
      width: 200,
      height: 100,
      rand: () => 0.4,
      settings: { extremeLowDetail: true }
    });

    const dirty = updateSpaceBackground(state, { width: 200, height: 100, dt: 1, rand: () => 0.2 });

    expect(dirty).toBe(false);
    expect(state.time).toBe(0);
    expect(state.stars).toHaveLength(0);
  });

  it("rebuilds when settings change", () => {
    const state = createSpaceBackground({ width: 200, height: 100, rand: () => 0.5 });
    const dirty = updateSpaceBackground(state, {
      width: 200,
      height: 100,
      dt: 0.1,
      rand: () => 0.5,
      settings: { extremeLowDetail: true }
    });

    expect(dirty).toBe(true);
    expect(state.settings.extremeLowDetail).toBe(true);
    expect(state.stars).toHaveLength(0);
  });

  it("spawns bursts when cooldown elapses and effects are enabled", () => {
    const state = createSpaceBackground({ width: 200, height: 100, rand: () => 0.3 });
    state.burstCooldown = 0;

    updateSpaceBackground(state, { width: 200, height: 100, dt: 0.2, rand: () => 0.2 });

    expect(state.bursts.length).toBe(1);
  });

  it("skips bursts when reducedEffects is enabled", () => {
    const state = createSpaceBackground({
      width: 200,
      height: 100,
      rand: () => 0.3,
      settings: { reducedEffects: true }
    });
    state.burstCooldown = 0;

    updateSpaceBackground(state, {
      width: 200,
      height: 100,
      dt: 0.2,
      rand: () => 0.2,
      settings: { reducedEffects: true }
    });

    expect(state.bursts.length).toBe(0);
  });

  it("keeps parallax static in simple background mode while still allowing bursts", () => {
    const state = createSpaceBackground({
      width: 200,
      height: 100,
      rand: () => 0.4,
      settings: { simpleBackground: true }
    });
    state.burstCooldown = 0;
    const startOffset = state.layerOffsets.far.y;

    updateSpaceBackground(state, {
      width: 200,
      height: 100,
      dt: 0.5,
      rand: () => 0.6,
      settings: { simpleBackground: true }
    });

    expect(state.layerOffsets.far.y).toBe(startOffset);
    expect(state.bursts.length).toBe(1);
  });

  it("drifts nebula wisps around their spawn positions", () => {
    const rand = () => 0.5;
    const state = createSpaceBackground({ width: 200, height: 100, rand });
    const wisp = state.nebula[0];
    const baseX = wisp.baseX;
    const baseY = wisp.baseY;

    updateSpaceBackground(state, { width: 200, height: 100, dt: 1, rand });

    const expectedX = baseX + __testables.computeDriftOffset(state.time, wisp.driftSpeedX, wisp.driftPhaseX, wisp.driftX);
    const expectedY = baseY + __testables.computeDriftOffset(state.time, wisp.driftSpeedY, wisp.driftPhaseY, wisp.driftY);
    expect(wisp.x).toBeCloseTo(expectedX, 6);
    expect(wisp.y).toBeCloseTo(expectedY, 6);
    expect(Math.abs(wisp.x - baseX)).toBeLessThanOrEqual(wisp.driftX + 0.0001);
    expect(Math.abs(wisp.y - baseY)).toBeLessThanOrEqual(wisp.driftY + 0.0001);
  });

  it("freezes motion entirely when reduceMotion is enabled", () => {
    const state = createSpaceBackground({
      width: 200,
      height: 100,
      rand: () => 0.4,
      settings: { reduceMotion: true }
    });
    state.burstCooldown = 0;
    const startOffset = state.layerOffsets.far.y;
    const startTime = state.time;
    const startNebula = state.nebula.map((wisp) => ({ x: wisp.x, y: wisp.y }));

    updateSpaceBackground(state, {
      width: 200,
      height: 100,
      dt: 0.5,
      rand: () => 0.6,
      settings: { reduceMotion: true }
    });

    expect(state.layerOffsets.far.y).toBe(startOffset);
    expect(state.time).toBe(startTime);
    state.nebula.forEach((wisp, index) => {
      expect(wisp.x).toBe(startNebula[index].x);
      expect(wisp.y).toBe(startNebula[index].y);
    });
    expect(state.bursts.length).toBe(0);
  });

  it("renders stars and skips rendering when detail is extreme", () => {
    const ctx = makeCtx();
    const state = createSpaceBackground({ width: 120, height: 80, rand: () => 0.5 });

    renderSpaceBackground(ctx, state, { width: 120, height: 80 });
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();

    const lowState = createSpaceBackground({
      width: 120,
      height: 80,
      rand: () => 0.5,
      settings: { extremeLowDetail: true }
    });
    const lowCtx = makeCtx();
    renderSpaceBackground(lowCtx, lowState, { width: 120, height: 80 });
    expect(lowCtx.drawImage).not.toHaveBeenCalled();
  });

  it("caps player shift when computing parallax", () => {
    expect(__testables.computePlayerShift(0, 100, { reduceMotion: true })).toBe(0);
    expect(__testables.computePlayerShift(50, 100, { simpleBackground: true })).toBe(0);
    expect(__testables.computePlayerShift(80, 100, { reduceMotion: false, simpleBackground: false })).toBe(0);
  });

  it("keeps player shift anchored when updating with playerY", () => {
    const state = createSpaceBackground({ width: 200, height: 100, rand: () => 0.2 });
    updateSpaceBackground(state, { width: 200, height: 100, dt: 0.2, rand: () => 0.2, playerY: 90 });
    expect(state.playerShift).toBe(0);
  });
});
