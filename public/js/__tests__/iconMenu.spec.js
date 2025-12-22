import { describe, expect, it, beforeEach } from "vitest";
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
  { id: "free", name: "Freebie", style: { fill: "#123", core: "#456", rim: "#789", glow: "pink" }, unlock: { type: "free" } },
  { id: "locked", name: "Locked", unlock: { type: "score", minScore: 50 } }
];

describe("iconMenu helpers", () => {
  let document;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body><div id='mount'></div></body>");
    document = dom.window.document;
  });

  it("renders icon buttons with lock indicators and aria attributes", () => {
    const container = document.createElement("div");
    const { rendered } = renderIconOptions({
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
    expect(fallback.style.getPropertyValue("--icon-core")).toBe("#ff8c1a");
    expect(fallback.style.getPropertyValue("--icon-rim")).toBe("#0f172a");
    expect(fallback.style.getPropertyValue("--icon-glow")).toBe("rgba(255,200,120,.5)");
  });

  it("explains hover text for locked and unlocked states", () => {
    const locked = iconHoverText(ICONS[1], { unlocked: false });
    const unlocked = iconHoverText(ICONS[0], { unlocked: true });
    expect(locked.toLowerCase()).toContain("locked");
    expect(unlocked.toLowerCase()).toContain("click to equip");
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
