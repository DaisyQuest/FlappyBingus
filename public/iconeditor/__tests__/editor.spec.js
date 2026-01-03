import { beforeEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

import { collectIconDefinitions, createIconCard } from "../modules/editor.js";

const PARTICLES = ["Hearts", "Sparkle", "Cartoon Smoke"];

describe("icon editor helpers", () => {
  let document;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body></body>");
    document = dom.window.document;
    global.document = document;
  });

  it("collects icon definitions with animation and particle mix", () => {
    const grid = document.createElement("div");
    const card = createIconCard(
      {
        id: "test_icon",
        name: "Test Icon",
        unlock: { type: "purchase", cost: 200, currencyId: "coin", label: "Shop" },
        imageSrc: "data:image/png;base64,AAA",
        style: {
          fill: "#111111",
          core: "#222222",
          rim: "#333333",
          glow: "#444444",
          animation: { type: "cape_flow", speed: 0.4, bands: 6, embers: 0.8 },
          particles: { mix: [{ id: "Hearts", weight: 40 }, { id: "Sparkle", weight: 60 }] }
        }
      },
      { particleEffects: PARTICLES }
    );
    grid.appendChild(card);

    const defs = collectIconDefinitions(grid);
    expect(defs).toHaveLength(1);
    expect(defs[0].id).toBe("test_icon");
    expect(defs[0].unlock).toEqual({ type: "purchase", cost: 200, currencyId: "coin", label: "Shop" });
    expect(defs[0].style.animation.type).toBe("cape_flow");
    expect(defs[0].style.particles.mix).toEqual([
      { id: "Hearts", weight: 40 },
      { id: "Sparkle", weight: 60 }
    ]);
  });

  it("skips empty icon IDs", () => {
    const grid = document.createElement("div");
    const card = createIconCard({ id: "", name: "" }, { particleEffects: PARTICLES });
    grid.appendChild(card);
    expect(collectIconDefinitions(grid)).toEqual([]);
  });

  it("normalizes custom particle entries", () => {
    const grid = document.createElement("div");
    const card = createIconCard({ id: "custom", name: "Custom" }, { particleEffects: PARTICLES });
    grid.appendChild(card);

    const customName = card.querySelector("[data-custom-particle='name']");
    const customWeight = card.querySelector("[data-custom-particle='weight']");
    customName.value = "Glitter";
    customWeight.value = "25";

    const defs = collectIconDefinitions(grid);
    expect(defs[0].style.particles.mix).toEqual([{ id: "Glitter", weight: 100 }]);
  });
});
