import { describe, expect, it } from "vitest";
import { applyAnimationsToStyle, easingValue, resolveTimingProgress } from "../iconAnimationEngine.js";

const baseStyle = {
  palette: { glow: "#ffffff" },
  pattern: { rotationDeg: 0 },
  effects: [],
  animations: []
};

const eventStyle = {
  palette: { glow: "#ffffff" },
  pattern: { rotationDeg: 0 },
  effects: [{ type: "radialRipple", params: { progress: 0 } }],
  animations: [
    {
      type: "radialRipple",
      target: "effects[0].params.progress",
      timing: { durationMs: 200 },
      triggeredBy: "anim:dash"
    }
  ]
};

const eventSpinStyle = {
  palette: { glow: "#ffffff" },
  pattern: { rotationDeg: 0 },
  effects: [],
  animations: [
    {
      type: "patternRotate",
      target: "pattern.rotationDeg",
      timing: { durationMs: 200 },
      params: { turns: 1 },
      triggeredBy: "anim:orbPickup"
    }
  ]
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

  it("applies event-driven animations for single events", () => {
    const events = [{ type: "anim:dash", timeMs: 100 }];
    const result = applyAnimationsToStyle(eventStyle, eventStyle.animations, {
      timeMs: 150,
      events
    });
    expect(result.style.effects[0].params.progress).toBeCloseTo(0.25, 4);
  });

  it("uses the most recent overlapping event for progress", () => {
    const events = [{ type: "anim:dash", timeMs: 100 }, { type: "anim:dash", timeMs: 140 }];
    const result = applyAnimationsToStyle(eventStyle, eventStyle.animations, {
      timeMs: 160,
      events
    });
    expect(result.style.effects[0].params.progress).toBeCloseTo(0.1, 4);
  });

  it("ignores invalid or mismatched event entries", () => {
    const events = [{ type: "anim:dash" }, { type: "anim:phase", timeMs: 100 }];
    const result = applyAnimationsToStyle(eventStyle, eventStyle.animations, {
      timeMs: 160,
      events
    });
    expect(result.style.effects[0].params.progress).toBe(0);
  });

  it("keeps event animations active when reduced motion is enabled", () => {
    const events = [{ type: "anim:dash", timeMs: 0 }];
    const result = applyAnimationsToStyle(eventStyle, eventStyle.animations, {
      timeMs: 100,
      events,
      reducedMotion: true
    });
    expect(result.style.effects[0].params.progress).toBeCloseTo(0.5, 4);
  });

  it("spins patterns based on event-triggered progress", () => {
    const events = [{ type: "anim:orbPickup", timeMs: 0 }];
    const result = applyAnimationsToStyle(eventSpinStyle, eventSpinStyle.animations, {
      timeMs: 50,
      events
    });
    expect(result.style.pattern.rotationDeg).toBeCloseTo(90, 4);
  });

  it("leaves pattern rotation unchanged when event is missing", () => {
    const result = applyAnimationsToStyle(eventSpinStyle, eventSpinStyle.animations, {
      timeMs: 50,
      events: []
    });
    expect(result.style.pattern.rotationDeg).toBe(0);
  });

  it("allows event-driven pattern rotation even with reduced motion", () => {
    const events = [{ type: "anim:orbPickup", timeMs: 0 }];
    const result = applyAnimationsToStyle(eventSpinStyle, eventSpinStyle.animations, {
      timeMs: 100,
      events,
      reducedMotion: true
    });
    expect(result.style.pattern.rotationDeg).toBeCloseTo(180, 4);
  });
});
