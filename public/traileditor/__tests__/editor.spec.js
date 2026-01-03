// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { collectTrailOverrides, createTrailCard } from "../modules/editor.js";

describe("trail editor helpers", () => {
  it("serializes trail overrides from form fields", () => {
    const defaults = {
      rate: 10,
      life: [1, 2],
      size: [1, 2],
      speed: [1, 2],
      sparkle: { rate: 4 }
    };
    const override = {
      rate: 20,
      life: [0.5, 0.9],
      sparkle: { rate: 2, particleShape: "star" },
      extras: [
        { mode: "sparkle", rate: 1, color: ["#fff", "#000"] }
      ]
    };

    const card = createTrailCard({ id: "classic", defaults, override, allowRemove: true });
    const root = document.createElement("div");
    root.appendChild(card);

    const overrides = collectTrailOverrides(root);
    expect(overrides.classic.rate).toBe(20);
    expect(overrides.classic.life).toEqual([0.5, 0.9]);
    expect(overrides.classic.sparkle.rate).toBe(2);
    expect(overrides.classic.sparkle.particleShape).toBe("star");
    expect(overrides.classic.extras[0].mode).toBe("sparkle");
    expect(overrides.classic.extras[0].color).toEqual(["#fff", "#000"]);
  });

  it("omits empty cards and empty groups", () => {
    const card = createTrailCard({ id: "", defaults: {}, override: {}, allowRemove: true });
    const root = document.createElement("div");
    root.appendChild(card);
    const overrides = collectTrailOverrides(root);
    expect(overrides).toEqual({});
  });
});
