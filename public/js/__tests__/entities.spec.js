import { describe, expect, it } from "vitest";
import { Gate, Orb, Part, Pipe } from "../entities.js";

function createCtx() {
  const calls = [];
  const ctx = {
    calls,
    save() { calls.push({ op: "save" }); },
    restore() { calls.push({ op: "restore" }); },
    translate(x, y) { calls.push({ op: "translate", x, y }); },
    rotate(rad) { calls.push({ op: "rotate", rad }); },
    beginPath() { calls.push({ op: "beginPath" }); },
    closePath() { calls.push({ op: "closePath" }); },
    moveTo(x, y) { calls.push({ op: "moveTo", x, y }); },
    lineTo(x, y) { calls.push({ op: "lineTo", x, y }); },
    arc(x, y, r) { calls.push({ op: "arc", x, y, r }); },
    fill() { calls.push({ op: "fill" }); },
    stroke() { calls.push({ op: "stroke" }); },
    set globalCompositeOperation(value) { calls.push({ op: "globalCompositeOperation", value }); },
    set globalAlpha(value) { calls.push({ op: "globalAlpha", value }); },
    set fillStyle(value) { calls.push({ op: "fillStyle", value }); },
    set strokeStyle(value) { calls.push({ op: "strokeStyle", value }); },
    set lineWidth(value) { calls.push({ op: "lineWidth", value }); }
  };
  return ctx;
}

describe("entities", () => {
  it("updates pipes and marks them as entered", () => {
    const pipe = new Pipe(-5, 0, 10, 10, 0, 0);
    pipe.update(1, 1, 100, 100);
    expect(pipe.entered).toBe(true);
    expect(pipe.off(100, 100, 5)).toBe(false);
    pipe.x = -200;
    expect(pipe.off(100, 100, 5)).toBe(true);
  });

  it("tracks gate crossings and visibility", () => {
    const gate = new Gate("x", -50, 10, 0, 10, 20);
    gate.update(1, 100, 100);
    expect(gate.entered).toBe(false);

    gate.update(5, 100, 100);
    expect(gate.entered).toBe(true);

    gate.prev = 10;
    gate.pos = 20;
    expect(gate.crossed(15)).toBe(true);

    gate.cleared = true;
    expect(gate.crossed(15)).toBe(false);
    expect(gate.crossed(15, { allowCleared: true })).toBe(true);

    gate.perfected = true;
    expect(gate.crossed(15, { allowCleared: true })).toBe(false);
  });

  it("updates orbs, bounces off bounds, and expires", () => {
    const orb = new Orb(0, 0, -20, -30, 5, 1);
    orb.update(0.5, 100, 100);
    expect(orb.x).toBeGreaterThanOrEqual(9);
    expect(orb.vx).toBeGreaterThanOrEqual(0);
    expect(orb.y).toBeGreaterThanOrEqual(9);
    expect(orb.vy).toBeGreaterThanOrEqual(0);

    orb.update(1, 100, 100);
    expect(orb.dead()).toBe(true);
  });

  it("updates and draws particle variants", () => {
    const part = new Part(0, 0, 10, 0, 1, 8, "#fff", true);
    part.drag = 2;
    part.update(0.5);
    expect(part.vx).toBeLessThan(10);

    const ctx = createCtx();
    part.draw(ctx);
    expect(ctx.calls.some((c) => c.op === "arc")).toBe(true);

    const star = new Part(0, 0, 0, 0, 1, 6, "#fff", false);
    star.shape = "star";
    const starCtx = createCtx();
    star.draw(starCtx);
    expect(starCtx.calls.some((c) => c.op === "lineTo")).toBe(true);

    const lemon = new Part(0, 0, 0, 0, 1, 6, "#fff", false);
    lemon.shape = "lemon_slice";
    lemon.slice = { segments: 5 };
    const lemonCtx = createCtx();
    lemon.draw(lemonCtx);
    expect(lemonCtx.calls.some((c) => c.op === "stroke")).toBe(true);

    const hex = new Part(0, 0, 0, 0, 1, 6, "#fff", false);
    hex.shape = "hexagon";
    hex.fillColor = "#000";
    hex.strokeColor = "#fff";
    const hexCtx = createCtx();
    hex.draw(hexCtx);
    expect(hexCtx.calls.some((c) => c.op === "stroke")).toBe(true);

    const twinkle = new Part(0, 0, 0, 0, 1, 6, "#fff", false);
    twinkle.twinkle = true;
    const twinkleCtx = createCtx();
    twinkle.draw(twinkleCtx);
    expect(twinkleCtx.calls.filter((c) => c.op === "stroke").length).toBeGreaterThan(1);
  });

  it("skips drawing dead particles", () => {
    const part = new Part(0, 0, 0, 0, 0, 6, "#fff", false);
    const ctx = createCtx();
    part.draw(ctx);
    expect(ctx.calls.length).toBe(0);
  });
});
