import { describe, expect, it, vi } from "vitest";
import { Pipe, Gate, Orb, FloatText } from "../entities.js";

vi.mock("../audio.js", () => ({
  sfxOrbBoop: vi.fn(),
  sfxPerfectNice: vi.fn(),
  sfxDashBounce: vi.fn()
}));

describe("Pipe", () => {
  it("marks pipes as entered when crossing bounds and reports off-screen", () => {
    const pipe = new Pipe(-70, 0, 64, 50, 80, 0);
    expect(pipe.entered).toBe(false);

    pipe.update(1, 1, 100, 100);
    expect(pipe.entered).toBe(true);
    expect(pipe.off(100, 100, 0)).toBe(false);

    pipe.x = 500;
    expect(pipe.off(100, 100, 20)).toBe(true);
  });
});

describe("Gate", () => {
  it("detects crossings only after entering the playfield", () => {
    const gate = new Gate("x", -10, 40, 0, 0, 10);
    gate.update(0.5, 100, 100); // moves to x=10, marks entered
    expect(gate.entered).toBe(true);
    expect(gate.crossed(0)).toBe(true);

    gate.cleared = true;
    expect(gate.crossed(0)).toBe(false);
  });
});

describe("Orb", () => {
  it("bounces off arena walls and clamps to padded bounds", () => {
    const orb = new Orb(38, 20, 30, 0, 5, 1); // pad = 9, W - pad = 31
    orb.update(0.2, 40, 40);
    expect(orb.x).toBeCloseTo(31, 5);
    expect(orb.vx).toBeLessThan(0);
    expect(orb.dead()).toBe(false);
  });

  it("expires when life hits zero", () => {
    const orb = new Orb(0, 0, 0, 0, 5, 0.05);
    orb.update(0.1, 100, 100);
    expect(orb.dead()).toBe(true);
  });
});

describe("FloatText", () => {
  it("decays life and damps velocity over time", () => {
    const text = new FloatText("hi", 0, 0, "#fff");
    text.vx = 100;
    text.vy = -50;

    text.update(0.1);
    expect(text.life).toBeCloseTo(0.8, 5);
    expect(text.vx).toBeLessThan(100);
    expect(text.vy).toBeGreaterThan(-50); // magnitude decreased by drag factor
  });
});
