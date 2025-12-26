import { describe, it, expect } from "vitest";
import { getUserHintState } from "../userStatus.js";
import { OFFLINE_HINT_TEXT, SIGNED_OUT_TEXT } from "../userStatusCopy.js";

describe("userStatus", () => {
  it("returns offline hint copy when the server is unreachable", () => {
    const hint = getUserHintState({ online: false, user: null });
    expect(hint).toEqual({ className: "hint bad", text: OFFLINE_HINT_TEXT });
  });

  it("emphasizes signed-out status when online without a user", () => {
    const hint = getUserHintState({ online: true, user: null });
    expect(hint).toEqual({ className: "hint warn", text: SIGNED_OUT_TEXT });
  });

  it("includes user stats and currency when signed in", () => {
    const hint = getUserHintState({
      online: true,
      user: {
        username: "Bingus",
        runs: 12,
        totalScore: 3456,
        currencies: { bustercoin: 42 }
      }
    });

    expect(hint.className).toBe("hint good");
    expect(hint.text).toContain("Signed in as Bingus.");
    expect(hint.text).toContain("Runs: 12");
    expect(hint.text).toContain("Total: 3456");
    expect(hint.text).toContain("Bustercoins: 42");
  });
});
