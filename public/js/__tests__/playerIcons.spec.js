import { describe, expect, it } from "vitest";
import { buildBaseIcons } from "../iconRegistry.js";
import {
  describeIconLock,
  getFirstIconId,
  getUnlockedPlayerIcons,
  normalizeIconSelection,
  normalizePlayerIcons
} from "../playerIcons.js";

describe("player icon helpers", () => {
  const BASE_ICONS = buildBaseIcons();

  it("normalizes icon catalogs and falls back to the registry when list is missing", () => {
    const normalized = normalizePlayerIcons([
      { id: "a", name: "A", unlock: { type: "score", minScore: 10 } },
      { id: "", name: "" },
      null
    ]);
    expect(normalized.map((i) => i.id)).toContain("a");
    const fallback = normalizePlayerIcons(null);
    expect(fallback.map((i) => i.id)).toEqual(BASE_ICONS.map((i) => i.id));
  });

  it("supports empty icon catalogs when explicitly allowed", () => {
    const empty = normalizePlayerIcons([], { allowEmpty: true });
    expect(empty).toEqual([]);
  });

  it("does not inject registry icons when an explicit empty list is supplied", () => {
    const empty = normalizePlayerIcons([]);
    expect(empty).toEqual([]);
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
    const unlocked = getUnlockedPlayerIcons(BASE_ICONS, {
      achievements: { unlocked: { perfects_run_10: Date.now() } }
    });
    expect(unlocked).toContain("perfect_ten_liner");
    expect(unlocked).not.toContain("orb_free_zigzag");
  });

  it("unlocks the Bee Stripes icon after the Orb Crescendo achievement", () => {
    const unlocked = getUnlockedPlayerIcons(BASE_ICONS, {
      achievements: { unlocked: { orb_combo_20: Date.now() } }
    });
    expect(unlocked).toContain("bee_stripes");
    const bee = BASE_ICONS.find((icon) => icon.id === "bee_stripes");
    expect(bee?.style?.pattern?.type).toBe("stripes");
  });

  it("unlocks the Rainbow Stripes icon after the Orb Vacuum achievement", () => {
    const unlocked = getUnlockedPlayerIcons(BASE_ICONS, {
      achievements: { unlocked: { orbs_run_100: Date.now() } }
    });
    expect(unlocked).toContain("rainbow_stripes");
    const rainbow = BASE_ICONS.find((icon) => icon.id === "rainbow_stripes");
    expect(rainbow?.style?.pattern?.type).toBe("stripes");
    expect(rainbow?.style?.pattern?.colors).toHaveLength(7);
  });

  it("adds the Honeycomb icon when the drift achievement unlocks", () => {
    const unlocked = getUnlockedPlayerIcons(BASE_ICONS, {
      achievements: { unlocked: { total_run_time_600: Date.now() } }
    });
    expect(unlocked).toContain("honeycomb");
    const honeycomb = BASE_ICONS.find((icon) => icon.id === "honeycomb");
    expect(honeycomb?.style?.pattern?.type).toBe("honeycomb");
  });

  it("ties Midnight Honeycomb and Lemon Slice to the broken-pipe achievements", () => {
    const unlocked = getUnlockedPlayerIcons(BASE_ICONS, {
      achievements: {
        unlocked: {
          pipes_broken_total_1000: Date.now(),
          pipes_broken_run_100: Date.now()
        }
      }
    });

    expect(unlocked).toContain("midnight_honeycomb");
    expect(unlocked).toContain("lemon_slice");

    const midnight = BASE_ICONS.find((icon) => icon.id === "midnight_honeycomb");
    const lemon = BASE_ICONS.find((icon) => icon.id === "lemon_slice");

    expect(midnight?.unlock).toEqual({ type: "achievement", id: "pipes_broken_total_1000", label: "Pipe Purger" });
    expect(lemon?.unlock).toEqual({ type: "achievement", id: "pipes_broken_run_100", label: "Shatterstorm Run" });
  });

  it("defines the Lemon Slice citrus accents with warm rind and segment strokes", () => {
    const lemon = BASE_ICONS.find((icon) => icon.id === "lemon_slice");
    expect(lemon?.style?.pattern).toEqual(
      expect.objectContaining({
        type: "citrus_slice",
        stroke: "#f59e0b",
        rindStroke: "#f59e0b",
        segmentStroke: "#ea8c00",
        segments: 10
      })
    );
  });

  it("defines the Perfect Line Beacon palette as a black core with bright red accents", () => {
    const perfectLine = BASE_ICONS.find((icon) => icon.id === "perfect_ten_liner");
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

  it("ships the file icon as a purchasable sprite-backed cosmetic", () => {
    const fileIcon = BASE_ICONS.find((icon) => icon.id === "file_icon");
    expect(fileIcon?.unlock).toEqual({ type: "purchase", cost: 100 });
    expect(fileIcon?.imageSrc).toBe("/file.png");
    const unlocked = getUnlockedPlayerIcons(BASE_ICONS, { ownedIconIds: ["file_icon"] });
    expect(unlocked).toContain("file_icon");
  });

  it("normalizes icon selection to the first unlocked choice", () => {
    const unlocked = new Set([BASE_ICONS[0].id]);
    const selection = normalizeIconSelection({
      currentId: "locked",
      userSelectedId: "missing",
      unlockedIds: unlocked,
      fallbackId: BASE_ICONS[0].id
    });
    expect(selection).toBe(BASE_ICONS[0].id);
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
    expect(describeIconLock(BASE_ICONS[0], { unlocked: true })).toBe("Free");
  });

  it("allows equipping every skin when all prerequisite achievements are complete", () => {
    const achievementMap = BASE_ICONS.reduce((acc, icon) => {
      if (icon.unlock?.type === "achievement") acc[icon.unlock.id] = Date.now();
      return acc;
    }, {});

    const ownedIconIds = BASE_ICONS
      .filter((icon) => icon.unlock?.type === "purchase")
      .map((icon) => icon.id);
    const unlocked = getUnlockedPlayerIcons(BASE_ICONS, {
      achievements: { unlocked: achievementMap },
      ownedIconIds
    });
    const unlockedSet = new Set(unlocked);

    expect(unlockedSet.size).toBe(BASE_ICONS.length);
    expect(unlockedSet).toEqual(new Set(BASE_ICONS.map((icon) => icon.id)));

    const selection = normalizeIconSelection({
      currentId: "inferno_cape",
      userSelectedId: "fire_cape",
      unlockedIds: unlockedSet,
      fallbackId: BASE_ICONS[0].id
    });
    expect(selection).toBe("inferno_cape");
  });

  it("locks fire and inferno capes behind their score achievements", () => {
    const fire = BASE_ICONS.find((icon) => icon.id === "fire_cape");
    const inferno = BASE_ICONS.find((icon) => icon.id === "inferno_cape");
    expect(fire?.unlock?.id).toBe("score_fire_cape_1000");
    expect(inferno?.unlock?.id).toBe("score_inferno_cape_2000");
    expect(fire?.style?.animation?.type).toBe("cape_flow");
    expect(inferno?.style?.animation?.type).toBe("cape_flow");
    expect(fire?.style?.animation?.palette).toEqual(expect.objectContaining({ molten: expect.any(String) }));
    expect(inferno?.style?.animation?.palette).toEqual(expect.objectContaining({ molten: expect.any(String) }));
    expect(fire?.style?.animation?.bands).toBeGreaterThan(2);
    expect(inferno?.style?.animation?.bands).toBeGreaterThan(2);
    expect(fire?.style?.animation?.embers).toBeGreaterThan(0);
    expect(inferno?.style?.animation?.embers).toBeGreaterThan(0);
    expect(fire?.style?.pattern?.type).toBe("cobblestone");
    expect(inferno?.style?.pattern?.type).toBe("cobblestone");

    const none = getUnlockedPlayerIcons(BASE_ICONS, { achievements: { unlocked: {} } });
    expect(none).not.toContain("fire_cape");
    expect(none).not.toContain("inferno_cape");

    const fireOnly = getUnlockedPlayerIcons(BASE_ICONS, {
      achievements: { unlocked: { score_fire_cape_1000: Date.now() } }
    });
    expect(fireOnly).toContain("fire_cape");
    expect(fireOnly).not.toContain("inferno_cape");

    const infernoOnly = getUnlockedPlayerIcons(BASE_ICONS, {
      achievements: { unlocked: { score_inferno_cape_2000: Date.now() } }
    });
    expect(infernoOnly).toContain("inferno_cape");
  });

  it("returns the first icon id when available", () => {
    expect(getFirstIconId([{ id: "alpha" }, { id: "beta" }])).toBe("alpha");
    expect(getFirstIconId([])).toBe("");
  });
});
