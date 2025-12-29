import { describe, expect, it, vi, afterEach } from "vitest";
import { FloatText, Gate, Part } from "../entities.js";
import { setRandSource } from "../util.js";

const makeMockCtx = () => {
  const ops = [];
  const gradientStops = [];
  return {
    ops,
    gradientStops,
    save: () => ops.push("save"),
    restore: () => ops.push("restore"),
    translate: (...args) => ops.push(["translate", ...args]),
    rotate: (...args) => ops.push(["rotate", ...args]),
    beginPath: () => ops.push("beginPath"),
    moveTo: (...args) => ops.push(["moveTo", ...args]),
    lineTo: (...args) => ops.push(["lineTo", ...args]),
    closePath: () => ops.push("closePath"),
    stroke: () => ops.push("stroke"),
    fill: () => ops.push("fill"),
    arc: (...args) => ops.push(["arc", ...args]),
    createLinearGradient: () => ({
      addColorStop: (p, c) => gradientStops.push({ p, c })
    }),
    fillText: (txt) => ops.push(["fillText", txt]),
    strokeText: (txt) => ops.push(["strokeText", txt])
  };
};

describe("Gate crossings", () => {
  it("blocks crossings until entered and handles negative velocity", () => {
    const gate = new Gate("y", 120, -40, 10, 5, 4);
    expect(gate.crossed(10)).toBe(false);

    gate.update(0.3, 100, 100); // moves to y=108, still not entered
    expect(gate.entered).toBe(false);
    gate.update(0.5, 100, 100); // moves into the arena and enters
    expect(gate.entered).toBe(true);

    gate.prev = 15; gate.pos = 5;
    gate.cleared = true;
    expect(gate.crossed(10)).toBe(false);
    expect(gate.crossed(10, { allowCleared: true })).toBe(true);
    gate.pos = 40;
    expect(gate.off(100, 30, 1)).toBe(true);
  });
});

describe("Part drawing", () => {
  afterEach(() => {
    setRandSource();
  });

  it("applies drag while updating and renders twinkle sprites", () => {
    const ctx = makeMockCtx();
    const p = new Part(0, 0, 10, 0, 1, 3, "red", false);
    p.drag = 2;
    p.twinkle = true;

    p.update(0.1);
    expect(p.vx).toBeLessThan(10);
    expect(p.life).toBeLessThan(1);

    p.draw(ctx);
    expect(ctx.ops).toContain("stroke");
    expect(ctx.ops).toContain("fill");

    p.life = -0.01;
    ctx.ops.length = 0;
    p.draw(ctx);
    expect(ctx.ops).toEqual([]); // skipped rendering when dead
  });

  it("renders lemon slice segments when configured", () => {
    const ctx = makeMockCtx();
    const p = new Part(10, 12, 0, 0, 1, 6, "rgba(255,200,0,1)", true);
    p.shape = "lemon_slice";
    p.slice = { rind: "rind", pith: "pith", segment: "seg", segments: 6 };
    p.rotation = Math.PI / 6;

    p.draw(ctx);
    expect(ctx.ops).toContain("stroke");
    expect(ctx.ops.some((op) => Array.isArray(op) && op[0] === "lineTo")).toBe(true);
    expect(ctx.ops.some((op) => Array.isArray(op) && op[0] === "translate")).toBe(true);
  });

  it("renders classic five-point stars when configured", () => {
    const ctx = makeMockCtx();
    const p = new Part(8, 9, 0, 0, 1, 5, "#ff0", false);
    p.shape = "star";
    p.rotation = Math.PI / 4;

    p.draw(ctx);

    expect(ctx.ops).toContain("fill");
    expect(ctx.ops).toContain("closePath");
    expect(ctx.ops.some((op) => Array.isArray(op) && op[0] === "lineTo")).toBe(true);
    expect(ctx.ops.some((op) => Array.isArray(op) && op[0] === "translate")).toBe(true);
  });

  it("renders honeycomb hexagons with fills and outlines", () => {
    const ctx = makeMockCtx();
    const p = new Part(12, 14, 0, 0, 1, 6, "#fbbf24", true);
    p.shape = "hexagon";
    p.fillColor = "rgba(255, 224, 130, 0.4)";
    p.strokeColor = "rgba(245, 158, 11, 0.9)";
    p.lineWidth = 1.6;
    p.rotation = Math.PI / 6;

    p.draw(ctx);

    expect(ctx.ops).toContain("fill");
    expect(ctx.ops).toContain("stroke");
    expect(ctx.ops).toContain("closePath");
    expect(ctx.ops.some((op) => Array.isArray(op) && op[0] === "lineTo")).toBe(true);
  });
});

describe("FloatText visuals", () => {
  afterEach(() => {
    setRandSource();
  });

  it("builds gradients and sparkles when configured", () => {
    setRandSource(() => 0.25);
    const ctx = makeMockCtx();
    const text = new FloatText("wow", 5, 5, "#fff", {
      palette: ["#111", "#222", "#333"],
      shimmer: 1,
      wobble: 1,
      spin: 0.5,
      sparkle: true,
      combo: 3,
      comboMax: 4,
      strokeWidth: 0
    });

    // advance phase to exercise wobble/rotation
    text.update(0.2);
    text.draw(ctx);

    expect(ctx.gradientStops.length).toBeGreaterThan(1);
    expect(ctx.ops.some((op) => Array.isArray(op) && op[0] === "arc")).toBe(true);
  });
});
