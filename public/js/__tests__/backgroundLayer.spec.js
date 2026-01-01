import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  createBackgroundLayer,
  initBackgroundLayer,
  refreshBackgroundLayer,
  updateBackgroundDots,
  drawBackgroundLayer
} from "../backgroundLayer.js";
import { createProceduralBackground, createMonochromeBackground } from "../backgroundModes.js";
import { setRandSource } from "../util.js";

const makeCtx = () => ({
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn()
});

describe("backgroundLayer", () => {
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
    setRandSource();
  });

  it("initializes dots and marks dirty", () => {
    const layer = createBackgroundLayer();
    initBackgroundLayer(layer, { width: 100, height: 50, rand: () => 0.5 });
    expect(layer.mode.dots.length).toBeGreaterThan(0);
    expect(layer.dirty).toBe(true);
  });

  it("refreshes the offscreen canvas and clears dirty", () => {
    const layer = createBackgroundLayer();
    initBackgroundLayer(layer, { width: 100, height: 50, rand: () => 0.5 });
    refreshBackgroundLayer(layer, { width: 100, height: 50 });
    expect(layer.canvas).toBeTruthy();
    expect(layer.ctx).toBeTruthy();
    expect(layer.dirty).toBe(false);
  });

  it("updates dots with wrapping", () => {
    const layer = createBackgroundLayer();
    layer.mode = createProceduralBackground({ width: 100, height: 50, rand: () => 0.5 });
    layer.mode.dots = [{ x: 0, y: 70, s: 5, r: 1 }];
    updateBackgroundDots(layer, { width: 100, height: 50, dt: 1, rand: () => 0.75 });
    expect(layer.mode.dots[0].y).toBe(-10);
    expect(layer.mode.dots[0].x).toBe(75);
  });

  it("defaults to the global rand source when updating dots", () => {
    const layer = createBackgroundLayer();
    setRandSource(() => 0.2);
    layer.mode = createProceduralBackground({ width: 100, height: 50 });
    layer.mode.dots = [{ x: 0, y: 70, s: 5, r: 1 }];
    updateBackgroundDots(layer, { width: 100, height: 50, dt: 1 });
    expect(layer.mode.dots[0].y).toBe(-10);
    expect(layer.mode.dots[0].x).toBe(20);
  });

  it("draws using the cached canvas when available", () => {
    const layer = createBackgroundLayer();
    initBackgroundLayer(layer, { width: 100, height: 50, rand: () => 0.5 });
    refreshBackgroundLayer(layer, { width: 100, height: 50 });
    const ctx = { drawImage: vi.fn() };
    const drawn = drawBackgroundLayer(layer, ctx, { width: 100, height: 50 });
    expect(drawn).toBe(true);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("returns false when no canvas is available", () => {
    const layer = createBackgroundLayer();
    layer.canvas = null;
    layer.ctx = null;
    const drawn = drawBackgroundLayer(layer, null, { width: 100, height: 50 });
    expect(drawn).toBe(false);
  });

  it("respects monochrome background color", () => {
    const layer = createBackgroundLayer();
    initBackgroundLayer(layer, {
      width: 100,
      height: 50,
      mode: createMonochromeBackground({ color: "#222222" })
    });
    refreshBackgroundLayer(layer, { width: 100, height: 50 });
    expect(layer.mode.color).toBe("#222222");
  });

  it("throws when layer is missing", () => {
    expect(() => initBackgroundLayer(null, { width: 10, height: 10 })).toThrow("Background layer is required");
  });
});
