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

const makeCanvas = () => {
  const ctx = makeCtx();
  const canvas = {
    style: {},
    width: 0,
    height: 0,
    clientWidth: 300,
    clientHeight: 180,
    getContext: () => ctx
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

  it("resets transient state when switching trails to avoid stale artifacts", () => {
    const { canvas } = makeCanvas();
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });

    preview.parts = [{ life: 1, update: vi.fn() }];
    preview.trailAcc = 5;
    preview.trailGlintAcc = 3;
    preview.trailSparkAcc = 2;
    preview.trailAuraAcc = 4;

    preview.setTrail("aurora");

    expect(preview.trailId).toBe("aurora");
    expect(preview.parts.length).toBe(0);
    expect(preview.trailAcc).toBe(1);
    expect(preview.trailGlintAcc).toBe(1);
    expect(preview.trailSparkAcc).toBe(1);
    expect(preview.trailAuraAcc).toBe(1);
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

  it("keeps the preview orbit away from the panel center to avoid long occlusion", () => {
    const { canvas } = makeCanvas();
    canvas.clientWidth = 1280;
    canvas.clientHeight = 720;
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview.resize();

    const positions = [];
    for (let i = 0; i < 240; i++) {
      preview._updatePlayer(1 / 60);
      positions.push({ x: preview.player.x, y: preview.player.y });
    }

    const cx = preview.W * 0.5;
    const cy = preview.H * 0.5;
    const minRadius = positions.reduce((acc, pos) => Math.min(acc, Math.hypot(pos.x - cx, pos.y - cy)), Infinity);
    let centerBoxHits = 0;
    let streak = 0;
    let longestCenterStreak = 0;
    for (const pos of positions) {
      const inBox = (
        Math.abs(pos.x - cx) < preview.W * 0.16 && Math.abs(pos.y - cy) < preview.H * 0.16
      );
      if (inBox) {
        centerBoxHits += 1;
        streak += 1;
        longestCenterStreak = Math.max(longestCenterStreak, streak);
      } else {
        streak = 0;
      }
    }

    expect(minRadius).toBeGreaterThan(preview.W * 0.1);
    expect(centerBoxHits).toBeLessThan(positions.length * 0.25);
    expect(longestCenterStreak).toBeLessThan(18);
  });

  it("avoids lingering at the panel edges while still covering the preview area", () => {
    const { canvas } = makeCanvas();
    canvas.clientWidth = 960;
    canvas.clientHeight = 540;
    const preview = new TrailPreview({
      canvas,
      playerImg: {},
      requestFrame: null,
      cancelFrame: null,
      now: () => 0
    });
    preview.resize();

    const positions = [];
    for (let i = 0; i < 360; i++) {
      preview._updatePlayer(1 / 60);
      positions.push({ x: preview.player.x, y: preview.player.y });
    }

    const edgeMargin = 0.12;
    let longestEdgeStreak = 0;
    let streak = 0;
    let edgeVisits = 0;
    for (const pos of positions) {
      const nearEdge = (
        pos.x <= preview.W * edgeMargin ||
        pos.x >= preview.W * (1 - edgeMargin) ||
        pos.y <= preview.H * edgeMargin ||
        pos.y >= preview.H * (1 - edgeMargin)
      );
      if (nearEdge) {
        streak += 1;
        edgeVisits += 1;
        longestEdgeStreak = Math.max(longestEdgeStreak, streak);
      } else {
        streak = 0;
      }
    }

    const xs = positions.map((p) => p.x);
    const ys = positions.map((p) => p.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);

    expect(edgeVisits).toBe(0);
    expect(longestEdgeStreak).toBe(0);
    expect(spanX).toBeGreaterThan(preview.W * 0.35);
    expect(spanY).toBeGreaterThan(preview.H * 0.22);
  });
});
