import { describe, expect, it, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import {
  THEME_DEFAULT_VALUES,
  applyThemeValues,
  buildThemeLibrary,
  initThemeEditor,
  mergeThemeValues,
  normalizeThemeValues
} from "../themes.js";

const baseConfig = { ui: { themes: { defaultThemeId: "aurora" } } };
let document;
let window;

function createStorageMock() {
  let store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
}

const fallbackStorage = createStorageMock();

beforeEach(() => {
  if (!globalThis.localStorage) {
    globalThis.localStorage = fallbackStorage;
  }
  globalThis.localStorage.clear();
  const dom = new JSDOM("<!doctype html><body></body>");
  document = dom.window.document;
  window = dom.window;
});

describe("theme helpers", () => {
  it("normalizes invalid theme values to defaults", () => {
    const normalized = normalizeThemeValues({
      bg0: "not-a-color",
      panelAlpha: 2,
      ambientGlow: "no",
      focusAlpha: -1
    });

    expect(normalized.bg0).toBe(THEME_DEFAULT_VALUES.bg0);
    expect(normalized.panelAlpha).toBe(0.98);
    expect(normalized.ambientGlow).toBe(THEME_DEFAULT_VALUES.ambientGlow);
    expect(normalized.focusAlpha).toBe(0.3);
  });

  it("merges theme values while preserving defaults", () => {
    const merged = mergeThemeValues(THEME_DEFAULT_VALUES, {
      bg0: "#112233",
      panelAlpha: 0.7,
      sparkleEnabled: false
    });

    expect(merged.bg0).toBe("#112233");
    expect(merged.panelAlpha).toBe(0.7);
    expect(merged.sparkleEnabled).toBe(false);
    expect(merged.bg1).toBe(THEME_DEFAULT_VALUES.bg1);
  });

  it("builds the preset library", () => {
    const library = buildThemeLibrary();
    expect(library.aurora?.name).toBe("Aurora Dream");
    expect(library.ember?.values.bg0).toBeTruthy();
  });

  it("applies theme values to CSS variables", () => {
    const root = document.createElement("div");
    const values = mergeThemeValues(THEME_DEFAULT_VALUES, {
      panel: "#000000",
      panelAlpha: 0.5,
      bg0: "#123456",
      glassEnabled: false,
      panelBlur: 20
    });

    applyThemeValues(values, root);

    expect(root.style.getPropertyValue("--panel")).toBe("rgba(0,0,0,0.5)");
    expect(root.style.getPropertyValue("--bg0")).toBe("#123456");
    expect(root.style.getPropertyValue("--panel-blur")).toBe("0px");
  });
});

describe("theme editor", () => {
  it("renders theme editor controls and preset options", () => {
    const refs = {
      themePresetSelect: document.createElement("select"),
      themeResetBtn: document.createElement("button"),
      themeRandomizeBtn: document.createElement("button"),
      themeRandomAccentBtn: document.createElement("button"),
      themePaletteRow: document.createElement("div"),
      themeEditor: document.createElement("div"),
      themeStatus: document.createElement("div")
    };

    Object.values(refs).forEach((el) => document.body.append(el));

    const result = initThemeEditor({ refs, config: baseConfig });

    expect(result).toBeTruthy();
    expect(refs.themePresetSelect).toBeInstanceOf(window.HTMLSelectElement);
    expect(refs.themePresetSelect.querySelectorAll("option").length).toBeGreaterThan(1);
    expect(refs.themeEditor.querySelectorAll(".theme-group").length).toBeGreaterThan(0);
    expect(refs.themePaletteRow.querySelectorAll("button").length).toBeGreaterThan(0);
  });
});
