import { describe, expect, it } from "vitest";
import { DEFAULT_PLAYER_ICON_ID } from "../playerIcons.js";
import { DEFAULT_PIPE_TEXTURE_ID } from "../pipeTextures.js";
import {
  getIconDisplayName,
  getPipeTextureDisplayName,
  getTrailDisplayName,
  syncMenuProfileBindings
} from "../menuProfileBindings.js";

const makeRefs = () => ({
  usernameInput: { value: "" },
  pbText: { textContent: "" },
  trailText: { textContent: "" },
  iconText: { textContent: "" },
  pipeTextureText: { textContent: "" },
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

  it("resolves pipe texture display names with fallbacks", () => {
    const textures = [{ id: "glass", name: "Glass" }];
    expect(getPipeTextureDisplayName("glass", textures)).toBe("Glass");
    expect(getPipeTextureDisplayName("unknown", textures)).toBe("unknown");
    expect(getPipeTextureDisplayName("", textures)).toBe(DEFAULT_PIPE_TEXTURE_ID);
  });

  it("binds menu profile fields from a signed-in user", () => {
    const refs = makeRefs();
    const user = {
      username: "Ada",
      bestScore: 42,
      bustercoins: 1,
      currencies: { bustercoin: 7 },
      selectedTrail: "neon",
      selectedIcon: "spark",
      selectedPipeTexture: "glass"
    };
    const trails = [{ id: "neon", name: "Neon" }];
    const icons = [{ id: "spark", name: "Spark" }];
    const pipeTextures = [{ id: "glass", name: "Glass" }];

    const snapshot = syncMenuProfileBindings({
      refs,
      user,
      trails,
      icons,
      pipeTextures,
      fallbackTrailId: "classic",
      fallbackIconId: DEFAULT_PLAYER_ICON_ID,
      fallbackPipeTextureId: DEFAULT_PIPE_TEXTURE_ID,
      bestScoreFallback: 0
    });

    expect(refs.usernameInput.value).toBe("Ada");
    expect(refs.pbText.textContent).toBe("42");
    expect(refs.bustercoinText.textContent).toBe("7");
    expect(refs.trailText.textContent).toBe("Neon");
    expect(refs.iconText.textContent).toBe("Spark");
    expect(refs.pipeTextureText.textContent).toBe("Glass");
    expect(snapshot).toEqual({
      username: "Ada",
      bestScore: 42,
      bustercoins: 7,
      trailId: "neon",
      iconId: "spark",
      pipeTextureId: "glass"
    });
  });

  it("uses fallback values when no user data is available", () => {
    const refs = makeRefs();
    const trails = [{ id: "classic", name: "Classic" }];
    const icons = [{ id: DEFAULT_PLAYER_ICON_ID, name: "Default" }];
    const pipeTextures = [{ id: DEFAULT_PIPE_TEXTURE_ID, name: "Basic" }];

    const snapshot = syncMenuProfileBindings({
      refs,
      user: null,
      trails,
      icons,
      pipeTextures,
      fallbackTrailId: "classic",
      fallbackIconId: DEFAULT_PLAYER_ICON_ID,
      fallbackPipeTextureId: DEFAULT_PIPE_TEXTURE_ID,
      bestScoreFallback: 9
    });

    expect(refs.usernameInput.value).toBe("");
    expect(refs.pbText.textContent).toBe("9");
    expect(refs.bustercoinText.textContent).toBe("0");
    expect(refs.trailText.textContent).toBe("Classic");
    expect(refs.iconText.textContent).toBe("Default");
    expect(refs.pipeTextureText.textContent).toBe("Basic");
    expect(snapshot).toEqual({
      username: "",
      bestScore: 9,
      bustercoins: 0,
      trailId: "classic",
      iconId: DEFAULT_PLAYER_ICON_ID,
      pipeTextureId: DEFAULT_PIPE_TEXTURE_ID
    });
  });

  it("tolerates missing refs and non-finite values", () => {
    const snapshot = syncMenuProfileBindings({
      user: { username: "Zed", bestScore: Number.NaN, bustercoins: Number.NaN, currencies: { bustercoin: 12 } },
      fallbackTrailId: "classic",
      fallbackIconId: DEFAULT_PLAYER_ICON_ID,
      fallbackPipeTextureId: DEFAULT_PIPE_TEXTURE_ID,
      bestScoreFallback: 3
    });

    expect(snapshot).toEqual({
      username: "Zed",
      bestScore: 3,
      bustercoins: 12,
      trailId: "classic",
      iconId: DEFAULT_PLAYER_ICON_ID,
      pipeTextureId: DEFAULT_PIPE_TEXTURE_ID
    });
  });
});
