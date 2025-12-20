import { describe, expect, it } from "vitest";
import { computePipeColor, pipePaletteDefaults } from "../pipeColors.js";
import { hexToRgb, lerpC } from "../util.js";
import { DEFAULT_CONFIG } from "../config.js";

function toRgbTuple(c) {
  return [Math.round(c.r), Math.round(c.g), Math.round(c.b)];
}

describe("computePipeColor", () => {
  it("clamps difficulty to [0,1] and returns gradient stops", () => {
    const palette = pipePaletteDefaults();
    const g = hexToRgb(palette.green);
    const b = hexToRgb(palette.blue);
    const w = hexToRgb(palette.wisteria);
    const r = hexToRgb(palette.red);

    expect(toRgbTuple(computePipeColor(-0.5, palette))).toEqual(toRgbTuple(g));
    expect(toRgbTuple(computePipeColor(0, palette))).toEqual(toRgbTuple(g));
    expect(toRgbTuple(computePipeColor(1, palette))).toEqual(toRgbTuple(r));
    expect(toRgbTuple(computePipeColor(5, palette))).toEqual(toRgbTuple(r));
  });

  it("interpolates green -> blue -> wisteria -> red across thirds", () => {
    const palette = {
      green: "#b7efb2",
      blue: "#b3ebf2",
      wisteria: "#c9a0dc",
      red: "#ff746c"
    };

    const g = hexToRgb(palette.green);
    const b = hexToRgb(palette.blue);
    const w = hexToRgb(palette.wisteria);
    const r = hexToRgb(palette.red);

    // Halfway through each segment
    const midGreenBlue = computePipeColor(1 / 6, palette);
    const midBlueWisteria = computePipeColor(0.5, palette);
    const midWisteriaRed = computePipeColor(5 / 6, palette);

    expect(toRgbTuple(midGreenBlue)).toEqual(toRgbTuple(lerpC(g, b, 0.5)));
    expect(toRgbTuple(midBlueWisteria)).toEqual(toRgbTuple(lerpC(b, w, 0.5)));
    expect(toRgbTuple(midWisteriaRed)).toEqual(toRgbTuple(lerpC(w, r, 0.5)));
  });

  it("falls back to purple/yellow when wisteria is missing", () => {
    const palette = {
      green: "#010203",
      blue: "#020304",
      purple: "#040506",
      red: "#070809"
    };
    const atHalf = computePipeColor(0.5, palette);
    expect(toRgbTuple(atHalf)).toEqual(toRgbTuple(lerpC(hexToRgb("#020304"), hexToRgb("#040506"), 0.5)));
  });
});

describe("DEFAULT_CONFIG pipe colors", () => {
  it("defines the themed palette including wisteria", () => {
    expect(DEFAULT_CONFIG.pipes.colors).toMatchObject({
      green: "#b7efb2",
      blue: "#b3ebf2",
      wisteria: "#c9a0dc",
      red: "#ff746c"
    });
  });
});

