// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { collectIconOverrides, createIconCard, readIconDefinition } from "../modules/editor.js";

describe("icon editor helpers", () => {
  it("serializes icon overrides from form fields", () => {
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
    const card = createIconCard({ icon, defaults: icon, allowRemove: true });
    const root = document.createElement("div");
    root.appendChild(card);

    const overrides = collectIconOverrides(root);
    expect(overrides.spark.name).toBe("Spark");
    expect(overrides.spark.imageSrc).toBe("/spark.png");
    expect(overrides.spark.unlock.type).toBe("score");
    expect(overrides.spark.style.pattern.type).toBe("stripes");
    expect(overrides.spark.style.animation.type).toBe("lava");
  });

  it("reads color lists into arrays", () => {
    const icon = {
      id: "stripe",
      name: "Stripe",
      unlock: { type: "free" },
      style: { pattern: { type: "stripes", colors: ["#111", "#222"] } }
    };
    const card = createIconCard({ icon, defaults: icon, allowRemove: false });
    card.querySelector("[data-field='pattern.colors']").value = "#111, #222, #333";
    const read = readIconDefinition(card);
    expect(read.style.pattern.colors).toEqual(["#111", "#222", "#333"]);
  });
});
