// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { collectIconOverrides, createIconCard, readIconDefinition } from "../modules/editor.js";

describe("icon editor helpers", () => {
  it("serializes icon overrides from form fields", () => {
    const icon = {
      id: "spark",
      name: "Spark",
      imageSrc: "/spark.png",
      style: {
        fill: "#fff",
        pattern: { type: "stripes", colors: ["#111", "#222"] },
        animation: { type: "lava", speed: 0.2, palette: { base: "#000" } }
      }
    };
    const card = createIconCard({ icon, defaults: icon, overrideEnabled: true, allowRemove: true });
    const root = document.createElement("div");
    root.appendChild(card);

    const overrides = collectIconOverrides(root);
    expect(overrides.spark.name).toBe("Spark");
    expect(overrides.spark.imageSrc).toBe("/spark.png");
    expect(overrides.spark.unlock).toBeUndefined();
    expect(overrides.spark.style.pattern.type).toBe("stripes");
    expect(overrides.spark.style.animation.type).toBe("lava");
  });

  it("omits overrides when disabled", () => {
    const icon = { id: "base", name: "Base", unlock: { type: "free" }, style: { fill: "#000" } };
    const card = createIconCard({ icon, defaults: icon, overrideEnabled: false, allowRemove: true });
    const root = document.createElement("div");
    root.appendChild(card);

    const overrides = collectIconOverrides(root);
    expect(overrides).toEqual({});
  });

  it("preserves unlock overrides when fields are not editable", () => {
    const icon = {
      id: "spark",
      name: "Spark",
      imageSrc: "/spark.png"
    };
    const card = createIconCard({ icon, defaults: icon, overrideEnabled: true, allowRemove: true });
    const root = document.createElement("div");
    root.appendChild(card);

    const overrides = collectIconOverrides(root, {
      existingOverrides: { spark: { unlock: { type: "purchase", cost: 10 } } }
    });

    expect(overrides.spark.unlock).toEqual({ type: "purchase", cost: 10 });
  });

  it("reads color lists into arrays", () => {
    const icon = {
      id: "stripe",
      name: "Stripe",
      style: { pattern: { type: "stripes", colors: ["#111", "#222"] } }
    };
    const card = createIconCard({ icon, defaults: icon, overrideEnabled: true, allowRemove: false });
    card.querySelector("[data-field='pattern.colors']").value = "#111, #222, #333";
    const read = readIconDefinition(card);
    expect(read.style.pattern.colors).toEqual(["#111", "#222", "#333"]);
  });
});
