import { afterEach, describe, expect, it, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  THEME_DEFAULT_VALUES,
  applyThemeValues,
  buildThemeLibrary,
  exportThemeString,
  importThemeString,
  initThemeEditor,
  loadThemeState,
  mergeThemeValues,
  normalizeThemeValues,
  saveThemeState
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
  vi.stubGlobal("crypto", {
    getRandomValues(bytes) {
      bytes[0] = 17;
      bytes[1] = 34;
      bytes[2] = 51;
      return bytes;
    }
  });
  const dom = new JSDOM("<!doctype html><body></body>");
  document = dom.window.document;
  window = dom.window;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLInputElement = window.HTMLInputElement;
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("disables ambient glow and sparkle when toggles are off", () => {
    const root = document.createElement("div");
    applyThemeValues(
      mergeThemeValues(THEME_DEFAULT_VALUES, {
        ambientGlow: false,
        sparkleEnabled: false,
        panelBlur: 12,
        glassEnabled: true
      }),
      root
    );

    expect(root.style.getPropertyValue("--bg-glow-1")).toContain("rgba(");
    expect(root.style.getPropertyValue("--sparkle-opacity")).toBe("0");
    expect(root.style.getPropertyValue("--panel-blur")).toBe("12px");
  });

  it("exports and imports a base64 theme payload", () => {
    const exported = exportThemeString({
      ...THEME_DEFAULT_VALUES,
      accent: "#112233",
      pipeGreen: "#445566"
    });
    const imported = importThemeString(exported);

    expect(imported.error).toBeUndefined();
    expect(imported.values.accent).toBe("#112233");
    expect(imported.values.pipeGreen).toBe("#445566");
  });

  it("rejects malformed import payloads", () => {
    expect(importThemeString("")).toEqual({ error: "empty_payload" });
    expect(importThemeString("not-base64")).toEqual({ error: "invalid_payload" });
  });

  it("rejects unsupported import versions", () => {
    const encoded = Buffer.from(JSON.stringify({ version: 99, values: {} }), "utf8").toString("base64");
    expect(importThemeString(encoded)).toEqual({ error: "unsupported_version" });
  });

  it("loads and saves theme state from storage", () => {
    saveThemeState({
      activeThemeId: "aurora",
      lastPresetId: "ember",
      customValues: { bg0: "#010203" }
    });

    const loaded = loadThemeState();
    expect(loaded?.activeThemeId).toBe("aurora");
    expect(loaded?.lastPresetId).toBe("ember");
    expect(loaded?.customValues?.bg0).toBe("#010203");
  });

  it("returns null when storage is invalid", () => {
    globalThis.localStorage.setItem("bingus_theme_state", "{bad json");
    expect(loadThemeState()).toBeNull();
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
      themeStatus: document.createElement("div"),
      themeExportBtn: document.createElement("button"),
      themeImportBtn: document.createElement("button"),
      themeExportField: document.createElement("textarea")
    };

    Object.values(refs).forEach((el) => document.body.append(el));

    const result = initThemeEditor({ refs, config: baseConfig });

    expect(result).toBeTruthy();
    expect(refs.themePresetSelect).toBeInstanceOf(window.HTMLSelectElement);
    expect(refs.themePresetSelect.querySelectorAll("option").length).toBeGreaterThan(1);
    expect(refs.themeEditor.querySelectorAll(".theme-group").length).toBeGreaterThan(0);
    expect(refs.themePaletteRow.querySelectorAll("button").length).toBeGreaterThan(0);
  });

  it("handles preset selection, input edits, and export/import flows", () => {
    const refs = {
      themePresetSelect: document.createElement("select"),
      themeResetBtn: document.createElement("button"),
      themeRandomizeBtn: document.createElement("button"),
      themeRandomAccentBtn: document.createElement("button"),
      themePaletteRow: document.createElement("div"),
      themeEditor: document.createElement("div"),
      themeStatus: document.createElement("div"),
      themeExportBtn: document.createElement("button"),
      themeImportBtn: document.createElement("button"),
      themeExportField: document.createElement("textarea")
    };

    Object.values(refs).forEach((el) => document.body.append(el));

    const applySpy = vi.fn();
    const result = initThemeEditor({ refs, config: baseConfig, onApply: applySpy });

    refs.themePresetSelect.value = "custom";
    refs.themePresetSelect.dispatchEvent(new window.Event("change"));
    expect(refs.themeStatus.textContent).toContain("Custom theme applied");

    const colorInput = refs.themeEditor.querySelector("input[type=\"color\"]");
    colorInput.value = "#123456";
    colorInput.dispatchEvent(new window.Event("input", { bubbles: true }));

    const rangeInput = refs.themeEditor.querySelector("input[type=\"range\"]");
    rangeInput.value = "0.2";
    rangeInput.dispatchEvent(new window.Event("input", { bubbles: true }));

    const toggleInput = refs.themeEditor.querySelector("input[type=\"checkbox\"]");
    toggleInput.checked = false;
    toggleInput.dispatchEvent(new window.Event("input", { bubbles: true }));

    expect(applySpy).toHaveBeenCalled();

    refs.themeRandomizeBtn.click();
    refs.themeRandomAccentBtn.click();
    refs.themeResetBtn.click();
    expect(refs.themeStatus.textContent).toContain("Theme set to");

    refs.themeExportBtn.click();
    expect(refs.themeExportField.value).toMatch(/\S+/);
    refs.themeImportBtn.click();
    expect(refs.themeStatus.textContent).toContain("Theme imported successfully");

    refs.themeExportField.value = "not-base64";
    refs.themeImportBtn.click();
    expect(refs.themeStatus.textContent).toContain("Import failed");

    expect(result.state.activeThemeId).toBeDefined();
  });
});
