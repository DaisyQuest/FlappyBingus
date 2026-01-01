import { describe, expect, it } from "vitest";
import {
  createBackgroundStudioRenderer,
  normalizeBackgroundConfig,
  resolveBackgroundBaseColor
} from "../backgroundStudioEngine.js";

const baseConfig = {
  id: "test",
  name: "Test",
  loopSeconds: 10,
  global: {
    baseColor: "#000000",
    gradient: { shape: "radial", colors: ["#000000", "#111111"], opacity: 0, radius: 1, angleDeg: 0, center: { x: 0.5, y: 0.5 } },
    glow: { color: "#ffffff", intensity: 0, radius: 0.5, position: { x: 0.5, y: 0.5 } }
  },
  timeline: []
};

describe("backgroundStudioEngine", () => {
  it("normalizes timeline entries and clamps ranges", () => {
    const config = normalizeBackgroundConfig({
      loopSeconds: 5,
      timeline: [
        { type: "particleBurst", time: 10, x: 2, y: -1, count: 0, speed: -5, spread: 999, life: 20 },
        { type: "randomGlow", time: -4, radius: 10, intensity: -1, duration: -1 },
        { type: "baseColorChange", time: 2, color: "#fff" },
        { type: "unknown", time: 1 }
      ]
    });

    const burst = config.timeline.find((entry) => entry.type === "particleBurst");
    expect(burst.time).toBe(5);
    expect(burst.x).toBe(1);
    expect(burst.y).toBe(0);
    expect(burst.count).toBeGreaterThanOrEqual(1);
    expect(burst.speed).toBe(0);
    expect(burst.spread).toBe(360);
    expect(burst.life).toBe(6);

    const glow = config.timeline.find((entry) => entry.type === "randomGlow");
    expect(glow.time).toBe(0);
    expect(glow.radius).toBe(1.5);
    expect(glow.intensity).toBe(0.05);
    expect(glow.duration).toBe(0.2);

    expect(config.timeline.some((entry) => entry.type === "unknown")).toBe(false);
  });

  it("resolves base color changes with transitions", () => {
    const config = normalizeBackgroundConfig({
      ...baseConfig,
      timeline: [
        { id: "shift", type: "baseColorChange", time: 2, color: "#ff0000", transition: 2 }
      ]
    });

    const base = resolveBackgroundBaseColor(config, 1);
    expect(base).toBe("#000000");
    const mid = resolveBackgroundBaseColor(config, 2.5);
    expect(mid).toMatch(/rgba\(/);
    const after = resolveBackgroundBaseColor(config, 5);
    expect(after).toBe("#ff0000");
  });

  it("triggers particle and glow events during updates and wraps loops", () => {
    const renderer = createBackgroundStudioRenderer({
      config: {
        ...baseConfig,
        timeline: [
          { id: "burst", type: "particleBurst", time: 2, x: 0.5, y: 0.5, count: 5, color: "#fff", speed: 50, spread: 180, life: 1 },
          { id: "glow", type: "randomGlow", time: 3, x: 0.5, y: 0.5, color: "#fff", radius: 0.4, intensity: 0.5, duration: 1 },
          { id: "wrap", type: "particleBurst", time: 0.5, x: 0.2, y: 0.2, count: 3, color: "#fff", speed: 50, spread: 180, life: 1 }
        ]
      },
      rand: () => 0.5
    });

    renderer.update(1.9, { width: 100, height: 100 });
    renderer.update(0.2, { width: 100, height: 100 });
    const stateAfterBurst = renderer.getState();
    expect(stateAfterBurst.particles.length).toBeGreaterThan(0);

    renderer.update(1, { width: 100, height: 100 });
    const stateAfterGlow = renderer.getState();
    expect(stateAfterGlow.glows.length).toBeGreaterThan(0);

    renderer.seek(9.8, { width: 100, height: 100 });
    renderer.update(0.8, { width: 100, height: 100 });
    const stateAfterWrap = renderer.getState();
    expect(stateAfterWrap.particles.length).toBeGreaterThan(0);
  });
});
