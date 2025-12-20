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
      trails: [{ id: "classic", minScore: 0 }, { id: "aurora", minScore: 700 }]
    });

    expect(hint.className).toBe("hint");
    expect(hint.text).toContain("Climb higher scores");
    expect(hint.text).toContain("99");
  });

  it("highlights record-holder exclusivity when applicable", () => {
    const hint = buildTrailHint({
      online: true,
      user: { username: "pilot", isRecordHolder: false },
      bestScore: 9999,
      trails: [{ id: "classic", minScore: 0 }, { id: "world_record", minScore: 0, requiresRecordHolder: true }]
    });

    expect(hint.text).toContain("World Record Cherry Blossom");
  });

  it("celebrates when all trails are unlocked", () => {
    const hint = buildTrailHint({
      online: true,
      user: { username: "pilot" },
      bestScore: 9999,
      trails: [{ id: "classic", minScore: 0 }]
    });

    expect(hint.text).toContain("All trails unlocked");
    expect(hint.text).toContain("9999");
  });
});
