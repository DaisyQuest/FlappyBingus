import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYER_ICON_ID,
  PLAYER_ICONS,
  normalizePlayerIcons,
  unlockedIcons
} from "../playerIcons.cjs";

describe("server player icon catalog", () => {
  it("normalizes icon data and preserves defaults", () => {
    const normalized = normalizePlayerIcons([{ id: "x", name: "X" }, { id: "" }]);
    expect(normalized.find((i) => i.id === "x")?.name).toBe("X");
    const fallback = normalizePlayerIcons(null);
    expect(fallback.map((i) => i.id)).toEqual(PLAYER_ICONS.map((i) => i.id));
  });

  it("unlocks icons based on owned items, score, and achievements", () => {
    const icons = [
      { id: "free", unlock: { type: "free" } },
      { id: "score", unlock: { type: "score", minScore: 10 } },
      { id: "ach", unlock: { type: "achievement", id: "a" } },
      { id: "paid", unlock: { type: "purchase" } },
      { id: "record", unlock: { type: "record" } }
    ];
    const unlocked = unlockedIcons(
      { bestScore: 11, achievements: { unlocked: { a: Date.now() } }, ownedIcons: ["paid"] },
      { icons, recordHolder: true }
    );
    expect(unlocked).toEqual(expect.arrayContaining(["free", "score", "ach", "paid", "record"]));
  });

  it("unlocks the Perfect Ten reward icon when the achievement is earned", () => {
    const unlocked = unlockedIcons(
      { achievements: { unlocked: { perfects_run_10: Date.now() } } },
      { icons: PLAYER_ICONS, recordHolder: false }
    );
    expect(unlocked).toContain("perfect_ten_liner");
    expect(unlocked).not.toContain("orb_free_zigzag");
  });

  it("ships the Perfect Line Beacon as a black core with a bright red shell and guides", () => {
    const perfectLine = PLAYER_ICONS.find((icon) => icon.id === "perfect_ten_liner");
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

  it("falls back to default icon when none are unlocked", () => {
    const icons = [{ id: "locked", unlock: { type: "score", minScore: 99999 } }];
    const unlocked = unlockedIcons({ bestScore: 0 }, { icons, recordHolder: false });
    expect(unlocked).not.toContain("locked");
    expect(PLAYER_ICONS.map((i) => i.id)).toContain(DEFAULT_PLAYER_ICON_ID);
  });

  it("locks fire and inferno capes behind their score achievements", () => {
    const fire = PLAYER_ICONS.find((icon) => icon.id === "fire_cape");
    const inferno = PLAYER_ICONS.find((icon) => icon.id === "inferno_cape");
    expect(fire?.unlock?.id).toBe("score_fire_cape_1000");
    expect(inferno?.unlock?.id).toBe("score_inferno_cape_2000");

    const none = unlockedIcons({ achievements: { unlocked: {} } }, { icons: PLAYER_ICONS, recordHolder: false });
    expect(none).not.toContain("fire_cape");
    expect(none).not.toContain("inferno_cape");

    const fireOnly = unlockedIcons({ achievements: { unlocked: { score_fire_cape_1000: Date.now() } } }, { icons: PLAYER_ICONS });
    expect(fireOnly).toContain("fire_cape");
    expect(fireOnly).not.toContain("inferno_cape");

    const infernoOnly = unlockedIcons({ achievements: { unlocked: { score_inferno_cape_2000: Date.now() } } }, { icons: PLAYER_ICONS });
    expect(infernoOnly).toContain("inferno_cape");
  });
});
