import { describe, expect, it } from "vitest";
import { buildAuthHints } from "../authHints.js";
import { GUEST_TRAIL_HINT_TEXT } from "../trailHint.js";
import { SIGNED_OUT_TEXT } from "../userStatusCopy.js";

describe("buildAuthHints", () => {
  it("pairs signed-out status with the guest trail hint", () => {
    const { userHint, trailHint } = buildAuthHints({ online: true, user: null, bestScore: 5 });
    expect(userHint.text).toBe(SIGNED_OUT_TEXT);
    expect(trailHint.text).toBe(GUEST_TRAIL_HINT_TEXT);
  });

  it("does not emit a guest trail hint when signed in", () => {
    const { userHint, trailHint } = buildAuthHints({
      online: true,
      user: { username: "Ace", bestScore: 12 },
      bestScore: 12,
      trails: [{ id: "classic", achievementId: "a", alwaysUnlocked: true }],
      achievements: { unlocked: { a: 1 } }
    });

    expect(userHint.text).toContain("Signed in as Ace");
    expect(trailHint.text).not.toBe(GUEST_TRAIL_HINT_TEXT);
  });

  it("preserves offline messaging even with a signed-in user", () => {
    const { userHint, trailHint } = buildAuthHints({
      online: false,
      user: { username: "OfflinePilot", bestScore: 77 }
    });

    expect(userHint.className).toBe("hint bad");
    expect(trailHint.text).toContain("Offline");
  });

  it("keeps the guest message paired with signed-out copy", () => {
    const { userHint, trailHint } = buildAuthHints({
      online: true,
      user: null,
      bestScore: 0,
      trails: [{ id: "classic", minScore: 0 }],
      achievements: { unlocked: {} }
    });

    expect(userHint.text).toBe(SIGNED_OUT_TEXT);
    expect(trailHint.text).toBe(GUEST_TRAIL_HINT_TEXT);
  });
});
