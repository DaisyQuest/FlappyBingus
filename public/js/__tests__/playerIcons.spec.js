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

  it("unlocks the Bee Stripes icon after the Orb Crescendo achievement", () => {
    const unlocked = getUnlockedPlayerIcons(DEFAULT_PLAYER_ICONS, {
      achievements: { unlocked: { orb_combo_20: Date.now() } }
    });
    expect(unlocked).toContain("bee_stripes");
    const bee = DEFAULT_PLAYER_ICONS.find((icon) => icon.id === "bee_stripes");
    expect(bee?.style?.pattern?.type).toBe("stripes");
  });

  it("adds the Honeycomb icon when the drift achievement unlocks", () => {
    const unlocked = getUnlockedPlayerIcons(DEFAULT_PLAYER_ICONS, {
      achievements: { unlocked: { total_run_time_600: Date.now() } }
    });
    expect(unlocked).toContain("honeycomb");
    const honeycomb = DEFAULT_PLAYER_ICONS.find((icon) => icon.id === "honeycomb");
    expect(honeycomb?.style?.pattern?.type).toBe("honeycomb");
  });

  it("ties Midnight Honeycomb and Lemon Slice to the broken-pipe achievements", () => {
    const unlocked = getUnlockedPlayerIcons(DEFAULT_PLAYER_ICONS, {
      achievements: {
        unlocked: {
          pipes_broken_total_1000: Date.now(),
          pipes_broken_run_100: Date.now()
        }
      }
    });

    expect(unlocked).toContain("midnight_honeycomb");
    expect(unlocked).toContain("lemon_slice");

    const midnight = DEFAULT_PLAYER_ICONS.find((icon) => icon.id === "midnight_honeycomb");
    const lemon = DEFAULT_PLAYER_ICONS.find((icon) => icon.id === "lemon_slice");

    expect(midnight?.unlock).toEqual({ type: "achievement", id: "pipes_broken_total_1000", label: "Pipe Purger" });
    expect(lemon?.unlock).toEqual({ type: "achievement", id: "pipes_broken_run_100", label: "Shatterstorm Run" });
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
    const achievement = { id: "a", unlock: { type: "achievement", id: "a1", label: "Perfect Ten" } };
    const record = { id: "r", unlock: { type: "record" } };
    expect(describeIconLock(purchase, { unlocked: false })).toContain("Purchase for");
    expect(describeIconLock(purchase, { unlocked: false })).toContain("12");
    expect(describeIconLock(score, { unlocked: false })).toContain("Reach score 100");
    expect(describeIconLock(achievement, { unlocked: false })).toContain("Perfect Ten");
    expect(describeIconLock(record, { unlocked: false })).toContain("record holder");
    expect(describeIconLock(DEFAULT_PLAYER_ICONS[0], { unlocked: true })).toBe("Free");
  });

  it("allows equipping every skin when all prerequisite achievements are complete", () => {
    const achievementMap = DEFAULT_PLAYER_ICONS.reduce((acc, icon) => {
      if (icon.unlock?.type === "achievement") acc[icon.unlock.id] = Date.now();
      return acc;
    }, {});

    const unlocked = getUnlockedPlayerIcons(DEFAULT_PLAYER_ICONS, { achievements: { unlocked: achievementMap } });
    const unlockedSet = new Set(unlocked);

    expect(unlockedSet.size).toBe(DEFAULT_PLAYER_ICONS.length);
    expect(unlockedSet).toEqual(new Set(DEFAULT_PLAYER_ICONS.map((icon) => icon.id)));

    const selection = normalizeIconSelection({
      currentId: "inferno_cape",
      userSelectedId: "fire_cape",
      unlockedIds: unlockedSet,
      fallbackId: DEFAULT_PLAYER_ICON_ID
    });
    expect(selection).toBe("inferno_cape");
  });

  it("locks fire and inferno capes behind their score achievements", () => {
    const fire = DEFAULT_PLAYER_ICONS.find((icon) => icon.id === "fire_cape");
    const inferno = DEFAULT_PLAYER_ICONS.find((icon) => icon.id === "inferno_cape");
    expect(fire?.unlock?.id).toBe("score_fire_cape_1000");
    expect(inferno?.unlock?.id).toBe("score_inferno_cape_2000");
    expect(fire?.style?.animation?.type).toBe("lava");
    expect(inferno?.style?.animation?.type).toBe("lava");
    expect(fire?.style?.animation?.palette).toEqual(expect.objectContaining({ molten: expect.any(String) }));
    expect(inferno?.style?.animation?.palette).toEqual(expect.objectContaining({ molten: expect.any(String) }));
    expect(fire?.style?.animation?.layers).toBeGreaterThan(2);
    expect(inferno?.style?.animation?.layers).toBeGreaterThan(2);
    expect(fire?.style?.animation?.smoothness).toBeGreaterThan(0);
    expect(inferno?.style?.animation?.smoothness).toBeGreaterThan(0);
    expect(fire?.style?.pattern).toBeUndefined();
    expect(inferno?.style?.pattern).toBeUndefined();

    const none = getUnlockedPlayerIcons(DEFAULT_PLAYER_ICONS, { achievements: { unlocked: {} } });
    expect(none).not.toContain("fire_cape");
    expect(none).not.toContain("inferno_cape");

    const fireOnly = getUnlockedPlayerIcons(DEFAULT_PLAYER_ICONS, {
      achievements: { unlocked: { score_fire_cape_1000: Date.now() } }
    });
    expect(fireOnly).toContain("fire_cape");
    expect(fireOnly).not.toContain("inferno_cape");

    const infernoOnly = getUnlockedPlayerIcons(DEFAULT_PLAYER_ICONS, {
      achievements: { unlocked: { score_inferno_cape_2000: Date.now() } }
    });
    expect(infernoOnly).toContain("inferno_cape");
  });
});
