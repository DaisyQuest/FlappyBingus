import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYER_ICON_ID,
  ICON_CLASSES,
  PlayerIconDefinition,
  buildBaseIcons
} from "../iconRegistry.js";

describe("client icon registry", () => {
  it("builds icon definitions from icon classes", () => {
    const icons = buildBaseIcons();
    expect(icons).toHaveLength(ICON_CLASSES.length);
    expect(icons.map((icon) => icon.id)).toContain(DEFAULT_PLAYER_ICON_ID);
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
