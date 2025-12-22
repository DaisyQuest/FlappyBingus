import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYER_ICON_ID,
  DEFAULT_PLAYER_ICONS,
  describeIconLock,
  getUnlockedPlayerIcons,
  normalizeIconSelection,
  normalizePlayerIcons
} from "../playerIcons.js";

describe("player icon helpers", () => {
  it("normalizes icon catalogs and falls back to defaults", () => {
    const normalized = normalizePlayerIcons([
      { id: "a", name: "A", unlock: { type: "score", minScore: 10 } },
      { id: "", name: "" },
      null
    ]);
    expect(normalized.map((i) => i.id)).toContain("a");
    const fallback = normalizePlayerIcons(null);
    expect(fallback.map((i) => i.id)).toEqual(DEFAULT_PLAYER_ICONS.map((i) => i.id));
  });

  it("computes unlocked icons across multiple unlock types", () => {
    const icons = [
      { id: "free", name: "Free", unlock: { type: "free" } },
      { id: "score", name: "Score", unlock: { type: "score", minScore: 50 } },
      { id: "ach", name: "Ach", unlock: { type: "achievement", id: "a1" } },
      { id: "paid", name: "Paid", unlock: { type: "purchase", cost: 5 } },
      { id: "record", name: "Record", unlock: { type: "record" } }
    ];
    const unlocked = getUnlockedPlayerIcons(icons, {
      bestScore: 55,
      ownedIconIds: ["paid"],
      achievements: { unlocked: { a1: Date.now() } },
      recordHolder: true
    });
    expect(unlocked).toEqual(expect.arrayContaining(["free", "score", "ach", "paid", "record"]));
  });

  it("includes the Perfect Ten reward icon once that achievement is unlocked", () => {
    const unlocked = getUnlockedPlayerIcons(DEFAULT_PLAYER_ICONS, {
      achievements: { unlocked: { perfects_run_10: Date.now() } }
    });
    expect(unlocked).toContain("perfect_ten_liner");
    expect(unlocked).not.toContain("orb_free_zigzag");
  });

  it("defines the Perfect Line Beacon palette as a black core with bright red accents", () => {
    const perfectLine = DEFAULT_PLAYER_ICONS.find((icon) => icon.id === "perfect_ten_liner");
    expect(perfectLine?.style?.fill).toBe("#000000");
    expect(perfectLine?.style?.core).toBe("#000000");
    expect(perfectLine?.style?.rim).toBe("#ff1a1a");
    expect(perfectLine?.style?.pattern).toEqual(
      expect.objectContaining({
        stroke: "#ff1a1a",
        accent: "#ff1a1a",
        glow: "#ff4d4d"
      })
    );
  });

  it("normalizes icon selection to the first unlocked choice", () => {
    const unlocked = new Set(["hi_vis_orange"]);
    const selection = normalizeIconSelection({
      currentId: "locked",
      userSelectedId: "missing",
      unlockedIds: unlocked,
      fallbackId: DEFAULT_PLAYER_ICON_ID
    });
    expect(selection).toBe(DEFAULT_PLAYER_ICON_ID);
  });

  it("describes lock reasons for UI strings", () => {
    const purchase = { id: "p", unlock: { type: "purchase", cost: 12 } };
    const score = { id: "s", unlock: { type: "score", minScore: 100 } };
    expect(describeIconLock(purchase, { unlocked: false })).toContain("12");
    expect(describeIconLock(score, { unlocked: false }).toLowerCase()).toContain("score");
    expect(describeIconLock(DEFAULT_PLAYER_ICONS[0], { unlocked: true })).toBe("Free");
  });
});
