import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { normalizeTrailSelection, rebuildTrailOptions } from "../trailSelectUtils.js";

describe("trailSelectUtils", () => {
  it("prefers the locally tracked trail when it is unlocked", () => {
    const unlocked = new Set(["classic", "rainbow"]);
    const result = normalizeTrailSelection({
      currentId: "rainbow",
      userSelectedId: "classic",
      selectValue: "classic",
      unlockedIds: unlocked,
      fallbackId: "classic"
    });

    expect(result).toBe("rainbow");
  });

  it("falls back to the default when the desired trail is locked", () => {
    const unlocked = new Set(["classic"]);
    const result = normalizeTrailSelection({
      currentId: "nebula",
      userSelectedId: "nebula",
      selectValue: "nebula",
      unlockedIds: unlocked,
      fallbackId: "classic"
    });

    expect(result).toBe("classic");
  });

  it("rebuilds select options and preserves the safest unlocked value", () => {
    const dom = new JSDOM("<select></select>");
    const select = dom.window.document.querySelector("select");
    const trails = [
      { id: "classic", name: "Classic", minScore: 0 },
      { id: "rainbow", name: "Rainbow", minScore: 100 }
    ];

    rebuildTrailOptions(select, trails, new Set(["classic"]), "rainbow");

    expect(select?.options.length).toBe(2);
    expect(select?.options[1]?.disabled).toBe(true);
    expect(select?.value).toBe("classic");
  });
});
