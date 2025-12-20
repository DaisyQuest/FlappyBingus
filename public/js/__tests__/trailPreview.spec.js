import { describe, expect, it, vi } from "vitest";
import { TrailPreview } from "../trailPreview.js";

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

    preview.setTrail("aurora");

    expect(preview.trailId).toBe("aurora");
    expect(preview.parts.length).toBe(0);
    expect(preview.trailAcc).toBe(1);
    expect(preview.trailGlintAcc).toBe(1);
    expect(preview.trailSparkAcc).toBe(1);
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
});
