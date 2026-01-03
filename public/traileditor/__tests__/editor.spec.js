// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { collectTrailOverrides, createTrailCard } from "../modules/editor.js";

describe("trail editor helpers", () => {
  it("collects unlock metadata alongside style overrides", () => {
    const trail = {
      id: "rainbow",
      name: "Rainbow",
      unlock: { type: "achievement", id: "ach_rainbow", minScore: 150 }
    };
    const card = createTrailCard({
      id: trail.id,
      defaults: {},
      override: {},
      trail,
      allowRemove: true
    });
    const root = document.createElement("div");
    root.appendChild(card);

    const overrides = collectTrailOverrides(root);
    expect(overrides.rainbow.name).toBe("Rainbow");
    expect(overrides.rainbow.unlock).toEqual(expect.objectContaining({
      type: "achievement",
      id: "ach_rainbow",
      minScore: 150
    }));
  });
});
