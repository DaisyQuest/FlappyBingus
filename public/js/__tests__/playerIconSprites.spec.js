import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { __testables, createPlayerIconSprite } from "../playerIconSprites.js";

describe("player icon sprites", () => {
  let cleanup;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body></body>");
    global.document = dom.window.document;
    const originalGetContext = global.HTMLCanvasElement?.prototype?.getContext;
    if (global.HTMLCanvasElement?.prototype) {
      global.HTMLCanvasElement.prototype.getContext = () => null;
    }
    cleanup = () => {
      delete global.document;
      if (global.HTMLCanvasElement?.prototype) {
        global.HTMLCanvasElement.prototype.getContext = originalGetContext;
      }
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

  it("scrolls zigzag patterns when the animation is enabled", () => {
    const translations = [];
    const ctx = {
      save: () => {},
      restore: () => {},
      translate: (x, y) => translations.push({ x, y }),
      beginPath: () => {},
      arc: () => {},
      clip: () => {},
      fill: () => {},
      stroke: () => {},
      clearRect: () => {},
      lineTo: () => {},
      moveTo: () => {},
      set lineWidth(v) { this._lineWidth = v; },
      set strokeStyle(v) { this._strokeStyle = v; },
      set shadowColor(v) { this._shadowColor = v; },
      set shadowBlur(v) { this._shadowBlur = v; },
      set lineCap(v) { this._lineCap = v; },
      set lineJoin(v) { this._lineJoin = v; }
    };
    const canvas = {
      width: 90,
      height: 90,
      naturalWidth: 90,
      naturalHeight: 90,
      complete: true,
      getContext: () => ctx
    };
    const prevDocument = global.document;
    const prevRaf = global.requestAnimationFrame;
    const prevCaf = global.cancelAnimationFrame;
    const rafCallbacks = [];
    global.document = { createElement: (tag) => (tag === "canvas" ? canvas : {}) };
    global.requestAnimationFrame = (cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    };
    global.cancelAnimationFrame = vi.fn();

    try {
      const sprite = createPlayerIconSprite({
        style: {
          fill: "#f8fbff",
          core: "#e0f2fe",
          rim: "#7dd3fc",
          glow: "#bae6fd",
          pattern: { type: "zigzag", stroke: "#7dd3fc", amplitude: 0.2, waves: 7, spacing: 8 },
          animation: { type: "zigzag_scroll", speed: 1 }
        }
      }, { size: 90 });

      expect(sprite.__animation?.running).toBe(true);
      const initialPatternTranslations = translations.filter((entry) => entry.x < 0);
      expect(initialPatternTranslations.length).toBeGreaterThan(0);

      rafCallbacks[0]?.(0);
      rafCallbacks[1]?.(500);

      const patternTranslations = translations.filter((entry) => entry.x < 0);
      const firstY = patternTranslations.at(-2)?.y;
      const lastY = patternTranslations.at(-1)?.y;
      expect(firstY).not.toBeUndefined();
      expect(lastY).not.toBeUndefined();
      expect(firstY).not.toBeCloseTo(lastY, 5);
    } finally {
      global.document = prevDocument;
      global.requestAnimationFrame = prevRaf;
      global.cancelAnimationFrame = prevCaf;
    }
  });

  it("paints stripe bands when the pattern requests stripes", () => {
    const stripeCalls = [];
    const ctx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      beginPath: () => {},
      arc: () => {},
      clip: () => {},
      fill: () => {},
      stroke: () => {},
      clearRect: () => {},
      fillRect: (x, y, w, h) => stripeCalls.push({ x, y, w, h, fillStyle: ctx.fillStyle }),
      set lineWidth(v) { this._lineWidth = v; },
      set strokeStyle(v) { this._strokeStyle = v; },
      set fillStyle(v) { this._fillStyle = v; },
      get fillStyle() { return this._fillStyle; },
      set shadowColor(v) { this._shadowColor = v; },
      set shadowBlur(v) { this._shadowBlur = v; }
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
        fill: "#facc15",
        core: "#111827",
        pattern: { type: "stripes", colors: ["#0b0b0b", "#facc15"] }
      }
    }, { size: 80 });

    expect(sprite.__pattern?.type).toBe("stripes");
    const bandColors = new Set(stripeCalls.map((call) => call.fillStyle));
    expect(bandColors.has("#0b0b0b")).toBe(true);
    expect(bandColors.has("#facc15")).toBe(true);
  });

  it("draws a honeycomb lattice when requested", () => {
    const honeyOps = [];
    const ctx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      beginPath: () => honeyOps.push("beginPath"),
      arc: () => honeyOps.push("arc"),
      clip: () => {},
      fill: () => {},
      stroke: () => honeyOps.push("stroke"),
      clearRect: () => {},
      moveTo: () => honeyOps.push("moveTo"),
      lineTo: () => honeyOps.push("lineTo"),
      closePath: () => honeyOps.push("closePath"),
      set lineWidth(v) { this._lineWidth = v; },
      set strokeStyle(v) { this._strokeStyle = v; },
      set shadowColor(v) { this._shadowColor = v; },
      set shadowBlur(v) { this._shadowBlur = v; }
    };
    const canvas = {
      width: 90,
      height: 90,
      naturalWidth: 90,
      naturalHeight: 90,
      complete: true,
      getContext: () => ctx
    };
    global.document = {
      createElement: (tag) => (tag === "canvas" ? canvas : {})
    };

    const sprite = createPlayerIconSprite({
      style: {
        fill: "#fbbf24",
        core: "#fde68a",
        pattern: { type: "honeycomb", stroke: "#f59e0b" }
      }
    }, { size: 90 });

    expect(sprite.__pattern?.type).toBe("honeycomb");
    expect(honeyOps).toContain("stroke");
    expect(honeyOps).toContain("lineTo");
  });

  it("sketches citrus slice segments for lemon icons", () => {
    const citrusOps = [];
    const strokeStyles = [];
    const ctx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      beginPath: () => citrusOps.push("beginPath"),
      arc: () => citrusOps.push("arc"),
      clip: () => {},
      fill: () => {},
      stroke: () => citrusOps.push("stroke"),
      clearRect: () => {},
      moveTo: () => citrusOps.push("moveTo"),
      lineTo: () => citrusOps.push("lineTo"),
      set lineWidth(v) { this._lineWidth = v; },
      set strokeStyle(v) { this._strokeStyle = v; strokeStyles.push(v); },
      set shadowColor(v) { this._shadowColor = v; },
      set shadowBlur(v) { this._shadowBlur = v; }
    };
    const canvas = {
      width: 88,
      height: 88,
      naturalWidth: 88,
      naturalHeight: 88,
      complete: true,
      getContext: () => ctx
    };
    global.document = {
      createElement: (tag) => (tag === "canvas" ? canvas : {})
    };

    const sprite = createPlayerIconSprite({
      style: {
        fill: "#facc15",
        core: "#fef08a",
      pattern: {
        type: "citrus_slice",
        stroke: "#f59e0b",
        rindStroke: "#f59e0b",
        segmentStroke: "#ea8c00",
        segments: 10
      }
    }
  }, { size: 88 });

    expect(sprite.__pattern?.type).toBe("citrus_slice");
    expect(citrusOps).toContain("lineTo");
    expect(citrusOps).toContain("arc");
    expect(strokeStyles).toContain("#f59e0b");
    expect(strokeStyles).toContain("#ea8c00");
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

  it("animates lava icons with a flowing gradient fill", () => {
    const operations = [];
    const gradients = [];
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
          fillStyle: ctx.fillStyle
        }),
      stroke: () => operations.push({ type: "stroke", strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth }),
      clearRect: () => operations.push({ type: "clearRect" }),
      lineTo: () => {},
      moveTo: () => {},
      set lineWidth(v) { this._lineWidth = v; },
      get lineWidth() { return this._lineWidth; },
      set strokeStyle(v) { this._strokeStyle = v; },
      get strokeStyle() { return this._strokeStyle; },
      set fillStyle(v) { this._fillStyle = v; },
      get fillStyle() { return this._fillStyle; },
      set shadowColor(v) { this._shadowColor = v; },
      set shadowBlur(v) { this._shadowBlur = v; },
      set lineCap(v) { this._lineCap = v; },
      createLinearGradient: () => {
        const grad = { stops: [], addColorStop(pos, color) { this.stops.push({ pos, color }); } };
        gradients.push(grad);
        return grad;
      }
    };
    const canvas = {
      width: 80,
      height: 80,
      naturalWidth: 80,
      naturalHeight: 80,
      complete: true,
      getContext: () => ctx
    };
    const prevDocument = global.document;
    const prevRaf = global.requestAnimationFrame;
    const prevCaf = global.cancelAnimationFrame;
    const rafCallbacks = [];
    global.document = { createElement: (tag) => (tag === "canvas" ? canvas : {}) };
    global.requestAnimationFrame = (cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    };
    global.cancelAnimationFrame = vi.fn();

    try {
      const sprite = createPlayerIconSprite({
        style: {
          fill: "#220b0b",
          core: "#ff8c1a",
          rim: "#0f0f0f",
          glow: "#ffb347",
          animation: { type: "lava", speed: 0.5, layers: 2 }
        }
      }, { size: 80 });

      expect(sprite.__animation?.running).toBe(true);
      expect(gradients.length).toBeGreaterThanOrEqual(2);
      const fills = operations.filter((op) => op.type === "fill");
      expect(fills[0]?.fillStyle).toBe(gradients[0]);
      expect(fills[1]?.fillStyle).toBe(gradients[1]);

      rafCallbacks[0]?.(16);
      expect(gradients.length).toBeGreaterThan(2);
    } finally {
      global.document = prevDocument;
      global.requestAnimationFrame = prevRaf;
      global.cancelAnimationFrame = prevCaf;
    }
  });

  it("renders cape flow icons with ember streaks that flow downward", () => {
    const operations = [];
    const gradients = [];
    const ctx = {
      _lineWidth: 1,
      save: () => operations.push({ type: "save" }),
      restore: () => operations.push({ type: "restore" }),
      translate: (x, y) => operations.push({ type: "translate", x, y }),
      beginPath: () => operations.push({ type: "beginPath" }),
      arc: () => operations.push({ type: "arc" }),
      clip: () => operations.push({ type: "clip" }),
      fill: () =>
        operations.push({
          type: "fill",
          fillStyle: ctx.fillStyle,
          globalAlpha: ctx.globalAlpha
        }),
      stroke: () => operations.push({ type: "stroke" }),
      clearRect: () => operations.push({ type: "clearRect" }),
      lineTo: () => {},
      moveTo: () => {},
      set lineWidth(v) { this._lineWidth = v; },
      get lineWidth() { return this._lineWidth; },
      set strokeStyle(v) { this._strokeStyle = v; },
      get strokeStyle() { return this._strokeStyle; },
      set fillStyle(v) { this._fillStyle = v; },
      get fillStyle() { return this._fillStyle; },
      set shadowColor(v) { this._shadowColor = v; },
      set shadowBlur(v) { this._shadowBlur = v; },
      set lineCap(v) { this._lineCap = v; },
      set globalAlpha(v) { this._globalAlpha = v; },
      get globalAlpha() { return this._globalAlpha ?? 1; },
      createLinearGradient: () => {
        const grad = { stops: [], addColorStop(pos, color) { this.stops.push({ pos, color }); } };
        gradients.push(grad);
        return grad;
      }
    };
    const canvas = {
      width: 90,
      height: 90,
      naturalWidth: 90,
      naturalHeight: 90,
      complete: true,
      getContext: () => ctx
    };
    const prevDocument = global.document;
    global.document = { createElement: (tag) => (tag === "canvas" ? canvas : {}) };

    try {
      const sprite = createPlayerIconSprite({
        style: {
          fill: "#2f0a0a",
          core: "#ffb14b",
          animation: { type: "cape_flow", speed: 0.4, bands: 5, embers: 1 }
        }
      }, { size: 90 });

      expect(sprite.width).toBe(90);
      expect(gradients.length).toBeGreaterThan(1);
      expect(operations.some((op) => op.type === "clip")).toBe(true);
      const fills = operations.filter((op) => op.type === "fill");
      expect(fills.length).toBeGreaterThan(1);
      const fillStyles = fills.map((fill) => fill.fillStyle);
      expect(fillStyles).toContain(gradients[0]);
      expect(fillStyles).toContain(gradients[1]);
    } finally {
      global.document = prevDocument;
    }
  });

  it("builds cape flow gradients with multiple color bands", () => {
    const gradients = [];
    const ctx = {
      createLinearGradient: () => {
        const grad = { stops: [], addColorStop(pos, color) { this.stops.push({ pos, color }); } };
        gradients.push(grad);
        return grad;
      }
    };

    const grad = __testables.createCapeFlowGradient(ctx, 40, { bands: 6 }, 0.25);
    expect(grad).toBe(gradients[0]);
    expect(gradients[0].stops.length).toBeGreaterThan(4);
  });

  it("softens lava gradients when smoothness is increased", () => {
    const ctx = {
      createLinearGradient: () => ({ stops: [], addColorStop(pos, color) { this.stops.push({ pos, color }); } })
    };

    const rough = __testables.createLavaGradient(ctx, 40, { layers: 2, smoothness: 0 }, 0.37);
    const smooth = __testables.createLavaGradient(ctx, 40, { layers: 2, smoothness: 1 }, 0.37);
    expect(rough.stops.length).toBeGreaterThan(0);
    expect(smooth.stops.length).toBeGreaterThan(0);
    expect(rough.stops[1].pos).not.toBeCloseTo(smooth.stops[1].pos, 6);
  });
});
