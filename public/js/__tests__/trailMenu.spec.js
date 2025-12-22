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
  });

  it("renders trail options with lock badges, aria state, and swatch hooks", () => {
    const trails = [
      { id: "classic", name: "Classic", minScore: 0 },
      { id: "sunset", name: "Sunset Fade", minScore: 250 }
    ];
    const { rendered, swatches } = renderTrailOptions({
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
    expect(swatches[0].swatch.classList.contains("trail-swatch")).toBe(true);
    expect(swatches[0].canvas.classList.contains("trail-swatch-canvas")).toBe(true);
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
});
