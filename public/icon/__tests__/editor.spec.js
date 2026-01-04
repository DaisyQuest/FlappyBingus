// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { collectIconDefinitions, createIconCard, readIconDefinition } from "../modules/editor.js";

describe("icon editor helpers", () => {
  it("serializes icon definitions from form fields", () => {
    const icon = {
      id: "spark",
      name: "Spark",
      unlock: { type: "score", minScore: 10, label: "Score 10" },
      imageSrc: "/spark.png",
      style: {
        fill: "#fff",
        pattern: { type: "stripes", colors: ["#111", "#222"] },
        animation: { type: "lava", speed: 0.2, palette: { base: "#000" } }
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
    expect(first.style.pattern.type).toBe("stripes");
    expect(first.style.animation.type).toBe("lava");
  });

  it("reads color lists into arrays", () => {
    const icon = {
      id: "stripe",
      name: "Stripe",
      unlock: { type: "free" },
      style: { pattern: { type: "stripes", colors: ["#111", "#222"] } }
    };
    const card = createIconCard({ icon, allowRemove: false });
    card.querySelector("[data-field='pattern.colors']").value = "#111, #222, #333";
    const read = readIconDefinition(card);
    expect(read.style.pattern.colors).toEqual(["#111", "#222", "#333"]);
  });

  it("applies swatch selections to color fields", () => {
    const icon = {
      id: "swatchy",
      name: "Swatchy",
      unlock: { type: "free" },
      style: { fill: "", pattern: { type: "stripes", colors: ["#111"] } }
    };
    const card = createIconCard({ icon, allowRemove: true });
    const fillInput = card.querySelector("[data-field='fill']");
    const fillSwatch = fillInput.closest(".field-row").querySelector(".color-swatch");
    fillSwatch.click();
    expect(fillInput.value).toBe(fillSwatch.dataset.color);

    const colorsInput = card.querySelector("[data-field='pattern.colors']");
    colorsInput.value = "#111";
    const listSwatch = colorsInput.closest(".field-row").querySelector(".color-swatch[data-color='#ffffff']");
    listSwatch.click();
    expect(colorsInput.value).toBe("#111, #ffffff");
  });
});
