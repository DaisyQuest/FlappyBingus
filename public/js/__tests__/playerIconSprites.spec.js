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

  it("applies a zigzag pattern when defined", () => {
    const calls = [];
    const ctx = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      translate: () => calls.push("translate"),
      beginPath: () => calls.push("beginPath"),
      arc: () => calls.push("arc"),
      fill: () => calls.push("fill"),
      stroke: () => calls.push("stroke"),
      clearRect: () => calls.push("clearRect"),
      lineTo: () => calls.push("lineTo"),
      moveTo: () => calls.push("moveTo"),
      set lineWidth(v) { this._lineWidth = v; },
      set strokeStyle(v) { this._strokeStyle = v; },
      set shadowColor(v) { this._shadowColor = v; },
      set shadowBlur(v) { this._shadowBlur = v; },
      set lineCap(v) { this._lineCap = v; }
    };
    const canvas = {
      width: 64,
      height: 64,
      naturalWidth: 64,
      naturalHeight: 64,
      complete: true,
      getContext: () => ctx
    };
    global.document = {
      createElement: (tag) => (tag === "canvas" ? canvas : {})
    };

    const sprite = createPlayerIconSprite({
      style: {
        fill: "#1e3a8a",
        core: "#38bdf8",
        pattern: { type: "zigzag", stroke: "#0ea5e9" }
      }
    }, { size: 64 });

    expect(sprite.__pattern?.type).toBe("zigzag");
    expect(calls).toContain("stroke");
  });

  it("renders a centerline guide pattern to help with perfect gap alignment", () => {
    const calls = [];
    const ctx = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      translate: () => calls.push("translate"),
      beginPath: () => calls.push("beginPath"),
      arc: () => calls.push("arc"),
      fill: () => calls.push("fill"),
      stroke: () => calls.push("stroke"),
      clearRect: () => calls.push("clearRect"),
      lineTo: () => calls.push("lineTo"),
      moveTo: () => calls.push("moveTo"),
      set lineWidth(v) { this._lineWidth = v; },
      set strokeStyle(v) { this._strokeStyle = v; },
      set shadowColor(v) { this._shadowColor = v; },
      set shadowBlur(v) { this._shadowBlur = v; },
      set lineCap(v) { this._lineCap = v; }
    };
    const canvas = {
      width: 80,
      height: 80,
      naturalWidth: 80,
      naturalHeight: 80,
      complete: true,
      getContext: () => ctx
    };
    global.document = {
      createElement: (tag) => (tag === "canvas" ? canvas : {})
    };

    const sprite = createPlayerIconSprite({
      style: {
        fill: "#0b1120",
        core: "#f8fafc",
        pattern: { type: "centerline", stroke: "#f8fafc", accent: "#facc15" }
      }
    }, { size: 80 });

    expect(sprite.__pattern?.type).toBe("centerline");
    expect(calls.filter((c) => c === "stroke").length).toBeGreaterThanOrEqual(2);
    expect(calls).toContain("moveTo");
  });
});
