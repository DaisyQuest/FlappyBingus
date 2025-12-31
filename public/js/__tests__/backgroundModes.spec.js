import { describe, expect, it } from "vitest";
import {
  createProceduralBackground,
  updateProceduralBackground,
  createMonochromeBackground,
  createVideoBackground
} from "../backgroundModes.js";

describe("backgroundModes", () => {
  it("creates procedural background with seeded dots", () => {
    const bg = createProceduralBackground({ width: 100, height: 50, rand: () => 0.5 });
    expect(bg.type).toBe("procedural");
    expect(bg.dots.length).toBeGreaterThan(0);
  });

  it("updates procedural dots and wraps when out of bounds", () => {
    const bg = createProceduralBackground({ width: 100, height: 50, rand: () => 0.5 });
    bg.dots = [{ x: 0, y: 60, s: 5, r: 1 }];
    updateProceduralBackground(bg, { width: 100, height: 50, dt: 1, rand: () => 0.25 });
    expect(bg.dots[0].y).toBe(-10);
    expect(bg.dots[0].x).toBe(25);
  });

  it("throws when updating without procedural state", () => {
    expect(() => updateProceduralBackground(null, { width: 10, height: 10, dt: 1 })).toThrow(
      "Procedural background state required"
    );
  });

  it("creates monochrome and video backgrounds", () => {
    const mono = createMonochromeBackground({ color: "#101010" });
    expect(mono.type).toBe("monochrome");
    expect(mono.color).toBe("#101010");

    const video = createVideoBackground({ src: "/video/bg.mp4" });
    expect(video.type).toBe("video");
    expect(video.src).toBe("/video/bg.mp4");
  });

  it("requires a video source", () => {
    expect(() => createVideoBackground({})).toThrow("Video source is required");
  });
});
