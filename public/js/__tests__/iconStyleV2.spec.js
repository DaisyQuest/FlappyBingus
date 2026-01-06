import { describe, expect, it } from "vitest";
import {
  createDefaultIconStyleV2,
  mergeIconStylePatch,
  migrateLegacyStyleToV2,
  resolveIconStyleV2,
  validateIconStyleV2
} from "../iconStyleV2.js";

describe("iconStyleV2 helpers", () => {
  it("migrates legacy styles into v2 palettes and preserves legacy animations", () => {
    const legacy = {
      fill: "#111111",
      core: "#222222",
      rim: "#333333",
      glow: "#444444",
      pattern: { type: "stripes", colors: ["#111", "#222"] },
      animation: { type: "cape_flow", speed: 0.25 }
    };
    const migrated = migrateLegacyStyleToV2(legacy);
    expect(migrated.palette.fill).toBe("#111111");
    expect(migrated.palette.core).toBe("#222222");
    expect(migrated.palette.rim).toBe("#333333");
    expect(migrated.pattern.type).toBe("stripes");
    expect(migrated.legacyAnimation).toEqual(expect.objectContaining({ type: "cape_flow" }));
  });

  it("validates circle invariant and color formats", () => {
    const style = createDefaultIconStyleV2();
    style.circle.radiusRatio = 0.45;
    style.palette.fill = "not-a-color";
    const result = validateIconStyleV2(style);
    expect(result.ok).toBe(false);
    expect(result.errors.map((err) => err.path)).toEqual(expect.arrayContaining([
      "circle.radiusRatio",
      "palette.fill"
    ]));
  });

  it("merges preset patches without clobbering unrelated fields", () => {
    const base = createDefaultIconStyleV2();
    const patch = { palette: { fill: "#ffffff" }, pattern: { type: "stars" } };
    const merged = mergeIconStylePatch(base, patch);
    expect(merged.palette.fill).toBe("#ffffff");
    expect(merged.palette.rim).toBe(base.palette.rim);
    expect(merged.pattern.type).toBe("stars");
  });

  it("resolves legacy icons to v2 defaults", () => {
    const icon = { id: "legacy", style: { fill: "#000", core: "#111" } };
    const resolved = resolveIconStyleV2(icon);
    expect(resolved.palette.fill).toBe("#000");
    expect(resolved.palette.core).toBe("#111");
    expect(resolved.circle.radiusRatio).toBe(0.5);
  });
});
