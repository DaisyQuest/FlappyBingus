import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createBackgroundRenderer } from "../backgroundRenderer.js";
import { createMonochromeBackground, createVideoBackground } from "../backgroundModes.js";

const makeCtx = () => ({
  drawImage: vi.fn(),
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

describe("backgroundRenderer", () => {
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

  it("initializes with a default procedural mode and renders", () => {
    const renderer = createBackgroundRenderer({ width: 100, height: 50, rand: () => 0.5 });
    const ctx = makeCtx();
    const drawn = renderer.render(ctx, { width: 100, height: 50 });
    expect(drawn).toBe(true);
  });

  it("sets a monochrome mode and renders via background layer", () => {
    const renderer = createBackgroundRenderer({ width: 100, height: 50 });
    renderer.setMode(createMonochromeBackground({ color: "#222222" }));
    const ctx = makeCtx();
    const drawn = renderer.render(ctx, { width: 100, height: 50 });
    expect(drawn).toBe(true);
  });

  it("renders a ready video element when mode is video", () => {
    const ctx = makeCtx();
    const video = { readyState: 2 };
    const renderer = createBackgroundRenderer({
      mode: createVideoBackground({ src: "/video/bg.mp4" }),
      createVideoElement: () => video
    });

    const drawn = renderer.render(ctx, { width: 200, height: 120 });

    expect(drawn).toBe(true);
    expect(ctx.drawImage).toHaveBeenCalledWith(video, 0, 0, 200, 120);
  });

  it("returns false when video is not ready", () => {
    const ctx = makeCtx();
    const video = { readyState: 0 };
    const renderer = createBackgroundRenderer({
      mode: createVideoBackground({ src: "/video/bg.mp4" }),
      createVideoElement: () => video
    });

    expect(renderer.render(ctx, { width: 200, height: 120 })).toBe(false);
  });

  it("throws when setting invalid mode", () => {
    const renderer = createBackgroundRenderer();
    expect(() => renderer.setMode(null)).toThrow("Background mode is required");
  });
});
