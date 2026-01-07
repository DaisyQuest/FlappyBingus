import { describe, expect, it } from "vitest";
import { applyAnimationsToStyle, easingValue, resolveTimingProgress } from "../iconAnimationEngine.js";

const baseStyle = {
  palette: { glow: "#ffffff" },
  pattern: { rotationDeg: 0 },
  effects: [],
  animations: []
};

describe("icon animation engine", () => {
  it("resolves loop, pingpong, and once timing modes", () => {
    expect(resolveTimingProgress(500, { durationMs: 1000 }, "loop")).toBeCloseTo(0.5, 4);
    expect(resolveTimingProgress(1500, { durationMs: 1000 }, "loop")).toBeCloseTo(0.5, 4);
    expect(resolveTimingProgress(1500, { durationMs: 1000 }, "pingpong")).toBeCloseTo(0.5, 4);
    expect(resolveTimingProgress(2000, { durationMs: 1000 }, "once")).toBeCloseTo(1, 4);
  });

  it("applies easing curves deterministically", () => {
    expect(easingValue("easeIn", 0.5)).toBeLessThan(0.5);
    expect(easingValue("easeOut", 0.5)).toBeGreaterThan(0.5);
  });

  it("skips continuous animations when reduced motion is enabled", () => {
    const style = { ...baseStyle, animations: [
      { type: "slowSpin", target: "pattern.rotationDeg", enabled: true, timing: { durationMs: 1000 } }
    ] };
    const reduced = applyAnimationsToStyle(style, style.animations, { timeMs: 500, reducedMotion: true });
    const normal = applyAnimationsToStyle(style, style.animations, { timeMs: 500, reducedMotion: false });
    expect(reduced.style.pattern.rotationDeg).toBe(0);
    expect(normal.style.pattern.rotationDeg).not.toBe(0);
  });
});
