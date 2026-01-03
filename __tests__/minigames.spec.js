import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";

import {
  MINIGAME_DEFINITIONS,
  initMinigames,
  setMinigamesOverlayOpen,
  createSequenceRng,
  __testables as minigameTestables
} from "../public/js/minigames.js";
import { __testables as uiTestables } from "../public/js/uiLayout.js";

const { createMenuScreen } = uiTestables;
const { clampIndex, pickFrom } = minigameTestables;

const buildUI = (dom) => {
  const refs = {};
  const screen = createMenuScreen(dom.window.document, refs);
  dom.window.document.body.append(screen);
  return refs;
};

const clickMinigame = (container, id) => {
  const button = container.querySelector(`button[data-minigame-id="${id}"]`);
  if (!button) throw new Error(`Missing minigame ${id}`);
  button.click();
  return button;
};

const clickButton = (container, label) => {
  const button = Array.from(container.querySelectorAll("button"))
    .find((btn) => btn.textContent === label);
  if (!button) throw new Error(`Missing button ${label}`);
  button.click();
  return button;
};

let dom;

beforeEach(() => {
  dom = new JSDOM(`<!doctype html><body></body>`);
});

afterEach(() => {
  dom = null;
});

describe("minigames setup", () => {
  it("returns null when required UI nodes are missing", () => {
    expect(initMinigames({ ui: {}, document: dom.window.document })).toBeNull();
  });

  it("toggles overlay visibility safely", () => {
    const refs = buildUI(dom);
    expect(setMinigamesOverlayOpen({}, true)).toBe(false);
    expect(setMinigamesOverlayOpen(refs, true)).toBe(true);
    expect(refs.minigamesOverlay?.classList.contains("hidden")).toBe(false);
    expect(setMinigamesOverlayOpen(refs, false)).toBe(false);
    expect(refs.minigamesOverlay?.classList.contains("hidden")).toBe(true);
  });

  it("renders minigame entries and defaults to the first selection", () => {
    const refs = buildUI(dom);
    initMinigames({ ui: refs, document: dom.window.document });
    const cards = refs.minigamesList?.querySelectorAll(".minigame-card") || [];

    expect(cards).toHaveLength(MINIGAME_DEFINITIONS.length);
    expect(cards[0]?.classList.contains("selected")).toBe(true);
    expect(refs.minigamesDetailTitle?.textContent).toBe(MINIGAME_DEFINITIONS[0].title);
    expect(refs.minigamesStart?.textContent).toBe("Start");
    expect(refs.minigamesReset?.disabled).toBe(true);
  });

  it("opens and closes the overlay from launcher controls", () => {
    const refs = buildUI(dom);
    initMinigames({ ui: refs, document: dom.window.document });

    refs.minigamesLauncher?.click();
    expect(refs.minigamesOverlay?.classList.contains("hidden")).toBe(false);
    refs.minigamesClose?.click();
    expect(refs.minigamesOverlay?.classList.contains("hidden")).toBe(true);
    expect(refs.minigamesStage?.childElementCount).toBe(0);
  });
});

