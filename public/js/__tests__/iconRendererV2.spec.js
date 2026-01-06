import { describe, expect, it } from "vitest";
import { buildIconRenderState } from "../iconRendererV2.js";
import { resolveIconStyleV2 } from "../iconStyleV2.js";

describe("iconRendererV2", () => {
  it("keeps legacy palettes consistent after migration", () => {
    const legacyIcon = {
      id: "legacy",
      style: {
        fill: "#111111",
        core: "#222222",
        rim: "#333333",
        glow: "#444444",
        pattern: { type: "stripes", colors: ["#111", "#222"] }
      }
    };
    const legacyState = buildIconRenderState(legacyIcon, { timeMs: 0, reducedMotion: true });
    const migrated = { ...legacyIcon, style: resolveIconStyleV2(legacyIcon) };
    const migratedState = buildIconRenderState(migrated, { timeMs: 0, reducedMotion: true });
    expect(migratedState.style.palette).toEqual(legacyState.style.palette);
    expect(migratedState.style.pattern.type).toBe("stripes");
  });
});
