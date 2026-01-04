import { describe, expect, it } from "vitest";
import { ICON_CLASSES, PlayerIconDefinition, buildBaseIcons } from "../iconRegistry.cjs";

describe("server icon registry", () => {
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
});
