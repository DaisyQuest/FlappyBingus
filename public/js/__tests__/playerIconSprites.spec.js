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

  it("exposes the provided event list for runtime animation triggers", () => {
    const events = [];
    const sprite = createPlayerIconSprite({ style: { fill: "#fff" } }, { size: 48, events });
    expect(sprite.__events).toBe(events);
    sprite.__events.push({ type: "orbPickup", timeMs: 1 });
    expect(events).toHaveLength(1);
  });

  it("normalizes missing event arrays", () => {
    const sprite = createPlayerIconSprite({ style: { fill: "#fff" } }, { size: 48, events: null });
    expect(Array.isArray(sprite.__events)).toBe(true);
    expect(sprite.__events).toHaveLength(0);
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

  it("draws image-based icons when a sprite source is provided", () => {
    const drawImage = vi.fn();
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
      drawImage,
      set lineWidth(v) { this._lineWidth = v; },
      set strokeStyle(v) { this._strokeStyle = v; },
      set shadowColor(v) { this._shadowColor = v; },
      set shadowBlur(v) { this._shadowBlur = v; }
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
    const prevImage = global.Image;
    class MockImage {
      constructor() {
        this.complete = false;
        this.width = 32;
        this.height = 32;
        this.naturalWidth = 32;
        this.naturalHeight = 32;
        this._listeners = {};
      }
      addEventListener(event, cb) {
        this._listeners[event] = cb;
      }
      set src(value) {
        this._src = value;
        this.complete = true;
        this._listeners.load?.();
      }
    }
    global.Image = MockImage;

    try {
      const sprite = createPlayerIconSprite({ imageSrc: "/file.png", style: { fill: "#000" } }, { size: 64 });
      expect(sprite.__image).toBeInstanceOf(MockImage);
      expect(drawImage).toHaveBeenCalled();
    } finally {
      global.Image = prevImage;
    }
  });

  it("supports animated fills for image-based icons", () => {
    const addColorStop = vi.fn();
    const createLinearGradient = vi.fn(() => ({ addColorStop }));
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
      drawImage: () => {},
      createLinearGradient,
      set lineWidth(v) { this._lineWidth = v; },
      set strokeStyle(v) { this._strokeStyle = v; },
      set shadowColor(v) { this._shadowColor = v; },
      set shadowBlur(v) { this._shadowBlur = v; },
      set globalAlpha(v) { this._globalAlpha = v; }
    };
    const canvas = { width: 64, height: 64 };
    const icon = {
      style: {
        fill: "#000",
        animation: { type: "lava", speed: 0.2 }
      }
    };
    const image = { width: 32, height: 32, naturalWidth: 32, naturalHeight: 32 };

    __testables.drawImageIconFrame(ctx, canvas, icon, image, { animationPhase: 0.5 });
    expect(createLinearGradient).toHaveBeenCalled();
    expect(addColorStop).toHaveBeenCalled();
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

  it("lays cobblestone texture overlays for molten capes", () => {
    const ops = [];
    const fillStyles = [];
    const strokeStyles = [];
    const alphaValues = [];
    const ctx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      beginPath: () => ops.push("beginPath"),
      arc: () => ops.push("arc"),
      clip: () => {},
      fill: () => {
        ops.push("fill");
        fillStyles.push(ctx.fillStyle);
        alphaValues.push(ctx.globalAlpha);
      },
      stroke: () => {
        ops.push("stroke");
        strokeStyles.push(ctx.strokeStyle);
        alphaValues.push(ctx.globalAlpha);
      },
      clearRect: () => {},
      moveTo: () => ops.push("moveTo"),
      lineTo: () => ops.push("lineTo"),
      closePath: () => ops.push("closePath"),
      set lineWidth(v) { this._lineWidth = v; },
      set strokeStyle(v) { this._strokeStyle = v; },
      get strokeStyle() { return this._strokeStyle; },
      set fillStyle(v) { this._fillStyle = v; },
      get fillStyle() { return this._fillStyle; },
      set shadowColor(v) { this._shadowColor = v; },
      set shadowBlur(v) { this._shadowBlur = v; },
      set globalAlpha(v) { this._globalAlpha = v; },
      get globalAlpha() { return this._globalAlpha ?? 1; }
    };
    const canvas = {
      width: 96,
      height: 96,
      naturalWidth: 96,
      naturalHeight: 96,
      complete: true,
      getContext: () => ctx
    };
    global.document = {
      createElement: (tag) => (tag === "canvas" ? canvas : {})
    };

    const sprite = createPlayerIconSprite({
      style: {
        fill: "#1d0707",
        core: "#ffb264",
        rim: "#110404",
        glow: "#ffd08a",
        pattern: {
          type: "cobblestone",
          base: "#2a0c0b",
          highlight: "#ff8a2a",
          stroke: "#130404"
        }
      }
    }, { size: 96 });

    expect(sprite.__pattern?.type).toBe("cobblestone");
    expect(ops).toContain("fill");
    expect(ops).toContain("stroke");
    expect(fillStyles).toContain("#2a0c0b");
    expect(fillStyles).toContain("#ff8a2a");
    expect(strokeStyles).toContain("#130404");
    expect(alphaValues.some((alpha) => alpha < 1)).toBe(true);
    expect(ctx.globalAlpha).toBe(1);
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
    const outer = 100 * 0.46;
    expect(strokes[1].lineWidth).toBeCloseTo(Math.max(2, outer * 0.16), 6);
    expect(strokes[2].strokeStyle).toBe("#ff1a1a");
    expect(strokes[2].lineWidth).toBeCloseTo(Math.max(2, outer * 0.1), 6);

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

  it("clamps animation helpers to a [0, 1] range", () => {
    expect(__testables.clamp01(-2)).toBe(0);
    expect(__testables.clamp01(0.4)).toBe(0.4);
    expect(__testables.clamp01(2)).toBe(1);
  });

  it("falls back to custom colors when gradients are unavailable", () => {
    const lava = __testables.createLavaGradient(null, 40, { fallback: "#123" }, 0.1);
    const cape = __testables.createCapeFlowGradient({ createLinearGradient: null }, 40, { fallback: "#456" }, 0.2);
    expect(lava).toBe("#123");
    expect(cape).toBe("#456");
  });

  it("resets the alpha channel after drawing cape embers", () => {
    const ctx = {
      globalAlpha: 0,
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      set fillStyle(v) { this._fillStyle = v; },
      get fillStyle() { return this._fillStyle; }
    };

    __testables.drawCapeEmbers(ctx, 40, { embers: 0.2, palette: { ember: "#123" } }, 0.5);
    expect(ctx.globalAlpha).toBe(1);
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("skips pattern metadata when no pattern is supplied", () => {
    const ctx = {
      clearRect: () => {},
      save: () => {},
      translate: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      restore: () => {},
      set lineWidth(v) { this._lineWidth = v; },
      get lineWidth() { return this._lineWidth; }
    };
    const canvas = { width: 80, height: 80 };
    __testables.renderIconFrame(ctx, canvas, { style: { fill: "#123" } }, { animationPhase: 0.2 });
    expect(canvas.__pattern).toBeUndefined();
  });

  it("avoids drawing images when the sprite has no dimensions", () => {
    const ctx = {
      clearRect: () => {},
      save: () => {},
      translate: () => {},
      beginPath: () => {},
      arc: () => {},
      clip: () => {},
      fill: () => {},
      stroke: () => {},
      restore: () => {},
      drawImage: vi.fn(),
      set lineWidth(v) { this._lineWidth = v; },
      get lineWidth() { return this._lineWidth; }
    };
    const canvas = { width: 80, height: 80 };
    const image = { width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 };

    __testables.drawImageIconFrame(ctx, canvas, { style: { fill: "#123" } }, image, { animationPhase: 0.1 });
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("does not start sprite animations when motion is reduced", () => {
    const prevRaf = global.requestAnimationFrame;
    global.requestAnimationFrame = vi.fn();
    const icon = { style: { version: 2, animations: [{ id: "pulse", type: "pulseUniform", target: "palette.fill" }] } };

    try {
      const result = __testables.maybeStartSpriteAnimation({}, icon, () => {}, { reducedMotion: true });
      expect(result).toBeNull();
      expect(global.requestAnimationFrame).not.toHaveBeenCalled();
    } finally {
      global.requestAnimationFrame = prevRaf;
    }
  });

  it("returns null when requestAnimationFrame is unavailable", () => {
    const prevRaf = global.requestAnimationFrame;
    global.requestAnimationFrame = undefined;
    const icon = { style: { version: 2, animations: [{ id: "pulse", type: "pulseUniform", target: "palette.fill" }] } };

    try {
      const result = __testables.maybeStartSpriteAnimation({}, icon, () => {}, { reducedMotion: false });
      expect(result).toBeNull();
    } finally {
      global.requestAnimationFrame = prevRaf;
    }
  });

  it("stops running animations and cancels frames", () => {
    const prevRaf = global.requestAnimationFrame;
    const prevCaf = global.cancelAnimationFrame;
    global.requestAnimationFrame = vi.fn(() => 12);
    global.cancelAnimationFrame = vi.fn();
    const icon = { style: { version: 2, animations: [{ id: "pulse", type: "pulseUniform", target: "palette.fill" }] } };

    try {
      const state = __testables.maybeStartSpriteAnimation({}, icon, () => {}, { reducedMotion: false });
      expect(state?.running).toBe(true);
      state.stop();
      expect(state.running).toBe(false);
      expect(global.cancelAnimationFrame).toHaveBeenCalledWith(12);
    } finally {
      global.requestAnimationFrame = prevRaf;
      global.cancelAnimationFrame = prevCaf;
    }
  });
});
