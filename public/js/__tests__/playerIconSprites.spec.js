import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { createPlayerIconSprite } from "../playerIconSprites.js";

describe("player icon sprites", () => {
  let cleanup;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body></body>");
    global.document = dom.window.document;
    cleanup = () => {
      delete global.document;
    };
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("creates a canvas with natural dimensions", () => {
    const sprite = createPlayerIconSprite({ style: { fill: "#fff" } }, { size: 64 });
    expect(sprite.width).toBe(64);
    expect(sprite.height).toBe(64);
    expect(sprite.naturalWidth).toBe(64);
    expect(sprite.naturalHeight).toBe(64);
    expect(sprite.complete).toBe(true);
  });

  it("handles missing 2d contexts gracefully", () => {
    global.document = {
      createElement: () => ({ width: 0, height: 0, getContext: () => null })
    };
    const sprite = createPlayerIconSprite(null, { size: 32 });
    expect(sprite.width).toBe(32);
    expect(sprite.height).toBe(32);
    expect(sprite.naturalWidth).toBe(32);
  });
});
