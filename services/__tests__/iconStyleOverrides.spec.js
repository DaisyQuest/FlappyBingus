import { describe, expect, it } from "vitest";

import { applyIconStyleOverrides, normalizeIconStyleOverrides } from "../iconStyleOverrides.cjs";

describe("icon style overrides", () => {
  it("accepts empty payloads", () => {
    const result = normalizeIconStyleOverrides();
    expect(result.ok).toBe(true);
    expect(result.overrides).toEqual({});
  });

  it("normalizes pattern and animation overrides", () => {
    const result = normalizeIconStyleOverrides({
      overrides: {
        hero: {
          name: "Hero",
          imageSrc: "/hero.png",
          unlock: { type: "score", minScore: "25" },
          style: {
            fill: "#111",
            pattern: { type: "zigzag", amplitude: "0.2", waves: "6" },
            animation: { type: "lava", speed: "0.2", palette: { base: "#000" } }
          }
        }
      }
    });

    expect(result.ok).toBe(true);
    expect(result.overrides.hero.style.pattern.amplitude).toBe(0.2);
    expect(result.overrides.hero.style.pattern.waves).toBe(6);
    expect(result.overrides.hero.style.animation.speed).toBe(0.2);
    expect(result.overrides.hero.unlock.minScore).toBe(25);
  });

  it("rejects invalid pattern types", () => {
    const result = normalizeIconStyleOverrides({
      overrides: {
        bad: {
          style: { pattern: { type: "unknown" } }
        }
      }
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("applies overrides to defaults and adds new icons", () => {
    const icons = [
      {
        id: "base",
        name: "Base",
        unlock: { type: "free" },
        style: { fill: "#000", pattern: { type: "stripes", colors: ["#fff", "#000"] } }
      }
    ];
    const overrides = {
      base: {
        style: { fill: "#222", pattern: null },
        unlock: null
      },
      new_one: {
        name: "New One",
        imageSrc: "/new.png",
        style: { fill: "#333" }
      }
    };
    const merged = applyIconStyleOverrides({ icons, overrides });
    const base = merged.find((icon) => icon.id === "base");
    const added = merged.find((icon) => icon.id === "new_one");

    expect(base.style.fill).toBe("#222");
    expect(base.style.pattern).toBeUndefined();
    expect(base.unlock.type).toBe("free");
    expect(added.name).toBe("New One");
    expect(added.imageSrc).toBe("/new.png");
  });
});
