import { describe, expect, it } from "vitest";
import {
  createMenuProfileModel,
  getIconDisplayName,
  getPipeTextureDisplayName,
  getTrailDisplayName,
  syncMenuProfileBindings
} from "../menuProfileBindings.js";

describe("menuProfileBindings", () => {
  it("resolves display names with fallbacks", () => {
    const icons = [{ id: "alpha", name: "Alpha Icon" }];
    const trails = [{ id: "classic", name: "Classic Trail" }];
    const textures = [{ id: "basic", name: "Basic Pipe" }];

    expect(getIconDisplayName("alpha", icons)).toBe("Alpha Icon");
    expect(getIconDisplayName("", icons)).toBe("hi_vis_orange");
    expect(getTrailDisplayName("classic", trails)).toBe("Classic Trail");
    expect(getTrailDisplayName("", trails)).toBe("");
    expect(getPipeTextureDisplayName("basic", textures)).toBe("Basic Pipe");
    expect(getPipeTextureDisplayName("", textures)).toBe("basic");
  });

  it("syncs menu bindings with fallbacks and user data", () => {
    const refs = {
      usernameInput: { value: "" },
      pbText: { textContent: "" },
      bustercoinText: { textContent: "" },
      supportcoinText: { textContent: "" },
      trailText: { textContent: "" },
      iconText: { textContent: "" },
      pipeTextureText: { textContent: "" }
    };

    const result = syncMenuProfileBindings({
      refs,
      user: {
        username: "pilot",
        bestScore: 42,
        selectedTrail: "aurora",
        selectedIcon: "alpha",
        selectedPipeTexture: "glass",
        currencies: { bustercoin: 11, supportcoin: 7 }
      },
      trails: [{ id: "aurora", name: "Aurora Trail" }],
      icons: [{ id: "alpha", name: "Alpha Icon" }],
      pipeTextures: [{ id: "glass", name: "Glass Pipe" }],
      bestScoreFallback: 12
    });

    expect(result.username).toBe("pilot");
    expect(result.bestScore).toBe(42);
    expect(result.supportcoins).toBe(7);
    expect(refs.usernameInput.value).toBe("pilot");
    expect(refs.pbText.textContent).toBe("42");
    expect(refs.bustercoinText.textContent).toBe("11");
    expect(refs.supportcoinText.textContent).toBe("7");
    expect(refs.trailText.textContent).toBe("Aurora Trail");
    expect(refs.iconText.textContent).toBe("Alpha Icon");
    expect(refs.pipeTextureText.textContent).toBe("Glass Pipe");
  });

  it("updates model state when catalogs or user records change", () => {
    const refs = { usernameInput: { value: "" }, pbText: { textContent: "" } };
    const model = createMenuProfileModel({ refs, fallbackUsername: "guest", bestScoreFallback: 3 });

    const initial = model.sync();
    expect(initial.username).toBe("guest");
    expect(initial.bestScore).toBe(3);

    const updatedUser = model.updateUser({ username: "ace", bestScore: 99 });
    expect(updatedUser.username).toBe("ace");
    expect(updatedUser.bestScore).toBe(99);

    const updatedCatalogs = model.updateCatalogs({
      trails: [{ id: "ember", name: "Ember Trail" }],
      icons: [{ id: "spark", name: "Spark Icon" }],
      pipeTextures: [{ id: "metal", name: "Metal Pipe" }]
    });
    expect(updatedCatalogs.trailId).toBe("classic");
    expect(model.getModel().trails).toHaveLength(1);
  });
});
