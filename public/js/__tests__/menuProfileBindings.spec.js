import { describe, expect, it } from "vitest";
import { DEFAULT_PLAYER_ICON_ID } from "../playerIcons.js";
import { getIconDisplayName, getTrailDisplayName, syncMenuProfileBindings } from "../menuProfileBindings.js";

const makeRefs = () => ({
  usernameInput: { value: "" },
  pbText: { textContent: "" },
  trailText: { textContent: "" },
  iconText: { textContent: "" },
  bustercoinText: { textContent: "" }
});

describe("menuProfileBindings", () => {
  it("resolves icon display names with fallbacks", () => {
    const icons = [{ id: "spark", name: "Spark" }];
    expect(getIconDisplayName("spark", icons)).toBe("Spark");
    expect(getIconDisplayName("missing", icons)).toBe("missing");
    expect(getIconDisplayName("", icons)).toBe(DEFAULT_PLAYER_ICON_ID);
  });

  it("resolves trail display names with fallbacks", () => {
    const trails = [{ id: "neon", name: "Neon" }];
    expect(getTrailDisplayName("neon", trails)).toBe("Neon");
    expect(getTrailDisplayName("mystery", trails)).toBe("mystery");
    expect(getTrailDisplayName("", trails)).toBe("");
  });

  it("binds menu profile fields from a signed-in user", () => {
    const refs = makeRefs();
    const user = {
      username: "Ada",
      bestScore: 42,
      bustercoins: 7,
      selectedTrail: "neon",
      selectedIcon: "spark"
    };
    const trails = [{ id: "neon", name: "Neon" }];
    const icons = [{ id: "spark", name: "Spark" }];

    const snapshot = syncMenuProfileBindings({
      refs,
      user,
      trails,
      icons,
      fallbackTrailId: "classic",
      fallbackIconId: DEFAULT_PLAYER_ICON_ID,
      bestScoreFallback: 0
    });

    expect(refs.usernameInput.value).toBe("Ada");
    expect(refs.pbText.textContent).toBe("42");
    expect(refs.bustercoinText.textContent).toBe("7");
    expect(refs.trailText.textContent).toBe("Neon");
    expect(refs.iconText.textContent).toBe("Spark");
    expect(snapshot).toEqual({
      username: "Ada",
      bestScore: 42,
      bustercoins: 7,
      trailId: "neon",
      iconId: "spark"
    });
  });

  it("uses fallback values when no user data is available", () => {
    const refs = makeRefs();
    const trails = [{ id: "classic", name: "Classic" }];
    const icons = [{ id: DEFAULT_PLAYER_ICON_ID, name: "Default" }];

    const snapshot = syncMenuProfileBindings({
      refs,
      user: null,
      trails,
      icons,
      fallbackTrailId: "classic",
      fallbackIconId: DEFAULT_PLAYER_ICON_ID,
      bestScoreFallback: 9
    });

    expect(refs.usernameInput.value).toBe("");
    expect(refs.pbText.textContent).toBe("9");
    expect(refs.bustercoinText.textContent).toBe("0");
    expect(refs.trailText.textContent).toBe("Classic");
    expect(refs.iconText.textContent).toBe("Default");
    expect(snapshot).toEqual({
      username: "",
      bestScore: 9,
      bustercoins: 0,
      trailId: "classic",
      iconId: DEFAULT_PLAYER_ICON_ID
    });
  });

  it("tolerates missing refs and non-finite values", () => {
    const snapshot = syncMenuProfileBindings({
      user: { username: "Zed", bestScore: Number.NaN, bustercoins: Number.NaN },
      fallbackTrailId: "classic",
      fallbackIconId: DEFAULT_PLAYER_ICON_ID,
      bestScoreFallback: 3
    });

    expect(snapshot).toEqual({
      username: "Zed",
      bestScore: 3,
      bustercoins: 0,
      trailId: "classic",
      iconId: DEFAULT_PLAYER_ICON_ID
    });
  });
});
