import { describe, expect, it } from "vitest";

import { normalizeTrailStyleOverrides } from "../trailStyleOverrides.cjs";

describe("trail style overrides", () => {
  it("accepts empty payloads", () => {
    const result = normalizeTrailStyleOverrides();
    expect(result.ok).toBe(true);
    expect(result.overrides).toEqual({});
  });

  it("normalizes basic overrides with extras", () => {
    const result = normalizeTrailStyleOverrides({
      overrides: {
        classic: {
          rate: "12",
          life: [0.2, 0.4],
          sparkle: { rate: 4 },
          extras: [
            { mode: "sparkle", rate: 3, color: ["#fff", "#000"] }
          ]
        }
      }
    });

    expect(result.ok).toBe(true);
    expect(result.overrides.classic.rate).toBe(12);
    expect(result.overrides.classic.life).toEqual([0.2, 0.4]);
    expect(result.overrides.classic.sparkle.rate).toBe(4);
    expect(result.overrides.classic.extras[0].mode).toBe("sparkle");
    expect(result.overrides.classic.extras[0].color).toEqual(["#fff", "#000"]);
  });

  it("normalizes unlock metadata for trails", () => {
    const result = normalizeTrailStyleOverrides({
      overrides: {
        rainbow: {
          name: "Rainbow",
          unlock: { type: "achievement", id: "ach_rainbow", minScore: 250 }
        }
      }
    });

    expect(result.ok).toBe(true);
    expect(result.overrides.rainbow.name).toBe("Rainbow");
    expect(result.overrides.rainbow.unlock).toEqual(expect.objectContaining({
      type: "achievement",
      id: "ach_rainbow",
      minScore: 250
    }));
  });

  it("rejects invalid unlock payloads", () => {
    const result = normalizeTrailStyleOverrides({
      overrides: {
        bad: {
          name: "",
          unlock: "free"
        }
      }
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects invalid shapes, ranges, colors, extras, and names with detailed errors", () => {
    const result = normalizeTrailStyleOverrides({
      overrides: {
        badPaletteEmpty: {
          color: [" ", ""]
        },
        badPaletteEntry: {
          color: ["#fff", "  "]
        },
        badShape: {
          particleShape: "blob"
        },
        badRangeLength: {
          life: [1]
        },
        badRangeNumber: {
          size: ["nope", 2]
        },
        badExtrasType: {
          extras: "not-an-array"
        },
        badExtrasMode: {
          extras: [{ mode: "unknown", rate: 3 }]
        },
        badName: {
          name: "   "
        }
      }
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      { path: "overrides.badPaletteEmpty.color", message: "color_palette_empty" },
      { path: "overrides.badPaletteEntry.color", message: "color_palette_invalid_entries" },
      { path: "overrides.badShape.particleShape", message: "shape_invalid" },
      { path: "overrides.badRangeLength.life", message: "range_invalid" },
      { path: "overrides.badRangeNumber.size", message: "range_invalid" },
      { path: "overrides.badExtrasType.extras", message: "extras_invalid" },
      { path: "overrides.badExtrasMode.extras[0].mode", message: "mode_invalid" },
      { path: "overrides.badName.name", message: "name_invalid" }
    ]));
  });
});
