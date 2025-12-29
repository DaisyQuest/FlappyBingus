import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PIPE_TEXTURE_ID,
  DEFAULT_PIPE_TEXTURE_MODE,
  PIPE_TEXTURES,
  computeDigitalFlowLayout,
  drawPipeTexture,
  getPipeTextureDisplayName,
  normalizePipeTextureMode,
  normalizePipeTextures,
  paintPipeTextureSwatch
} from "../pipeTextures.js";

describe("pipeTextures", () => {
  it("normalizes texture modes with fallbacks", () => {
    expect(normalizePipeTextureMode("ultra")).toBe("ULTRA");
    expect(normalizePipeTextureMode("unknown")).toBe(DEFAULT_PIPE_TEXTURE_MODE);
    expect(normalizePipeTextureMode(null)).toBe(DEFAULT_PIPE_TEXTURE_MODE);
  });

  it("normalizes pipe texture definitions", () => {
    const custom = normalizePipeTextures([
      { id: "basic", name: "Basic", unlock: { type: "free" } },
      { id: "basic", name: "Dup" },
      { id: "glass", name: "Glass" }
    ]);
    expect(custom).toHaveLength(2);
    expect(custom[0].unlock).toMatchObject({ type: "free" });
  });

  it("falls back to defaults when definitions are missing", () => {
    const normalized = normalizePipeTextures(null);
    expect(normalized.length).toBe(PIPE_TEXTURES.length);
  });

  it("accepts empty definitions when explicitly allowed", () => {
    const normalized = normalizePipeTextures([], { allowEmpty: true });
    expect(normalized).toEqual([]);
  });

  it("resolves display names with defaults", () => {
    expect(getPipeTextureDisplayName("basic", PIPE_TEXTURES)).toBe("Basic");
    expect(getPipeTextureDisplayName("unknown", PIPE_TEXTURES)).toBe("unknown");
    expect(getPipeTextureDisplayName("", PIPE_TEXTURES)).toBe(DEFAULT_PIPE_TEXTURE_ID);
  });

  it("paints swatches safely even with missing contexts", () => {
    const canvas = { getContext: () => null };
    expect(() => paintPipeTextureSwatch(canvas, "basic")).not.toThrow();
  });

  it("computes digital flow layout for horizontal pipes", () => {
    const layout = computeDigitalFlowLayout({
      width: 180,
      height: 60,
      time: 1.5,
      detail: 3,
      textWidth: 40
    });
    expect(layout.isHorizontal).toBe(true);
    expect(layout.rows).toBeGreaterThanOrEqual(2);
    expect(layout.rowStep).toBeGreaterThan(0);
    expect(layout.gap).toBeGreaterThan(0);
    expect(layout.travel).toBeLessThan(layout.gap + 40);
  });

  it("computes digital flow layout for vertical pipes", () => {
    const layout = computeDigitalFlowLayout({
      width: 40,
      height: 180,
      time: 2,
      detail: 1,
      textWidth: 32
    });
    expect(layout.isHorizontal).toBe(false);
    expect(layout.rows).toBeGreaterThanOrEqual(2);
    expect(layout.rowStep).toBeGreaterThan(0);
    expect(layout.gap).toBeGreaterThan(0);
    expect(layout.travel).toBeLessThan(layout.gap + 32);
  });

  it("handles invalid inputs when computing digital layouts", () => {
    const layout = computeDigitalFlowLayout({
      width: 0,
      height: null,
      time: "abc",
      detail: 4,
      textWidth: 0
    });
    expect(layout.isHorizontal).toBe(true);
    expect(layout.rows).toBeGreaterThanOrEqual(2);
    expect(layout.rowStep).toBeGreaterThan(0);
  });

  it("draws each pipe texture without errors on a mock context", () => {
    const gradient = { addColorStop: vi.fn() };
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      fill: vi.fn(),
      strokeRect: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 42 })),
      createLinearGradient: vi.fn(() => gradient),
      clearRect: vi.fn()
    };
    const base = { r: 120, g: 200, b: 80 };

    PIPE_TEXTURES.forEach((texture) => {
      drawPipeTexture(ctx, { x: 0, y: 0, w: 120, h: 64 }, base, {
        textureId: texture.id,
        mode: DEFAULT_PIPE_TEXTURE_MODE,
        time: 1.1
      });
    });

    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.createLinearGradient).toHaveBeenCalled();
  });

  it("draws the digital texture along the vertical axis when needed", () => {
    const gradient = { addColorStop: vi.fn() };
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      fill: vi.fn(),
      strokeRect: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 30 })),
      createLinearGradient: vi.fn(() => gradient),
      clearRect: vi.fn()
    };
    const base = { r: 10, g: 180, b: 220 };

    drawPipeTexture(ctx, { x: 0, y: 0, w: 48, h: 200 }, base, {
      textureId: "digital",
      mode: "HIGH",
      time: 2.4
    });

    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("draws new animated textures in monochrome mode without errors", () => {
    const gradient = { addColorStop: vi.fn() };
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      fill: vi.fn(),
      strokeRect: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 36 })),
      createLinearGradient: vi.fn(() => gradient),
      clearRect: vi.fn()
    };
    const base = { r: 90, g: 140, b: 200 };
    const textures = ["disco", "ultradisco", "fire", "bluefire", "rocket_emojis"];

    textures.forEach((textureId) => {
      drawPipeTexture(ctx, { x: 0, y: 0, w: 52, h: 180 }, base, {
        textureId,
        mode: "MONOCHROME",
        time: 3.2
      });
    });

    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.beginPath).toHaveBeenCalled();
  });
});
