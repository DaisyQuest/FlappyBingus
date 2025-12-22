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

  it("renders the Perfect Line Beacon crosshair centered and in bright red", () => {
    const operations = [];
    const ctx = {
      _lineWidth: 1,
      save: () => operations.push({ type: "save" }),
      restore: () => operations.push({ type: "restore" }),
      translate: (x, y) => operations.push({ type: "translate", x, y }),
      beginPath: () => operations.push({ type: "beginPath" }),
      arc: () => operations.push({ type: "arc" }),
      fill: () =>
        operations.push({
          type: "fill",
          fillStyle: ctx.fillStyle,
          shadowColor: ctx.shadowColor,
          shadowBlur: ctx.shadowBlur
        }),
      stroke: () =>
        operations.push({
          type: "stroke",
          strokeStyle: ctx.strokeStyle,
          lineWidth: ctx.lineWidth,
          shadowBlur: ctx.shadowBlur
        }),
      clearRect: () => operations.push({ type: "clearRect" }),
      lineTo: (x, y) => operations.push({ type: "lineTo", x, y }),
      moveTo: (x, y) => operations.push({ type: "moveTo", x, y }),
      set lineWidth(v) { this._lineWidth = v; },
      get lineWidth() { return this._lineWidth; },
      set strokeStyle(v) { this._strokeStyle = v; },
      get strokeStyle() { return this._strokeStyle; },
      set fillStyle(v) { this._fillStyle = v; },
      get fillStyle() { return this._fillStyle; },
      set shadowColor(v) { this._shadowColor = v; },
      get shadowColor() { return this._shadowColor; },
      set shadowBlur(v) { this._shadowBlur = v; },
      get shadowBlur() { return this._shadowBlur; },
      set lineCap(v) { this._lineCap = v; },
      get lineCap() { return this._lineCap; }
    };
    const canvas = {
      width: 100,
      height: 100,
      naturalWidth: 100,
      naturalHeight: 100,
      complete: true,
      getContext: () => ctx
    };
    global.document = {
      createElement: (tag) => (tag === "canvas" ? canvas : {})
    };

    const sprite = createPlayerIconSprite({
      style: {
        fill: "#000000",
        core: "#000000",
        rim: "#ff1a1a",
        glow: "#ff4d4d",
        pattern: { type: "centerline", stroke: "#ff1a1a", accent: "#ff1a1a", glow: "#ff4d4d" }
      }
    }, { size: 100 });

    expect(sprite.__pattern?.type).toBe("centerline");

    const radius = 100 * 0.46 * 0.82;
    const moveSteps = operations.filter((op) => op.type === "moveTo");
    expect(moveSteps).toHaveLength(2);
    expect(moveSteps[0].x).toBe(0);
    expect(moveSteps[0].y).toBeCloseTo(-radius * 0.85, 6);
    expect(moveSteps[1].x).toBeCloseTo(-radius * 0.5, 6);
    expect(moveSteps[1].y).toBe(0);

    const strokes = operations.filter((op) => op.type === "stroke");
    expect(strokes).toHaveLength(3); // rim + 2 centerline strokes
    expect(strokes[1].strokeStyle).toBe("#ff1a1a");
    expect(strokes[1].lineWidth).toBeCloseTo(Math.max(2, 100 * 0.065), 6);
    expect(strokes[2].strokeStyle).toBe("#ff1a1a");
    expect(strokes[2].lineWidth).toBeCloseTo(Math.max(2, 100 * 0.04), 6);

    const fills = operations.filter((op) => op.type === "fill");
    expect(fills[0].fillStyle).toBe("#000000");
    expect(fills[1].fillStyle).toBe("#000000");

    const translation = operations.find((op) => op.type === "translate");
    expect(translation).toEqual({ type: "translate", x: 50, y: 50 });
  });
});
