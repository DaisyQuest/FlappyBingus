import { describe, expect, it } from "vitest";
import { buildTrailHint } from "../trailHint.js";

describe("buildTrailHint", () => {
  it("returns a guest hint when no user is present", () => {
    const hint = buildTrailHint({ online: true, user: null, bestScore: 123 });
    expect(hint.className).toBe("hint warn");
    expect(hint.text.toLowerCase()).toContain("guest mode");
  });

  it("highlights offline state separately from guest mode", () => {
    const hint = buildTrailHint({ online: false, user: { username: "pilot" }, bestScore: 456 });
    expect(hint.className).toBe("hint bad");
    expect(hint.text).toContain("Offline");
    expect(hint.text).toContain("456");
  });

  it("encourages progress when locked trails remain", () => {
    const hint = buildTrailHint({
      online: true,
      user: { username: "pilot" },
      bestScore: "99",
      trails: [{ id: "classic", achievementId: "a", alwaysUnlocked: true }, { id: "aurora", achievementId: "b", minScore: 700 }],
      achievements: { unlocked: { a: 1 } }
    });

    expect(hint.className).toBe("hint");
    expect(hint.text).toContain("Complete achievements");
    expect(hint.text).toContain("99");
  });

  it("celebrates when all trails are unlocked", () => {
    const hint = buildTrailHint({
      online: true,
      user: { username: "pilot" },
      bestScore: 9999,
      trails: [{ id: "classic", minScore: 0, achievementId: "a" }],
      achievements: { unlocked: { a: 1 } }
    });

    expect(hint.text).toContain("All trails unlocked");
    expect(hint.text).toContain("9999");
  });

  it("accounts for record-holder gated trails when counting locks", () => {
    const hint = buildTrailHint({
      online: true,
      user: { username: "pilot", isRecordHolder: false },
      bestScore: 5000,
      trails: [
        { id: "classic", minScore: 0, achievementId: "a" },
        { id: "world_record", achievementId: "b", requiresRecordHolder: true }
      ],
      achievements: { unlocked: { a: 1 } }
    });

    expect(hint.text).toContain("Exclusive trails");
    expect(hint.text.toLowerCase()).toContain("record holder");
  });
});
