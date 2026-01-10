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

  it("syncs hex inputs with the color picker", () => {
    const icon = {
      id: "swatchy",
      name: "Swatchy",
      unlock: { type: "free" },
      style: { palette: { fill: "" } }
    };
    const card = createIconCard({ icon, allowRemove: true });
    const fillInput = card.querySelector("[data-field='style.palette.fill']");
    const colorPicker = fillInput.closest(".field-row").querySelector("input[type='color']");
    colorPicker.value = "#112233";
    colorPicker.dispatchEvent(new Event("input", { bubbles: true }));
    expect(fillInput.value).toBe("#112233");

    fillInput.value = "#abc";
    fillInput.dispatchEvent(new Event("input", { bubbles: true }));
    expect(colorPicker.value).toBe("#aabbcc");
  });

  it("keeps animation types aligned with pattern targets", () => {
    const icon = {
      id: "anim",
      name: "Anim",
      unlock: { type: "free" },
      style: {
        version: 2,
        animations: [{ id: "scroll", type: "pulseUniform", target: "pattern.centerOffset" }]
      }
    };
    const card = createIconCard({ icon, allowRemove: false });
    const typeSelect = card.querySelector("[data-field='style.animations[0].type']");
    const guidance = card.querySelector("[data-animation-guidance]");
    const pulseOption = Array.from(typeSelect.options).find((option) => option.value === "pulseUniform");

    expect(typeSelect.value).toBe("patternScroll");
    expect(pulseOption.disabled).toBe(true);
    expect(guidance.textContent).toMatch(/Pattern Scroll/);
  });

  it("locks color targets to color shift animations", () => {
    const icon = {
      id: "color-anim",
      name: "Color Anim",
      unlock: { type: "free" },
      style: {
        version: 2,
        animations: [{ id: "shift", type: "slowSpin", target: "palette.fill" }]
      }
    };
    const card = createIconCard({ icon, allowRemove: false });
    const typeSelect = card.querySelector("[data-field='style.animations[0].type']");
    const guidance = card.querySelector("[data-animation-guidance]");
    const slowSpinOption = Array.from(typeSelect.options).find((option) => option.value === "slowSpin");

    expect(typeSelect.value).toBe("colorShift");
    expect(slowSpinOption.disabled).toBe(true);
    expect(guidance.textContent).toMatch(/Color Shift/);
  });

  it("filters target suggestions for strict animation types", () => {
    const icon = {
      id: "scroll-anim",
      name: "Scroll Anim",
      unlock: { type: "free" },
      style: {
        version: 2,
        animations: [{ id: "scroll", type: "patternScroll", target: "" }]
      }
    };
    const card = createIconCard({ icon, allowRemove: false });
    const targetInput = card.querySelector("[data-field='style.animations[0].target']");
    const targetList = card.querySelector(`#${targetInput.getAttribute("list")}`);
    const values = Array.from(targetList.options).map((option) => option.value);

    expect(values).toEqual(["pattern.centerOffset"]);
  });

  it("filters target suggestions for color shift animations", () => {
    const icon = {
      id: "color-targets",
      name: "Color Targets",
      unlock: { type: "free" },
      style: {
        version: 2,
        animations: [{ id: "shift", type: "colorShift", target: "" }]
      }
    };
    const card = createIconCard({ icon, allowRemove: false });
    const targetInput = card.querySelector("[data-field='style.animations[0].target']");
    const targetList = card.querySelector(`#${targetInput.getAttribute("list")}`);
    const values = Array.from(targetList.options).map((option) => option.value);

    expect(values).toEqual([
      "palette.fill",
      "palette.core",
      "palette.rim",
      "palette.glow",
      "palette.accent"
    ]);
  });

  it("updates target suggestions when the animation type changes", () => {
    const icon = {
      id: "dynamic-targets",
      name: "Dynamic Targets",
      unlock: { type: "free" },
      style: {
        version: 2,
        animations: [{ id: "pulse", type: "pulseUniform", target: "" }]
      }
    };
    const card = createIconCard({ icon, allowRemove: false });
    const typeSelect = card.querySelector("[data-field='style.animations[0].type']");
    const targetInput = card.querySelector("[data-field='style.animations[0].target']");
    const targetList = card.querySelector(`#${targetInput.getAttribute("list")}`);

    const initialValues = Array.from(targetList.options).map((option) => option.value);
    expect(initialValues).toEqual([
      "palette.fill",
      "palette.core",
      "palette.rim",
      "palette.glow",
      "palette.accent",
      "pattern.rotationDeg",
      "pattern.centerOffset",
      "pattern.alpha",
      "shadow.blur",
      "stroke.width",
      "texture.offset",
      "effects[0].params.progress",
      "preview.scale"
    ]);

    typeSelect.value = "patternRotate";
    typeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    const updatedValues = Array.from(targetList.options).map((option) => option.value);
    expect(updatedValues).toEqual(["pattern.rotationDeg"]);
  });

  it("shows generic guidance for non-specific animation targets", () => {
    const icon = {
      id: "generic-anim",
      name: "Generic Anim",
      unlock: { type: "free" },
      style: {
        version: 2,
        animations: [{ id: "blur", type: "pulseUniform", target: "shadow.blur" }]
      }
    };
    const card = createIconCard({ icon, allowRemove: false });
    const guidance = card.querySelector("[data-animation-guidance]");
    expect(guidance.textContent).toMatch(/numeric animations/i);
  });

  it("prompts for a target when none is set", () => {
    const icon = {
      id: "empty-target",
      name: "Empty Target",
      unlock: { type: "free" },
      style: {
        version: 2,
        animations: [{ id: "no-target", type: "pulseUniform", target: "" }]
      }
    };
    const card = createIconCard({ icon, allowRemove: false });
    const guidance = card.querySelector("[data-animation-guidance]");
    expect(guidance.textContent).toMatch(/choose a target/i);
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

  it("renders animation trigger buttons for deterministic anim events", () => {
    const icon = { id: "anim-triggers", name: "Anim Triggers", unlock: { type: "free" }, style: {} };
    const card = createIconCard({ icon, allowRemove: false });
    const buttons = Array.from(card.querySelectorAll(".test-events [data-event-type]"));
    const types = buttons.map((button) => button.dataset.eventType);
    const labels = buttons.map((button) => button.textContent);

    expect(types).toEqual([
      "tap",
      "score",
      "hit",
      "anim:orbPickup",
      "anim:perfectGap",
      "anim:dash",
      "anim:phase",
      "anim:teleport",
      "anim:explode"
    ]);
    expect(labels).toEqual([
      "Test Tap",
      "Test Score",
      "Test Hit",
      "Orb Pickup",
      "Perfect Gap",
      "Dash",
      "Phase",
      "Teleport",
      "Explode"
    ]);
  });
});
