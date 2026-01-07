import { describe, expect, it, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  DEFAULT_ICON_HINT,
  applyIconSwatchStyles,
  iconHoverText,
  renderIconOptions,
  resetIconHint,
  toggleIconMenu
} from "../iconMenu.js";

const ICONS = [
  { id: "free", name: "Freebie", style: { palette: { fill: "#123", core: "#456", rim: "#789", glow: "pink" } }, unlock: { type: "free" } },
  { id: "locked", name: "Locked", unlock: { type: "score", minScore: 50 } }
];

describe("iconMenu helpers", () => {
  let document;
  let window;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body><div id='mount'></div></body>");
    document = dom.window.document;
    window = dom.window;
  });

  it("renders icon buttons with lock indicators and aria attributes", () => {
    const container = document.createElement("div");
    const { rendered, swatches } = renderIconOptions({
      container,
      icons: ICONS,
      selectedId: "free",
      unlockedIds: new Set(["free"])
    });

    expect(rendered).toBe(2);
    const buttons = Array.from(container.querySelectorAll("button[data-icon-id]"));
    expect(buttons).toHaveLength(2);
    const free = buttons.find(b => b.dataset.iconId === "free");
    const locked = buttons.find(b => b.dataset.iconId === "locked");
    expect(free?.getAttribute("aria-pressed")).toBe("true");
    expect(locked?.className).toContain("locked");
    expect(locked?.querySelector(".icon-lock")?.textContent).toBe("🔒");
    expect(locked?.getAttribute("aria-disabled")).toBe("true");
    expect(swatches).toHaveLength(2);
    expect(swatches.every(s => s.canvas instanceof window.HTMLCanvasElement)).toBe(true);
    expect(free?.querySelector(".icon-swatch-canvas")).toBeInstanceOf(window.HTMLCanvasElement);
  });

  it("marks purchasable icons as interactive with cost metadata", () => {
    const container = document.createElement("div");
    renderIconOptions({
      container,
      icons: [{ id: "coin", name: "Coin", unlock: { type: "purchase", cost: 12 } }],
      selectedId: "none",
      unlockedIds: new Set()
    });

    const purchasable = container.querySelector("button[data-icon-id='coin']");
    expect(purchasable?.dataset.unlockType).toBe("purchase");
    expect(purchasable?.dataset.unlockCost).toBe("12");
    expect(purchasable?.getAttribute("aria-disabled")).toBe("false");
    expect(purchasable?.tabIndex).toBe(0);
    expect(purchasable?.querySelector(".unlock-cost")?.textContent).toContain("Cost");
  });

  it("applies swatch styles with sensible defaults", () => {
    const span = document.createElement("span");
    applyIconSwatchStyles(span, ICONS[0]);
    expect(span.style.getPropertyValue("--icon-fill")).toBe("#123");
    expect(span.style.getPropertyValue("--icon-core")).toBe("#456");
    expect(span.style.getPropertyValue("--icon-rim")).toBe("#789");
    expect(span.style.getPropertyValue("--icon-glow")).toBe("pink");

    const fallback = document.createElement("span");
    applyIconSwatchStyles(fallback, null);
    expect(fallback.style.getPropertyValue("--icon-fill")).toBe("#ff8c1a");
    expect(fallback.style.getPropertyValue("--icon-core")).toBe("#ffc285");
    expect(fallback.style.getPropertyValue("--icon-rim")).toBe("#0f172a");
    expect(fallback.style.getPropertyValue("--icon-glow")).toBe("rgba(255, 200, 120, 0.75)");
  });

  it("explains hover text for locked and unlocked states", () => {
    const locked = iconHoverText(ICONS[1], { unlocked: false });
    const unlocked = iconHoverText(ICONS[0], { unlocked: true });
    expect(locked.toLowerCase()).toContain("locked");
    expect(unlocked.toLowerCase()).toContain("click to equip");
  });

  it("invokes swatch render callbacks with icon metadata", () => {
    const container = document.createElement("div");
    const spy = vi.fn();
    renderIconOptions({
      container,
      icons: ICONS,
      selectedId: "free",
      unlockedIds: new Set(["free"]),
      onRenderSwatch: spy
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      icon: expect.objectContaining({ id: "free" })
    }));
  });

  it("resets hint text with a default message", () => {
    const hint = document.createElement("div");
    hint.className = "hint bad";
    hint.textContent = "Bad";
    resetIconHint(hint);
    expect(hint.className).toBe("hint");
    expect(hint.textContent).toBe(DEFAULT_ICON_HINT);
  });

  it("toggles icon overlay visibility and aria-hidden", () => {
    const overlay = document.createElement("div");
    overlay.className = "hidden";
    overlay.setAttribute("aria-hidden", "true");
    toggleIconMenu(overlay, true);
    expect(overlay.classList.contains("hidden")).toBe(false);
    expect(overlay.getAttribute("aria-hidden")).toBe("false");
    toggleIconMenu(overlay, false);
    expect(overlay.classList.contains("hidden")).toBe(true);
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
  });
});
