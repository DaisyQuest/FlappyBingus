// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createMenuProfileModel } from "../menuProfileBindings.js";

describe("menu profile bindings", () => {
  function buildRefs() {
    return {
      usernameInput: document.createElement("input"),
      pbText: document.createElement("span"),
      trailText: document.createElement("span"),
      iconText: document.createElement("span"),
      pipeTextureText: document.createElement("span"),
      bustercoinText: document.createElement("span")
    };
  }

  it("syncs currency and best score when the user updates", () => {
    const refs = buildRefs();
    const model = createMenuProfileModel({
      refs,
      trails: [{ id: "classic", name: "Classic" }],
      icons: [{ id: "starter", name: "Starter" }],
      pipeTextures: [{ id: "basic", name: "Basic" }],
      bestScoreFallback: 12
    });

    model.sync();
    expect(refs.pbText.textContent).toBe("12");
    expect(refs.bustercoinText.textContent).toBe("0");
    expect(model.getModel().user).toBeNull();

    model.updateUser({
      username: "bingus",
      bestScore: 44,
      bustercoins: 7,
      currencies: { bustercoin: 7 },
      selectedTrail: "classic",
      selectedIcon: "starter",
      selectedPipeTexture: "basic"
    });

    expect(refs.usernameInput.value).toBe("bingus");
    expect(refs.pbText.textContent).toBe("44");
    expect(refs.bustercoinText.textContent).toBe("7");
    expect(refs.trailText.textContent).toBe("Classic");
    expect(refs.iconText.textContent).toBe("Starter");
    expect(refs.pipeTextureText.textContent).toBe("Basic");
  });

  it("refreshes display names when catalogs change", () => {
    const refs = buildRefs();
    const model = createMenuProfileModel({
      refs,
      user: {
        selectedTrail: "nova",
        selectedIcon: "spark",
        selectedPipeTexture: "pulse"
      },
      trails: [{ id: "nova", name: "Nova" }],
      icons: [{ id: "spark", name: "Spark" }],
      pipeTextures: [{ id: "pulse", name: "Pulse" }]
    });

    model.sync();
    expect(refs.trailText.textContent).toBe("Nova");
    expect(refs.iconText.textContent).toBe("Spark");
    expect(refs.pipeTextureText.textContent).toBe("Pulse");

    model.updateCatalogs({
      trails: [{ id: "nova", name: "Nova Prime" }],
      icons: [{ id: "spark", name: "Spark Prime" }],
      pipeTextures: [{ id: "pulse", name: "Pulse Prime" }]
    });

    expect(refs.trailText.textContent).toBe("Nova Prime");
    expect(refs.iconText.textContent).toBe("Spark Prime");
    expect(refs.pipeTextureText.textContent).toBe("Pulse Prime");

    model.updateCatalogs({ icons: [{ id: "spark", name: "Spark Ultra" }] });
    expect(refs.trailText.textContent).toBe("Nova Prime");
    expect(refs.iconText.textContent).toBe("Spark Ultra");
    expect(refs.pipeTextureText.textContent).toBe("Pulse Prime");
  });
});
