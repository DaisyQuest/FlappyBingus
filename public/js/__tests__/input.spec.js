// @vitest-environment jsdom
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { Input } from "../input.js";

const makeCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.style = {};
  canvas.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 300, height: 200 }));
  return canvas;
};

describe("Input cursor mapping", () => {
  let listeners;
  let input;
  let canvas;
  let getBinds;
  let onAction;

  beforeEach(() => {
    listeners = {};
    canvas = makeCanvas();
    getBinds = vi.fn(() => ({}));
    onAction = vi.fn();
    input = new Input(canvas, getBinds, onAction);
    vi.spyOn(window, "addEventListener").mockImplementation((type, handler) => {
      listeners[type] = handler;
    });
    vi.spyOn(canvas, "addEventListener").mockImplementation(() => {});
    window.focus = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps pointer coordinates into logical canvas space", () => {
    canvas._logicalW = 300;
    canvas._logicalH = 200;
    canvas.getBoundingClientRect = vi.fn(() => ({ left: 10, top: 20, width: 600, height: 400 }));

    input.install();
    listeners.pointermove({ clientX: 310, clientY: 220 });

    expect(input.cursor).toEqual({ x: 150, y: 100, has: true });
  });

  it("falls back to canvas width/height when logical size is unavailable", () => {
    canvas.width = 400;
    canvas.height = 200;
    canvas.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 800, height: 400 }));

    input.install();
    listeners.pointermove({ clientX: 400, clientY: 200 });

    expect(input.cursor.x).toBeCloseTo(200);
    expect(input.cursor.y).toBeCloseTo(100);
    expect(input.cursor.has).toBe(true);
  });

  it("dispatches mouse-bound actions using the mapped cursor coordinates", () => {
    canvas._logicalW = 200;
    canvas._logicalH = 100;
    canvas.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 400, height: 200 }));
    getBinds.mockReturnValue({ teleport: { type: "mouse", button: 0 } });

    input.install();
    const preventDefault = vi.fn();
    listeners.pointerdown({
      button: 0,
      clientX: 200,
      clientY: 100,
      target: canvas,
      preventDefault
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(onAction).toHaveBeenCalledWith("teleport", expect.objectContaining({ type: "mouse", button: 0 }));
    expect(input.cursor.x).toBeCloseTo(100);
    expect(input.cursor.y).toBeCloseTo(50);
    expect(input.cursor.has).toBe(true);
  });
});
