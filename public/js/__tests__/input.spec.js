// @vitest-environment jsdom
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { Input } from "../input.js";

const makeCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.style = {};
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
    input.setLogicalSize(300, 200);
    input.setView({ x: 10, y: 20, width: 600, height: 400, scale: 1 });

    input.install();
    listeners.pointermove({ clientX: 310, clientY: 220 });

    expect(input.cursor).toEqual({ x: 150, y: 100, has: true });
  });

  it("falls back to logical dimensions when view metadata is invalid", () => {
    input.setLogicalSize(400, 200);
    input.setView({ x: 0, y: 0, width: 0, height: -5, scale: 1 });

    input.install();
    listeners.pointermove({ clientX: 200, clientY: 100 });

    expect(input.cursor.x).toBeCloseTo(200);
    expect(input.cursor.y).toBeCloseTo(100);
    expect(input.cursor.has).toBe(true);
  });

  it("defaults to unit logical size when the engine does not provide one", () => {
    input.setView({ x: 0, y: 0, width: 800, height: 400, scale: 1 });

    input.install();
    listeners.pointermove({ clientX: 400, clientY: 200 });

    expect(input.cursor.x).toBeCloseTo(0.5);
    expect(input.cursor.y).toBeCloseTo(0.5);
    expect(input.cursor.has).toBe(true);
  });

  it("dispatches mouse-bound actions using the mapped cursor coordinates", () => {
    input.setLogicalSize(200, 100);
    input.setView({ x: 50, y: 25, width: 200, height: 100, scale: 1 });
    getBinds.mockReturnValue({ teleport: { type: "mouse", button: 0 } });

    input.install();
    const preventDefault = vi.fn();
    listeners.pointerdown({
      button: 0,
      clientX: 150,
      clientY: 75,
      target: canvas,
      preventDefault
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(onAction).toHaveBeenCalledWith("teleport", expect.objectContaining({ type: "mouse", button: 0 }));
    expect(input.cursor.x).toBeCloseTo(100);
    expect(input.cursor.y).toBeCloseTo(50);
    expect(input.cursor.has).toBe(true);
  });

  it("prefers engine-provided logical size and view metadata", () => {
    input.setLogicalSize(300, 200);
    input.setView({ x: 60, y: 40, width: 300, height: 200, scale: 1 });
    input.install();
    listeners.pointermove({ clientX: 210, clientY: 140 });

    expect(input.cursor).toEqual({ x: 150, y: 100, has: true });
  });

  it("clears engine-provided logical size when invalid and falls back", () => {
    input.setView({ x: 0, y: 0, width: 800, height: 400, scale: 1 });
    input.setLogicalSize(-1, 0);
    input.install();
    listeners.pointermove({ clientX: 400, clientY: 200 });

    expect(input.cursor.x).toBeCloseTo(0.5);
    expect(input.cursor.y).toBeCloseTo(0.5);
    expect(input.cursor.has).toBe(true);
  });

  it("falls back to logical dimensions when the engine view is cleared", () => {
    input.setLogicalSize(200, 100);
    input.setView(null);
    input.install();
    listeners.pointermove({ clientX: 100, clientY: 50 });

    expect(input.cursor.x).toBeCloseTo(100);
    expect(input.cursor.y).toBeCloseTo(50);
  });

  it("ignores invalid view overrides and keeps using logical dimensions", () => {
    input.setLogicalSize(200, 100);
    input.setView("bad");
    input.install();
    listeners.pointermove({ clientX: 100, clientY: 50 });

    expect(input.cursor.x).toBeCloseTo(100);
    expect(input.cursor.y).toBeCloseTo(50);
  });

  it("ignores pointerdown events originating from UI controls", () => {
    const button = document.createElement("button");
    getBinds.mockReturnValue({ teleport: { type: "mouse", button: 2 } });

    input.install();
    listeners.pointerdown({
      button: 2,
      clientX: 20,
      clientY: 30,
      target: button,
      preventDefault: vi.fn()
    });

    expect(onAction).not.toHaveBeenCalled();
  });

  it("treats contenteditable and panel children as UI elements", () => {
    const editable = document.createElement("div");
    editable.isContentEditable = true;
    const panel = document.createElement("div");
    panel.className = "panel";
    const panelChild = document.createElement("span");
    panel.append(panelChild);
    document.body.append(panel);

    expect(input._isUiTarget(editable)).toBe(true);
    expect(input._isUiTarget(panelChild)).toBe(true);
    expect(input._isUiTarget(document.createElement("canvas"))).toBe(false);
  });

  it("prevents scrolling for movement keys and dispatches bound actions", () => {
    getBinds.mockReturnValue({ dash: { type: "key", code: "Space" } });
    input.install();

    const preventDefault = vi.fn();
    listeners.keydown({
      code: "KeyW",
      repeat: false,
      target: canvas,
      preventDefault
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(input.keys.KeyW).toBe(true);

    const dashPrevent = vi.fn();
    listeners.keydown({
      code: "Space",
      repeat: false,
      target: canvas,
      preventDefault: dashPrevent
    });

    expect(dashPrevent).toHaveBeenCalled();
    expect(onAction).toHaveBeenCalledWith("dash", expect.objectContaining({ type: "key", code: "Space" }));

    listeners.keydown({
      code: "Space",
      repeat: true,
      target: canvas,
      preventDefault: vi.fn()
    });

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("ignores keyboard events when focus is inside a typing field", () => {
    const inputEl = document.createElement("input");
    document.body.append(inputEl);
    inputEl.focus();

    input.install();
    listeners.keydown({
      code: "KeyA",
      repeat: false,
      target: inputEl,
      preventDefault: vi.fn()
    });
    listeners.keyup({
      code: "KeyA",
      repeat: false,
      target: inputEl
    });

    expect(input.keys.KeyA).not.toBe(true);
  });

  it("clears key state on keyup and resets keys between sessions", () => {
    document.activeElement?.blur?.();
    input.keys.KeyD = true;
    input.install();

    listeners.keyup({
      code: "KeyD",
      target: canvas
    });

    expect(input.keys.KeyD).toBe(false);
    input.reset();
    expect(Object.keys(input.keys)).toHaveLength(0);
  });
});
