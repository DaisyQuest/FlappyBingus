// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import {
  collectIconDefinitions,
  createIconCard,
  readIconDefinition,
  validateIconCard,
  wirePresetPanel
} from "../modules/editor.js";

import { ICON_PRESETS } from "../modules/presets.js";

describe("icon editor helpers", () => {
  it("serializes icon definitions from form fields", () => {
    const icon = {
      id: "spark",
      name: "Spark",
      unlock: { type: "score", minScore: 10, label: "Score 10" },
      imageSrc: "/spark.png",
      schemaVersion: 2,
      style: {
        palette: { fill: "#fff", core: "#eee", rim: "#111", glow: "#ccc" },
        pattern: { type: "stripes", colors: ["#111", "#222"] },
        effects: [{ type: "outline", enabled: true, params: { width: 6 } }],
        animations: [{ id: "spin", type: "slowSpin", target: "pattern.rotationDeg", timing: { mode: "loop", durationMs: 1000 } }]
      }
    };
    const card = createIconCard({ icon, allowRemove: true });
    const root = document.createElement("div");
    root.appendChild(card);

    const icons = collectIconDefinitions(root);
    const [first] = icons;
    expect(first.id).toBe("spark");
    expect(first.name).toBe("Spark");
    expect(first.imageSrc).toBe("/spark.png");
    expect(first.unlock.type).toBe("score");
    expect(first.style.palette.fill).toBe("#fff");
    expect(first.style.pattern.type).toBe("stripes");
    expect(first.style.effects[0].type).toBe("outline");
    expect(first.style.animations[0].type).toBe("slowSpin");
  });

  it("reads pattern color arrays from JSON", () => {
    const icon = {
      id: "stripe",
      name: "Stripe",
      unlock: { type: "free" },
      style: { pattern: { type: "stripes", colors: ["#111", "#222"] } }
    };
    const card = createIconCard({ icon, allowRemove: false });
    const colorsInput = card.querySelector("[data-field='style.pattern.colors']");
    colorsInput.value = "[\"#111\", \"#222\", \"#333\"]";
    const read = readIconDefinition(card);
    expect(read.style.pattern.colors).toEqual(["#111", "#222", "#333"]);
  });

  it("applies swatch selections to palette fields", () => {
    const icon = {
      id: "swatchy",
      name: "Swatchy",
      unlock: { type: "free" },
      style: { palette: { fill: "" } }
    };
    const card = createIconCard({ icon, allowRemove: true });
    const fillInput = card.querySelector("[data-field='style.palette.fill']");
    const fillSwatch = fillInput.closest(".field-row").querySelector(".color-swatch");
    fillSwatch.click();
    expect(fillInput.value).toBe(fillSwatch.dataset.color);
  });

  it("applies preset patches through the preset panel", () => {
    const icon = { id: "preset", name: "Preset", unlock: { type: "free" }, style: {} };
    const card = createIconCard({ icon, allowRemove: false });
    wirePresetPanel(card);
    const targetPreset = ICON_PRESETS.find((preset) => preset.id === "classic-amber");
    const button = card.querySelector(`[data-preset-id='${targetPreset.id}']`);
    button.click();
    const fillInput = card.querySelector("[data-field='style.palette.fill']");
    expect(fillInput.value).toBe(targetPreset.stylePatch.palette.fill);
  });

  it("reports validation errors for invalid styles", () => {
    const icon = { id: "invalid", name: "Invalid", unlock: { type: "free" }, style: { palette: { fill: "bad" } } };
    const card = createIconCard({ icon, allowRemove: false });
    const fillInput = card.querySelector("[data-field='style.palette.fill']");
    fillInput.value = "bad";
    const result = validateIconCard(card);
    expect(result.ok).toBe(false);
    expect(result.errors.map((err) => err.path)).toContain("palette.fill");
  });
});
