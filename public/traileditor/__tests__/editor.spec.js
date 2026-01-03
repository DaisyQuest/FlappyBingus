import { beforeEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

import {
  collectTrailDefinitions,
  createTrailCard,
  parseStyleJson,
  resolveTrailStyleId
} from "../modules/editor.js";

const PARTICLES = ["Hearts", "Sparkle", "Cartoon Smoke"];
const STYLE_IDS = ["classic", "ember"];
const STYLE_MAP = {
  classic: { rate: 20, color: "blue" },
  ember: { rate: 40, color: "orange" }
};

describe("trail editor helpers", () => {
  let document;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body></body>");
    document = dom.window.document;
    global.document = document;
  });

  it("resolves style IDs using explicit and fallback options", () => {
    expect(resolveTrailStyleId({ styleId: "ember" }, STYLE_IDS)).toBe("ember");
    expect(resolveTrailStyleId({ id: "classic" }, STYLE_IDS)).toBe("classic");
    expect(resolveTrailStyleId({}, STYLE_IDS)).toBe("classic");
  });

  it("parses style JSON with fallback", () => {
    expect(parseStyleJson("{\"rate\":10}", STYLE_MAP.classic)).toEqual({ rate: 10 });
    expect(parseStyleJson("invalid", STYLE_MAP.classic)).toEqual(STYLE_MAP.classic);
  });

  it("strips placeholder functions from style JSON", () => {
    const parsed = parseStyleJson("{\"color\":\"[Function]\",\"rate\":18}", STYLE_MAP.classic);
    expect(parsed).toEqual({ rate: 18 });
  });

  it("collects trail definitions with particles and unlock overrides", () => {
    const grid = document.createElement("div");
    const card = createTrailCard(
      {
        id: "custom",
        name: "Custom",
        unlock: { type: "achievement", id: "ach" },
        particles: { mix: [{ id: "Hearts", weight: 50 }, { id: "Sparkle", weight: 50 }] }
      },
      { particleEffects: PARTICLES, styleIds: STYLE_IDS, styleMap: STYLE_MAP }
    );
    grid.appendChild(card);

    const styleJson = card.querySelector("[data-trail-field='styleJson']");
    styleJson.value = JSON.stringify({ rate: 80, color: "purple" });

    const { trails, styles } = collectTrailDefinitions(grid, { styleLookup: STYLE_MAP });
    expect(trails).toHaveLength(1);
    expect(trails[0].style.color).toBe("purple");
    expect(trails[0].unlock).toEqual({ type: "achievement", id: "ach" });
    expect(trails[0].particles.mix).toEqual([
      { id: "Hearts", weight: 50 },
      { id: "Sparkle", weight: 50 }
    ]);
    expect(styles).toHaveProperty(trails[0].styleId);
  });

  it("skips empty trail IDs", () => {
    const grid = document.createElement("div");
    const card = createTrailCard({ id: "", name: "" }, { particleEffects: PARTICLES, styleIds: STYLE_IDS, styleMap: STYLE_MAP });
    grid.appendChild(card);
    expect(collectTrailDefinitions(grid, { styleLookup: STYLE_MAP }).trails).toEqual([]);
  });
});
