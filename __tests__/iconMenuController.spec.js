import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

import { createIconMenuController } from "../public/js/main/iconMenuController.js";

const buildElements = () => {
  const dom = new JSDOM(`<!doctype html><body>
    <div id="icon-text"></div>
    <button id="icon-launcher"><span class="icon-swatch"></span><span class="icon-launcher-name"></span></button>
    <div id="icon-hint"></div>
    <div id="icon-options"></div>
  </body>`, { url: "http://localhost" });
  const document = dom.window.document;
  return {
    document,
    elements: {
      iconText: document.getElementById("icon-text"),
      iconLauncher: document.getElementById("icon-launcher"),
      iconHint: document.getElementById("icon-hint"),
      iconOptions: document.getElementById("icon-options")
    }
  };
};

const buildController = ({
  elements,
  net,
  getIconMenuState = () => ({ unlocked: new Set(["spark"]) }),
  getPlayerIcons = () => [{ id: "spark", name: "Spark" }],
  renderIconMenuOptions = () => ({ rendered: 1, swatches: [{ icon: { id: "spark" }, canvas: {} }] }),
  normalizeIconSelection = ({ currentId }) => currentId
} = {}) => {
  let currentIconId = "spark";
  const setPlayerImage = vi.fn();
  const setCurrentIconId = vi.fn((id) => { currentIconId = id; });
  const syncLauncherSwatch = vi.fn();
  const refreshTrailMenu = vi.fn();
  const writeIconCookie = vi.fn();
  const applyIconSwatchStyles = vi.fn();
  const getCachedIconSprite = vi.fn(() => ({ sprite: true }));
  const paintIconCanvas = vi.fn();

  const controller = createIconMenuController({
    elements,
    getNet: () => net,
    getIconMenuState,
    getCurrentIconId: () => currentIconId,
    setCurrentIconId,
    getPlayerIcons,
    setPlayerImage,
    getIconDisplayName: (id, icons) => icons.find((icon) => icon.id === id)?.name || id,
    normalizeIconSelection,
    applyIconSwatchStyles,
    renderIconMenuOptions,
    getCachedIconSprite,
    paintIconCanvas,
    syncLauncherSwatch,
    refreshTrailMenu,
    writeIconCookie,
    DEFAULT_ICON_HINT: "Hover icons",
    fallbackIconId: "fallback"
  });

  return {
    controller,
    setPlayerImage,
    setCurrentIconId,
    syncLauncherSwatch,
    refreshTrailMenu,
    writeIconCookie,
    applyIconSwatchStyles,
    getCachedIconSprite,
    paintIconCanvas
  };
};

describe("icon menu controller", () => {
  it("applies icon selection updates, renders options, and syncs swatches", () => {
    const { elements } = buildElements();
    const net = { user: { selectedIcon: "spark" }, achievements: {} };
    const {
      controller,
      setPlayerImage,
      setCurrentIconId,
      syncLauncherSwatch,
      refreshTrailMenu,
      writeIconCookie,
      applyIconSwatchStyles,
      getCachedIconSprite,
      paintIconCanvas
    } = buildController({ elements, net });

    controller.applyIconSelection("spark", [{ id: "spark", name: "Spark" }], new Set(["spark"]));

    expect(setCurrentIconId).toHaveBeenCalledWith("spark");
    expect(elements.iconText.textContent).toBe("Spark");
    expect(elements.iconLauncher.querySelector(".icon-launcher-name").textContent).toBe("Spark");
    expect(applyIconSwatchStyles).toHaveBeenCalled();
    expect(getCachedIconSprite).toHaveBeenCalled();
    expect(setPlayerImage).toHaveBeenCalled();
    expect(syncLauncherSwatch).toHaveBeenCalledWith("spark", expect.any(Array), expect.any(Object));
    expect(paintIconCanvas).toHaveBeenCalled();
    expect(elements.iconHint.textContent).toBe("Hover icons");
    expect(refreshTrailMenu).toHaveBeenCalled();
    expect(writeIconCookie).toHaveBeenCalledWith("spark");
  });

  it("handles empty icon catalogs without setting sprites", () => {
    const { elements } = buildElements();
    const net = { user: null, achievements: {} };
    const { controller, setPlayerImage } = buildController({
      elements,
      net,
      getPlayerIcons: () => [],
      renderIconMenuOptions: () => ({ rendered: 0, swatches: [] })
    });

    controller.applyIconSelection("missing", [], new Set());

    expect(setPlayerImage).not.toHaveBeenCalled();
    expect(elements.iconHint.textContent).toBe("No icons available.");
    expect(elements.iconHint.className).toBe("hint bad");
  });

  it("refreshes the icon menu using state providers", () => {
    const { elements } = buildElements();
    const net = { user: { selectedIcon: "alpha" }, achievements: { state: { unlocked: {} } } };
    const getIconMenuState = vi.fn(() => ({
      orderedIcons: [{ id: "alpha", name: "Alpha" }],
      unlocked: ["alpha"],
      bestScore: 5,
      achievements: { unlocked: {} },
      isRecordHolder: false
    }));
    const normalizeIconSelection = vi.fn(({ currentId }) => currentId || "alpha");
    const { controller } = buildController({
      elements,
      net,
      getIconMenuState,
      getPlayerIcons: () => [{ id: "alpha", name: "Alpha" }],
      normalizeIconSelection
    });

    const result = controller.refreshIconMenu("alpha");

    expect(getIconMenuState).toHaveBeenCalled();
    expect(normalizeIconSelection).toHaveBeenCalled();
    expect(result.unlocked).toBeInstanceOf(Set);
    expect(result.selected).toBe("alpha");
  });
});