describe("minigame interactions", () => {
  it("completes and resets Orbital Relay", () => {
    const refs = buildUI(dom);
    initMinigames({ ui: refs, document: dom.window.document });

    refs.minigamesStart?.click();
    for (let i = 0; i < 5; i += 1) {
      clickButton(refs.minigamesStage, "Collect Orb");
    }

    const action = clickButton(refs.minigamesStage, "Collect Orb");
    expect(action.disabled).toBe(true);
    expect(refs.minigamesDetailInstructions?.textContent).toContain("Relay stabilized");

    refs.minigamesReset?.click();
    expect(refs.minigamesDetailInstructions?.textContent).toContain("Collect 5 orbs");
    expect(action.disabled).toBe(false);
  });

  it("handles wrong and correct streaks in Gust Runner", () => {
    const refs = buildUI(dom);
    initMinigames({
      ui: refs,
      document: dom.window.document,
      rngs: { "gust-runner": createSequenceRng([0, 0, 0, 0, 0]) }
    });

    clickMinigame(refs.minigamesList, "gust-runner");
    refs.minigamesStart?.click();

    clickButton(refs.minigamesStage, "Center");
    expect(refs.minigamesDetailInstructions?.textContent).toContain("Streak: 0");

    clickButton(refs.minigamesStage, "Left");
    clickButton(refs.minigamesStage, "Left");
    clickButton(refs.minigamesStage, "Left");
    expect(refs.minigamesDetailInstructions?.textContent).toContain("gust perfectly");
  });

  it("requires opposite inputs in Mirror Dash", () => {
    const refs = buildUI(dom);
    initMinigames({
      ui: refs,
      document: dom.window.document,
      rngs: { "mirror-dash": createSequenceRng([0, 0, 0, 0]) }
    });

    clickMinigame(refs.minigamesList, "mirror-dash");
    refs.minigamesStart?.click();

    clickButton(refs.minigamesStage, "Left");
    expect(refs.minigamesDetailInstructions?.textContent).toContain("Opposite streak: 0");

    clickButton(refs.minigamesStage, "Right");
    clickButton(refs.minigamesStage, "Right");
    clickButton(refs.minigamesStage, "Right");
    expect(refs.minigamesDetailInstructions?.textContent).toContain("Mirror mastery");
  });

  it("resets lantern order on incorrect picks", () => {
    const refs = buildUI(dom);
    initMinigames({ ui: refs, document: dom.window.document });

    clickMinigame(refs.minigamesList, "lantern-drift");
    refs.minigamesStart?.click();

    const nextLabel = refs.minigamesStage?.querySelector(".minigame-title")?.textContent?.replace("Next: ", "");
    const buttons = Array.from(refs.minigamesStage?.querySelectorAll("button") || []);
    const wrong = buttons.find((button) => button.textContent !== nextLabel);
    wrong?.click();
    expect(refs.minigamesDetailInstructions?.textContent).toContain("Lit 0/4");

    const correctButton = buttons.find((button) => button.textContent === nextLabel);
    correctButton?.click();
    expect(refs.minigamesDetailInstructions?.textContent).toContain("Lit 1/4");
  });

  it("requires surge pulses to hatch in Pulse Hatch", () => {
    const refs = buildUI(dom);
    initMinigames({ ui: refs, document: dom.window.document });

    clickMinigame(refs.minigamesList, "pulse-hatch");
    refs.minigamesStart?.click();

    clickButton(refs.minigamesStage, "Hatch");
    expect(refs.minigamesDetailInstructions?.textContent).toContain("Hatches: 0/3");

    const hatchWhenSurging = () => {
      const meter = refs.minigamesStage?.querySelector(".minigame-title");
      while (meter && !meter.textContent?.includes("Surge")) {
        clickButton(refs.minigamesStage, "Pulse");
      }
      clickButton(refs.minigamesStage, "Hatch");
    };

    hatchWhenSurging();
    hatchWhenSurging();
    hatchWhenSurging();
    expect(refs.minigamesDetailInstructions?.textContent).toContain("Bonus lanes unlocked");
  });
});

describe("minigame utilities", () => {
  it("clamps indices within range", () => {
    expect(clampIndex(-2, 3)).toBe(0);
    expect(clampIndex(2, 3)).toBe(2);
    expect(clampIndex(7, 3)).toBe(2);
    expect(clampIndex(NaN, 3)).toBe(0);
  });

  it("selects items based on RNG rolls", () => {
    const list = ["a", "b", "c"];
    expect(pickFrom(list, () => 0)).toBe("a");
    expect(pickFrom(list, () => 0.4)).toBe("b");
    expect(pickFrom(list, () => 0.99)).toBe("c");
  });
});
