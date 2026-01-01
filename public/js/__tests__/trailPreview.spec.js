import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../config.js";
import { TrailPreview } from "../trailPreview.js";
import { clamp } from "../util.js";
import * as trailStyles from "../trailStyles.js";

const makeCtx = ({ linearGradient, radialGradient } = {}) => {
  const gradient = { addColorStop: vi.fn() };
  const linearFactory = linearGradient ?? (() => gradient);
  const radialFactory = radialGradient ?? (() => gradient);
  return {
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    lineTo: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(linearFactory),
    createRadialGradient: vi.fn(radialFactory),
    lineWidth: 0,
    strokeStyle: "",
    fillStyle: "",
    globalAlpha: 1,
    globalCompositeOperation: ""
  };
};

const makeCanvas = (rect = { left: 0, top: 0, width: 300, height: 180 }) => {
  const ctx = makeCtx();
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const canvas = {
    style: {},
    width: 0,
    height: 0,
    clientWidth: 300,
    clientHeight: 180,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ ...rect, right, bottom })
  };
  return { canvas, ctx };
};

describe("TrailPreview", () => {
  it("initializes a preview canvas with DPR scaling", () => {
    const { canvas, ctx } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: () => 0,
      cancelFrame: () => {},
      now: () => 0
    });

    preview.resize();
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
    expect(preview.W).toBeGreaterThan(0);
    expect(ctx.setTransform).toHaveBeenCalled();
  });

  it("emits particles once started", () => {
    const { canvas } = makeCanvas();
    let rafCallback = null;
    const raf = vi.fn((cb) => { rafCallback = cb; return 1; });
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: raf,
      cancelFrame: () => {},
      now: () => 0
    });

    preview.setTrail("rainbow");
    preview.start();
    expect(raf).toHaveBeenCalled();
    rafCallback?.(16);
    rafCallback?.(32);
    expect(preview.parts.length).toBeGreaterThan(0);
  });

  it("advances a single frame when stepped without RAF scheduling", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview.trailAcc = 2;
    preview._rand = () => 0.5;

    preview.step(1 / 30, 1000);

    expect(preview.player.phase).toBeGreaterThan(0);
    expect(preview.parts.length).toBeGreaterThan(0);
  });

  it("stops animation and cancels scheduled frames", () => {
    const { canvas } = makeCanvas();
    const cancel = vi.fn();
    const raf = vi.fn(() => 77);
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: raf,
      cancelFrame: cancel,
      now: () => 0
    });

    preview.start();
    preview.stop();
    expect(cancel).toHaveBeenCalledWith(77);
    expect(preview.running).toBe(false);
  });

  it("updates player sizing when swapping player image without natural dimensions", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: { width: 20, height: 10 },
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    const beforeH = preview.player.h;
    preview.setPlayerImage({ width: 20, height: 20 });
    expect(preview.player.w).toBeGreaterThan(0);
    expect(preview.player.h / preview.player.w).toBeCloseTo(1);
    expect(preview.player.h).not.toBe(beforeH);
  });

  it("skips animation when no canvas context is available", () => {
    const canvas = { getContext: () => { throw new Error("boom"); } };
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: () => 1,
      cancelFrame: () => {},
      now: () => 0
    });

    expect(preview.ctx).toBeNull();
    preview.start();
    expect(preview.running).toBe(false);
  });

  it("computes margins around obstruction elements", () => {
    const { canvas } = makeCanvas({ left: 0, top: 0, width: 400, height: 200 });
    const obstruction = {
      getBoundingClientRect: () => ({ left: 100, top: 20, right: 300, bottom: 180 })
    };
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0,
      obstructionElement: obstruction,
      obstructionPadding: { x: 0.05, y: 0.05 }
    });

    preview._measureObstruction();
    const margins = preview._computeMargins();

    expect(margins.x).toBeGreaterThan(0);
    expect(margins.y).toBeGreaterThan(0);
  });

  it("selects a wander target within computed bounds", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview._rand = () => 0.5;

    const target = preview._pickWanderTarget(0.2, 0.25, 0.9, 0.1);
    expect(target.x).toBeLessThanOrEqual(0.8);
    expect(target.y).toBeGreaterThanOrEqual(0.25);
  });

  it("resets trail simulation state when switching trails", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview.trailAcc = 0;
    preview.trailId = "classic";

    preview.setTrail("ember");
    expect(preview.trailId).toBe("ember");
    expect(preview.trailAcc).toBe(1);
    expect(preview.parts).toHaveLength(0);
  });

  it("binds animation frame callbacks to the global context to avoid illegal invocations", () => {
    const { canvas } = makeCanvas();
    const cancel = vi.fn(function (id) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return id;
    });
    let rafCallback = null;
    const raf = vi.fn(function (cb) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      rafCallback = cb;
      return 42;
    });

    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: raf,
      cancelFrame: cancel,
      now: () => 16
    });

    expect(() => preview.start()).not.toThrow();
    expect(() => rafCallback?.(0)).not.toThrow();
    preview.stop();
    expect(raf).toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledWith(42);
  });

  it("prefers the player image when available and ready", () => {
    const { canvas, ctx } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: { complete: true, naturalWidth: 10, naturalHeight: 10 },
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });

    preview._draw();
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("sizes the preview player to match in-game defaults", () => {
    const { canvas, ctx } = makeCanvas();
    const playerImg = { complete: true, naturalWidth: 32, naturalHeight: 32 };
    const preview = new TrailPreview({
      canvas,
      playerImg,
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });

    preview._updatePlayer(1 / 60);

    const cfg = DEFAULT_CONFIG.player;
    const target = clamp(Math.min(preview.W, preview.H) * cfg.sizeScale, cfg.sizeMin, cfg.sizeMax);
    const expectedR = target * cfg.radiusScale;

    expect(preview.player.w).toBeCloseTo(target);
    expect(preview.player.h).toBeCloseTo(target);
    expect(preview.player.r).toBeCloseTo(expectedR);

    preview._draw();
    const call = ctx.drawImage.mock.calls.at(-1);
    expect(call?.[3]).toBeCloseTo(target);
    expect(call?.[4]).toBeCloseTo(target);
  });

  it("falls back to solid fill when gradients are unavailable", () => {
    const gradientLessCtx = makeCtx({ linearGradient: () => null, radialGradient: () => null });
    const canvas = {
      style: {},
      width: 0,
      height: 0,
      clientWidth: 320,
      clientHeight: 180,
      getContext: () => gradientLessCtx
    };
    const preview = new TrailPreview({
      canvas,
      playerImg: null,
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });

    preview._draw();
    expect(gradientLessCtx.fillStyle).toBe("rgba(220,230,255,.9)");
    expect(gradientLessCtx.arc).toHaveBeenCalled();
  });

  it("can render particles without drawing the player avatar", () => {
    const { canvas, ctx } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: { complete: true, naturalWidth: 12, naturalHeight: 12 },
      requestFrame: null,
      cancelFrame: null,
      now: () => 0,
      renderPlayer: false
    });
    const drawPlayer = vi.spyOn(preview, "_drawPlayer");

    preview._draw();

    expect(drawPlayer).not.toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("pins the player in static mode while still emitting a trail", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: { complete: true, naturalWidth: 12, naturalHeight: 12 },
      requestFrame: null,
      cancelFrame: null,
      now: () => 0,
      mode: "static",
      anchor: { x: 0.25, y: 0.75 },
      staticDrift: { speed: 120, swing: 0, wobble: 0, rate: 0, heading: -Math.PI / 2 }
    });
    preview._rand = () => 0.5;

    preview.step(0.05, 16);

    expect(preview.player.x).toBeCloseTo(preview.W * 0.25);
    expect(preview.player.y).toBeCloseTo(preview.H * 0.75);
    expect(Math.hypot(preview.player.vx, preview.player.vy)).toBeGreaterThan(0);
    expect(preview.parts.length).toBeGreaterThan(0);
  });

  it("skips preview backgrounds when configured to draw only the icon", () => {
    const ctx = makeCtx();
    const canvas = {
      style: {},
      width: 0,
      height: 0,
      clientWidth: 240,
      clientHeight: 160,
      getContext: () => ctx
    };
    const preview = new TrailPreview({
      canvas,
      playerImg: { complete: true, naturalWidth: 8, naturalHeight: 8 },
      requestFrame: null,
      cancelFrame: null,
      now: () => 0,
      drawBackground: false
    });

    preview._draw();

    expect(ctx.createLinearGradient).not.toHaveBeenCalled();
    expect(ctx.createRadialGradient).not.toHaveBeenCalled();
  });

  it("stops running when the rendering context disappears mid-frame", () => {
    const { canvas } = makeCanvas();
    let rafCallback = null;
    const cancel = vi.fn();
    const raf = vi.fn((cb) => { rafCallback = cb; return 99; });
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: raf,
      cancelFrame: cancel,
      now: () => 0
    });

    preview.start();
    preview.ctx = null;
    rafCallback?.(16);

    expect(preview.running).toBe(false);
    expect(cancel).toHaveBeenCalledWith(99);
  });

  it("emits an enveloping aura with lengthened particles for a vivid preview", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview.player.x = 40;
    preview.player.y = 50;
    preview.player.r = 10;
    preview.player.phase = Math.asin(0.5) / 1.6;
    preview._rand = () => 0.5;

    const style = {
      rate: 3,
      life: [1, 1],
      size: [2, 2],
      speed: [10, 10],
      drag: 0,
      add: false,
      jitterScale: 0.4,
      distanceScale: 3,
      lifeScale: 2,
      glint: { rate: Number.MIN_VALUE, life: [1, 1], size: [1, 1], speed: [1, 1] },
      sparkle: { rate: Number.MIN_VALUE, life: [1, 1], size: [1, 1], speed: [1, 1] },
      aura: {
        rate: 2,
        life: [2, 2],
        size: [3, 3],
        speed: [4, 4],
        orbit: [5, 5],
        add: false,
        drag: 2,
        twinkle: false
      }
    };

    const styleSpy = vi.spyOn(trailStyles, "trailStyleFor").mockReturnValue(style);

    preview._emitTrail(1);

    const produced = preview.parts.slice(-5);
    const baseParts = produced.slice(0, 3);
    const auraParts = produced.slice(3);

    expect(produced).toHaveLength(5);
    expect(baseParts.every((p) => p.life === 2)).toBe(true);
    expect(baseParts.every((p) => Math.abs(p.size - 2.16) < 1e-3)).toBe(true);
    expect(auraParts.every((p) => p.life === 4)).toBe(true);
    expect(auraParts.every((p) => Math.abs(p.size - 3.24) < 1e-3)).toBe(true);
    expect(auraParts.every((p) => p.twinkle === false)).toBe(true);
    expect(preview.trailAuraAcc).toBeLessThan(1);
    expect(preview.trailAcc).toBeLessThan(1);

    styleSpy.mockRestore();
  });

  it("applies per-effect particle shapes when configured", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview.player.x = 60;
    preview.player.y = 60;
    preview.player.vx = 90;
    preview.player.vy = 0;
    preview.player.phase = 0;
    preview._rand = () => 0.5;

    const style = {
      rate: 2,
      life: [1, 1],
      size: [2, 2],
      speed: [10, 10],
      drag: 0,
      add: false,
      particleShape: "star",
      glint: { rate: 2, life: [1, 1], size: [1, 1], speed: [1, 1], particleShape: "star" },
      sparkle: { rate: 2, life: [1, 1], size: [1, 1], speed: [1, 1], particleShape: "star" },
      aura: { rate: 2, life: [1, 1], size: [1, 1], speed: [1, 1], orbit: [1, 1], particleShape: "star" }
    };

    const styleSpy = vi.spyOn(trailStyles, "trailStyleFor").mockReturnValue(style);

    preview._emitTrail(1);

    const produced = preview.parts.slice(-4);
    expect(produced).toHaveLength(4);
    expect(produced.every((p) => p.shape === "star")).toBe(true);
    expect(produced.every((p) => p.rotation !== 0)).toBe(true);

    styleSpy.mockRestore();
  });

  it("adds honeycomb hexagon styling to preview particles", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview.player.x = 60;
    preview.player.y = 60;
    preview.player.vx = 90;
    preview.player.vy = 0;
    preview.player.phase = 0;
    preview._rand = () => 0.5;

    const style = {
      rate: 2,
      life: [1, 1],
      size: [2, 2],
      speed: [10, 10],
      drag: 0,
      add: false,
      particleShape: "hexagon",
      hexStyle: { stroke: "stroke", fill: "fill", lineWidth: 2 },
      glint: { rate: Number.MIN_VALUE },
      sparkle: { rate: Number.MIN_VALUE },
      aura: { rate: 0 }
    };

    const styleSpy = vi.spyOn(trailStyles, "trailStyleFor").mockReturnValue(style);

    const prev = preview.parts.length;
    preview._emitTrail(1);

    const produced = preview.parts.slice(prev);
    const hex = produced.find((p) => p.shape === "hexagon");
    expect(hex).toBeTruthy();
    expect(hex?.strokeColor).toBe("stroke");
    expect(hex?.fillColor).toBe("fill");
    expect(hex?.lineWidth).toBe(2);

    styleSpy.mockRestore();
  });

  it("bands pixel trails into stacked rainbow stripes", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview.player.x = 50;
    preview.player.y = 60;
    preview.player.vx = 100;
    preview.player.vy = 0;
    preview.player.r = 10;
    preview.player.phase = 0;
    preview._rand = () => 0.5;

    const style = {
      rate: 4,
      life: [1, 1],
      size: [2, 2],
      speed: [1, 1],
      drag: 0,
      add: false,
      particleShape: "pixel",
      banding: { count: 3, spreadScale: 1, jitterScale: 0 },
      color: ({ i }) => `color-${i}`,
      glint: { rate: 0 },
      sparkle: { rate: 0 },
      aura: { rate: 0 }
    };
    const styleSpy = vi.spyOn(trailStyles, "trailStyleFor").mockReturnValue(style);

    const prev = preview.parts.length;
    preview._emitTrail(1);

    const produced = preview.parts.slice(prev);
    const flow = 0.8 + 0.4 * Math.sin(preview.player.phase * 1.6);
    const expectedCount = Math.floor(style.rate * flow);
    const bandCount = style.banding.count;
    const bandIndices = Array.from({ length: expectedCount }, (_, idx) => idx % bandCount);
    const expectedColors = bandIndices.map((idx) => `color-${idx}`);
    const expectedYs = bandIndices.map((idx) => {
      const t = bandCount > 1 ? idx / (bandCount - 1) : 0.5;
      const offset = (t - 0.5) * 2 * preview.player.r * style.banding.spreadScale;
      return Number((preview.player.y - offset).toFixed(2));
    }).sort((a, b) => a - b);
    const ys = produced.map((p) => Number(p.y.toFixed(2))).sort((a, b) => a - b);

    expect(produced).toHaveLength(expectedCount);
    expect(produced.every((p) => p.shape === "pixel")).toBe(true);
    expect(produced.every((p) => p.rotation === 0)).toBe(true);
    expect(produced.map((p) => p.color)).toEqual(expectedColors);
    expect(ys).toEqual(expectedYs);

    styleSpy.mockRestore();
  });

  it("scales secondary effects with flow so bright particles do not overpower color", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview.player.phase = -Math.PI / 3.2; // flow = 0.4
    preview._rand = () => 0.5;

    const style = {
      rate: 10,
      life: [1, 1],
      size: [1, 1],
      speed: [1, 1],
      drag: 0,
      add: false,
      glint: { rate: 8, life: [1, 1], size: [1, 1], speed: [1, 1], add: false },
      sparkle: { rate: 6, life: [1, 1], size: [1, 1], speed: [1, 1], add: false },
      aura: { rate: 0 }
    };
    const styleSpy = vi.spyOn(trailStyles, "trailStyleFor").mockReturnValue(style);

    preview._emitTrail(1);

    const produced = preview.parts.slice(-13);
    const baseCount = Math.floor(style.rate * 0.4);
    const glintCount = Math.floor(style.glint.rate * 0.4);
    const sparkleCount = Math.floor(style.sparkle.rate * 0.4);

    expect(produced).toHaveLength(baseCount + glintCount + sparkleCount);
    expect(baseCount).toBe(4);
    expect(glintCount).toBe(3);
    expect(sparkleCount).toBe(2);

    styleSpy.mockRestore();
  });

  it("caps the number of particles to keep previews lightweight", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });

    preview.parts = Array.from({ length: 600 }, () => ({
      life: 1,
      update: vi.fn(function update(dt) { this.life -= dt * 0.1; })
    }));

    preview._updateParts(0.016);
    expect(preview.parts.length).toBeLessThanOrEqual(480);
  });

  it("picks new wander targets that stay within the visible play area", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview._rand = () => 0.5;

    const target = preview._pickWanderTarget(0.3, 0.28, 0.52, 0.52);

    expect(target.x).toBeGreaterThanOrEqual(0.3);
    expect(target.x).toBeLessThanOrEqual(0.7);
    expect(target.y).toBeGreaterThanOrEqual(0.28);
    expect(target.y).toBeLessThanOrEqual(0.72);
    expect(Math.hypot(target.x - 0.52, target.y - 0.52)).toBeGreaterThan(0.05);
  });

  it("lays out flowing bezier flight segments that honor margins and the anchor", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0,
      anchor: { x: 0.3, y: 0.28 }
    });
    preview._rand = () => 0.42;

    preview._advanceFlightPath(0.016, 0.2, 0.18);

    expect(preview._flightSegments.length).toBeGreaterThanOrEqual(3);
    for (const seg of preview._flightSegments) {
      for (const key of ["start", "c1", "c2", "end"]) {
        const pt = seg[key];
        expect(pt.x).toBeGreaterThanOrEqual(0.2);
        expect(pt.x).toBeLessThanOrEqual(0.8);
        expect(pt.y).toBeGreaterThanOrEqual(0.18);
        expect(pt.y).toBeLessThanOrEqual(0.82);
      }
    }
  });

  it("glides along the bezier ribbon smoothly without harsh jumps", () => {
    const { canvas } = makeCanvas({ left: 0, top: 0, width: 1280, height: 720 });
    canvas.clientWidth = 1280;
    canvas.clientHeight = 720;
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview._rand = () => 0.31;
    preview.resize();

    const positions = [];
    for (let step = 0; step < 220; step++) {
      preview._updatePlayer(1 / 60);
      positions.push({ x: preview.player.x / preview.W, y: preview.player.y / preview.H });
    }

    const gaps = positions.slice(1).map((p, idx) => Math.hypot(p.x - positions[idx].x, p.y - positions[idx].y));
    const xs = positions.map((p) => p.x);
    const ys = positions.map((p) => p.y);

    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.05);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.05);
    expect(Math.max(...gaps)).toBeLessThan(0.5);
  });

  it("draws the current bezier ribbon so the preview window stays uncluttered", () => {
    const { canvas, ctx } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: { complete: true, naturalWidth: 8, naturalHeight: 8 },
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview._rand = () => 0.4;
    preview._advanceFlightPath(0.016, 0.16, 0.16);

    preview._draw();

    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.bezierCurveTo).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("rebuilds flight state when switching trails to avoid stale motion", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });

    preview.trailAcc = 5;
    preview.trailGlintAcc = 3;
    preview.trailSparkAcc = 2;
    preview.trailAuraAcc = 4;
    preview.parts = [{ life: 1, update: vi.fn() }];
    preview._flightSegments = [{
      start: { x: 0.5, y: 0.5 },
      c1: { x: 0.5, y: 0.5 },
      c2: { x: 0.5, y: 0.5 },
      end: { x: 0.5, y: 0.5 },
      duration: 1
    }];
    preview._flightTime = 0.9;
    preview._flightDirection = 1;

    preview.setTrail("aurora");

    expect(preview.trailId).toBe("aurora");
    expect(preview.parts.length).toBe(0);
    expect(preview.trailAcc).toBe(1);
    expect(preview.trailGlintAcc).toBe(1);
    expect(preview.trailSparkAcc).toBe(1);
    expect(preview.trailAuraAcc).toBe(1);
    expect(preview._flightSegments.length).toBe(0);
    expect(preview._flightTime).toBe(0);
  });
});
