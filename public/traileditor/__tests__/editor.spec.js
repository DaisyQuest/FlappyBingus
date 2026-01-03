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

  it("applies swatches to trail color inputs", () => {
    const card = createTrailCard({
      id: "swatch-trail",
      defaults: {},
      override: {},
      trail: { name: "Swatch Trail", unlock: { type: "free" } },
      allowRemove: true
    });
    const baseGroup = card.querySelector("[data-group='base']");
    const modeSelect = baseGroup.querySelector("[data-field='colorMode']");
    const valueInput = baseGroup.querySelector("[data-field='colorValue']");
    const swatch = valueInput.closest(".field-row").querySelector(".color-swatch[data-color='#ffffff']");
    swatch.click();
    expect(modeSelect.value).toBe("fixed");
    expect(valueInput.value).toBe("#ffffff");

    modeSelect.value = "palette";
    valueInput.value = "#111";
    const paletteSwatch = valueInput.closest(".field-row").querySelector(".color-swatch[data-color='#38bdf8']");
    paletteSwatch.click();
    expect(valueInput.value).toBe("#111, #38bdf8");
    expect(modeSelect.value).toBe("palette");
  });
});
