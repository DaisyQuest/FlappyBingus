import { beforeEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { DEFAULT_TRAIL_HINT, describeTrailLock, renderTrailOptions, toggleTrailMenu } from "../trailMenu.js";

describe("trailMenu helpers", () => {
  let document;
  let container;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body></body>");
    document = dom.window.document;
    container = document.createElement("div");
    document.body.append(container);
  });

  it("describes locks with record-holder and score context", () => {
    expect(describeTrailLock({ id: "record", name: "Record", requiresRecordHolder: true }, { unlocked: false, isRecordHolder: false }))
      .toContain("record holder");
    expect(describeTrailLock({ id: "sunset", name: "Sunset", minScore: 250 }, { unlocked: false, bestScore: 200 }))
      .toContain("250");
    expect(describeTrailLock({ id: "sunset", name: "Sunset", minScore: 250 }, { unlocked: false, bestScore: 240 }))
      .toContain("10 to go");
    expect(describeTrailLock({ id: "aurora", name: "Aurora" }, { unlocked: true })).toBe("Unlocked");
    expect(describeTrailLock({ id: "shop", name: "Shop", unlock: { type: "purchase", cost: 5 } }, { unlocked: false }))
      .toContain("Costs 5");
  });

  it("renders trail options with lock badges, aria state, and labels only", () => {
    const trails = [
      { id: "classic", name: "Classic", minScore: 0 },
      { id: "sunset", name: "Sunset Fade", minScore: 250 }
    ];
    const { rendered } = renderTrailOptions({
      container,
      trails,
      selectedId: "classic",
      unlockedIds: new Set(["classic"]),
      lockTextFor: (trail) => trail.minScore ? `Score ${trail.minScore}` : DEFAULT_TRAIL_HINT
    });

    expect(rendered).toBe(2);
    const buttons = container.querySelectorAll("button[data-trail-id]");
    expect(buttons.length).toBe(2);
    expect(buttons[0].classList.contains("selected")).toBe(true);
    expect(buttons[1].classList.contains("locked")).toBe(true);
    expect(buttons[1].querySelector(".trail-lock")?.textContent).toBe("🔒");
    expect(buttons[1].getAttribute("aria-disabled")).toBe("true");
    expect(buttons[1].dataset.statusText).toContain("Score 250");
    expect(buttons[0].querySelector(".trail-swatch")).toBeNull();
    expect(buttons[0].querySelector(".trail-swatch-canvas")).toBeNull();
  });

  it("marks purchasable trails as interactive with cost labels", () => {
    const trails = [
      { id: "classic", name: "Classic", minScore: 0 },
      { id: "shop", name: "Shop Trail", unlock: { type: "purchase", cost: 10 } }
    ];
    renderTrailOptions({
      container,
      trails,
      selectedId: "classic",
      unlockedIds: new Set(["classic"])
    });

    const button = container.querySelector("button[data-trail-id='shop']");
    expect(button?.dataset.unlockType).toBe("purchase");
    expect(button?.dataset.unlockCost).toBe("10");
    expect(button?.getAttribute("aria-disabled")).toBe("false");
    expect(button?.tabIndex).toBe(0);
    expect(button?.querySelector(".unlock-cost")?.textContent).toContain("Cost");
  });

  it("toggles the trail overlay dialog visibility", () => {
    const overlay = document.createElement("div");
    overlay.className = "trail-overlay hidden";
    overlay.setAttribute("aria-hidden", "true");

    toggleTrailMenu(overlay, true);
    expect(overlay.classList.contains("hidden")).toBe(false);
    expect(overlay.getAttribute("aria-hidden")).toBe("false");

    toggleTrailMenu(overlay, false);
    expect(overlay.classList.contains("hidden")).toBe(true);
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps every unlocked trail selectable with preserved names and aria state", () => {
    const trails = [
      { id: "classic", name: "Classic", minScore: 0 },
      { id: "ember", name: "Ember Core", minScore: 100 },
      { id: "sunset", name: "Sunset Fade", minScore: 250 }
    ];
    const unlockedIds = new Set(trails.map((t) => t.id));

    const { rendered } = renderTrailOptions({
      container,
      trails,
      selectedId: "ember",
      unlockedIds
    });

    const buttons = Array.from(container.querySelectorAll("button[data-trail-id]"));
    expect(rendered).toBe(trails.length);
    expect(buttons.every((btn) => btn.classList.contains("locked") === false)).toBe(true);
    expect(buttons.every((btn) => btn.getAttribute("aria-disabled") === "false")).toBe(true);
    expect(buttons.map((btn) => btn.dataset.trailName)).toEqual(trails.map((t) => t.name));
    expect(buttons.find((btn) => btn.dataset.trailId === "ember")?.getAttribute("aria-pressed")).toBe("true");
  });
});
