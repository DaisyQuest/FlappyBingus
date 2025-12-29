import { describe, expect, it } from "vitest";
import { syncMenuProfileBindings } from "../menuProfileBindings.js";

function createRefs() {
  return {
    usernameInput: { value: "" },
    pbText: { textContent: "" },
    bustercoinText: { textContent: "" },
    trailText: { textContent: "" },
    iconText: { textContent: "" },
    pipeTextureText: { textContent: "" }
  };
}

describe("menu profile bindings", () => {
  it("uses fallback usernames when the user is missing", () => {
    const refs = createRefs();
    const result = syncMenuProfileBindings({
      refs,
      user: null,
      trails: [{ id: "classic", name: "Classic" }],
      icons: [{ id: "icon", name: "Icon" }],
      pipeTextures: [{ id: "basic", name: "Basic" }],
      fallbackUsername: "PlayerOne",
      bestScoreFallback: 42
    });

    expect(refs.usernameInput.value).toBe("PlayerOne");
    expect(result.username).toBe("PlayerOne");
    expect(refs.pbText.textContent).toBe("42");
  });

  it("prefers user data over fallbacks", () => {
    const refs = createRefs();
    const result = syncMenuProfileBindings({
      refs,
      user: {
        username: "RealUser",
        bestScore: 100,
        selectedTrail: "classic",
        selectedIcon: "icon",
        selectedPipeTexture: "basic",
        currencies: { bustercoin: 5 }
      },
      trails: [{ id: "classic", name: "Classic" }],
      icons: [{ id: "icon", name: "Icon" }],
      pipeTextures: [{ id: "basic", name: "Basic" }],
      fallbackUsername: "Fallback",
      bestScoreFallback: 0
    });

    expect(refs.usernameInput.value).toBe("RealUser");
    expect(result.username).toBe("RealUser");
    expect(refs.pbText.textContent).toBe("100");
    expect(refs.bustercoinText.textContent).toBe("5");
  });
});
