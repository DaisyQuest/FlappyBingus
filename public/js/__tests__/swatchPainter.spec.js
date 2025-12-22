import { describe, expect, it, vi, beforeEach } from "vitest";
import { clearIconSpriteCache, getCachedIconSprite, paintIconCanvas } from "../swatchPainter.js";

describe("swatchPainter", () => {
  beforeEach(() => {
    clearIconSpriteCache();
  });

  it("returns early when context is unavailable", () => {
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => null) };
    const sprite = { width: 48, height: 48 };
    const result = paintIconCanvas(canvas, { id: "alpha" }, { sprite });
    expect(result).toBeNull();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it("draws the provided sprite onto the canvas and returns its dimensions", () => {
    const drawImage = vi.fn();
    const clearRect = vi.fn();
    const ctx = { drawImage, clearRect };
    const canvas = { width: 1, height: 1, getContext: vi.fn(() => ctx) };
    const sprite = { width: 64, height: 64 };

    const result = paintIconCanvas(canvas, { id: "bravo" }, { sprite });

    expect(result).toEqual({ width: 64, height: 64 });
    expect(canvas.width).toBe(64);
    expect(canvas.height).toBe(64);
    expect(clearRect).toHaveBeenCalledWith(0, 0, 64, 64);
    expect(drawImage).toHaveBeenCalledWith(sprite, 0, 0, 64, 64);
  });

  it("caches sprites by icon id and size", () => {
    const icon = { id: "cache-me" };
    const first = getCachedIconSprite(icon, { size: 72 });
    const second = getCachedIconSprite(icon, { size: 72 });

    expect(first).toBe(second);
    clearIconSpriteCache();
    const third = getCachedIconSprite(icon, { size: 72 });
    expect(third).not.toBe(first);
  });

  it("stops cached sprite animations when clearing the cache", () => {
    const icon = { id: "animated" };
    const sprite = getCachedIconSprite(icon, { size: 48 });
    sprite.__animation = { stop: vi.fn() };
    clearIconSpriteCache();
    expect(sprite.__animation.stop).toHaveBeenCalled();
  });
});
