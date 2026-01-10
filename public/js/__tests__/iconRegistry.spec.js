import { describe, expect, it } from "vitest";
import { ICON_CLASSES, PlayerIconDefinition, buildBaseIcons } from "../iconRegistry.js";

describe("client icon registry", () => {
  it("builds icon definitions from icon classes", () => {
    const icons = buildBaseIcons();
    expect(icons).toHaveLength(ICON_CLASSES.length);
    expect(icons.map((icon) => icon.id)).toContain("hi_vis_orange");
  });

  it("omits empty image sources on base definitions", () => {
    const icon = new PlayerIconDefinition({
      id: "sample",
      name: "Sample",
      unlock: { type: "free" },
      style: { fill: "#000" }
    });
    expect(icon.toDefinition()).not.toHaveProperty("imageSrc");
  });

  it("includes sprite-backed icons with image sources", () => {
    const icons = buildBaseIcons();
    expect(icons.find((icon) => icon.id === "file_icon")?.imageSrc).toBe("/file.png");
  });

  it("adds orb and perfect flash animations to High-Vis Orange", () => {
    const icons = buildBaseIcons();
    const orange = icons.find((icon) => icon.id === "hi_vis_orange");
    expect(orange?.style?.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "centerFlash", params: expect.objectContaining({ color: "#38bdf8" }) }),
      expect.objectContaining({ type: "centerFlash", params: expect.objectContaining({ color: "#22c55e" }) })
    ]));
    expect(orange?.style?.animations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "centerFlash", target: "effects[0].params.progress", triggeredBy: "anim:orbPickup" }),
      expect.objectContaining({ type: "centerFlash", target: "effects[1].params.progress", triggeredBy: "anim:perfectGap" })
    ]));
  });
});
