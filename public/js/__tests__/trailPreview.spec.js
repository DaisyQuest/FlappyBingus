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
});
