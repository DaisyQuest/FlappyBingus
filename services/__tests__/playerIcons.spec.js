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

  it("falls back to default icon when none are unlocked", () => {
    const icons = [{ id: "locked", unlock: { type: "score", minScore: 99999 } }];
    const unlocked = unlockedIcons({ bestScore: 0 }, { icons, recordHolder: false });
    expect(unlocked).not.toContain("locked");
    expect(PLAYER_ICONS.map((i) => i.id)).toContain(DEFAULT_PLAYER_ICON_ID);
  });
});
