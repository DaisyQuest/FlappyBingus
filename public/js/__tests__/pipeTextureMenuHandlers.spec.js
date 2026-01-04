/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { createPipeTextureMenuHandlers } from "../pipeTextureMenuHandlers.js";

function buildElements() {
  const pipeTextureOptions = document.createElement("div");
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.pipeTextureId = "gold";
  pipeTextureOptions.append(button);

  const pipeTextureModeOptions = document.createElement("div");
  const modeButton = document.createElement("button");
  modeButton.type = "button";
  modeButton.dataset.pipeTextureMode = "HIGH";
  pipeTextureModeOptions.append(modeButton);

  return {
    pipeTextureLauncher: document.createElement("button"),
    pipeTextureOverlay: document.createElement("div"),
    pipeTextureOptions,
    pipeTextureModeOptions,
    pipeTextureHint: document.createElement("div"),
    button,
    modeButton
  };
}

describe("pipe texture menu handlers", () => {
  it("avoids duplicate pipe texture saves while a request is in flight", async () => {
    const elements = buildElements();
    const net = {
      user: { username: "pilot" },
      online: true,
      pipeTextures: [{ id: "basic" }, { id: "gold" }]
    };
    let currentId = "basic";
    let currentMode = "NORMAL";
    let resolveSave;
    const apiSetPipeTexture = vi.fn(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));

    const handlers = createPipeTextureMenuHandlers({
      elements,
      getNet: () => net,
      getCurrentPipeTextureId: () => currentId,
      setCurrentPipeTextureId: (id) => { currentId = id; },
      getCurrentPipeTextureMode: () => currentMode,
      setCurrentPipeTextureMode: (mode) => { currentMode = mode; },
      refreshPipeTextureMenu: vi.fn(),
      togglePipeTextureMenu: vi.fn(),
      shouldClosePipeTextureMenu: vi.fn(() => false),
      normalizePipeTextureMode: (mode) => mode,
      writePipeTextureModeCookie: vi.fn(),
      renderPipeTextureModeButtons: vi.fn(),
      syncPipeTextureSwatch: vi.fn(),
      renderPipeTextureMenuOptions: vi.fn(),
      computeUnlockedPipeTextureSet: () => new Set(["gold", "basic"]),
      openPurchaseModal: vi.fn(),
      applyPipeTextureSelection: vi.fn(),
      shouldTriggerSelectionSave: () => true,
      ensureLoggedInForSave: vi.fn().mockResolvedValue(true),
      apiSetPipeTexture,
      getAuthStatusFromResponse: vi.fn(() => ({ online: true, unauthorized: false })),
      recoverSession: vi.fn(),
      setUserHint: vi.fn(),
      setNetUser: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      describePipeTextureLock: vi.fn(),
      pipeTextureHoverText: vi.fn(),
      DEFAULT_PIPE_TEXTURE_HINT: "hint",
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { pipeTexture: "pipe_texture" }
    });

    const first = handlers.handlers.handleOptionsClick({ target: elements.button });
    await Promise.resolve();
    const second = handlers.handlers.handleOptionsClick({ target: elements.button });

    expect(apiSetPipeTexture).toHaveBeenCalledTimes(1);

    resolveSave({ ok: true, user: { username: "pilot" }, pipeTextures: net.pipeTextures });
    await first;
    await second;
  });

  it("skips mode saves when selection saves are disabled", async () => {
    const elements = buildElements();
    const net = {
      user: { username: "pilot" },
      online: true,
      pipeTextures: [{ id: "basic" }]
    };
    let currentId = "basic";
    let currentMode = "NORMAL";
    const apiSetPipeTexture = vi.fn();

    const handlers = createPipeTextureMenuHandlers({
      elements,
      getNet: () => net,
      getCurrentPipeTextureId: () => currentId,
      setCurrentPipeTextureId: (id) => { currentId = id; },
      getCurrentPipeTextureMode: () => currentMode,
      setCurrentPipeTextureMode: (mode) => { currentMode = mode; },
      refreshPipeTextureMenu: vi.fn(),
      togglePipeTextureMenu: vi.fn(),
      shouldClosePipeTextureMenu: vi.fn(() => false),
      normalizePipeTextureMode: (mode) => mode,
      writePipeTextureModeCookie: vi.fn(),
      renderPipeTextureModeButtons: vi.fn(),
      syncPipeTextureSwatch: vi.fn(),
      renderPipeTextureMenuOptions: vi.fn(),
      computeUnlockedPipeTextureSet: () => new Set(["basic"]),
      openPurchaseModal: vi.fn(),
      applyPipeTextureSelection: vi.fn(),
      shouldTriggerSelectionSave: () => false,
      ensureLoggedInForSave: vi.fn().mockResolvedValue(true),
      apiSetPipeTexture,
      getAuthStatusFromResponse: vi.fn(() => ({ online: true, unauthorized: false })),
      recoverSession: vi.fn(),
      setUserHint: vi.fn(),
      setNetUser: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      describePipeTextureLock: vi.fn(),
      pipeTextureHoverText: vi.fn(),
      DEFAULT_PIPE_TEXTURE_HINT: "hint",
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { pipeTexture: "pipe_texture" }
    });

    await handlers.handlers.handleModeClick({ target: elements.modeButton });

    expect(apiSetPipeTexture).not.toHaveBeenCalled();
  });

  it("skips texture saves when selection saves are disabled", async () => {
    const elements = buildElements();
    const net = {
      user: { username: "pilot" },
      online: true,
      pipeTextures: [{ id: "basic" }, { id: "gold" }]
    };
    let currentId = "gold";
    let currentMode = "NORMAL";
    const apiSetPipeTexture = vi.fn();

    const handlers = createPipeTextureMenuHandlers({
      elements,
      getNet: () => net,
      getCurrentPipeTextureId: () => currentId,
      setCurrentPipeTextureId: (id) => { currentId = id; },
      getCurrentPipeTextureMode: () => currentMode,
      setCurrentPipeTextureMode: (mode) => { currentMode = mode; },
      refreshPipeTextureMenu: vi.fn(),
      togglePipeTextureMenu: vi.fn(),
      shouldClosePipeTextureMenu: vi.fn(() => false),
      normalizePipeTextureMode: (mode) => mode,
      writePipeTextureModeCookie: vi.fn(),
      renderPipeTextureModeButtons: vi.fn(),
      syncPipeTextureSwatch: vi.fn(),
      renderPipeTextureMenuOptions: vi.fn(),
      computeUnlockedPipeTextureSet: () => new Set(["basic", "gold"]),
      openPurchaseModal: vi.fn(),
      applyPipeTextureSelection: vi.fn(),
      shouldTriggerSelectionSave: () => false,
      ensureLoggedInForSave: vi.fn().mockResolvedValue(true),
      apiSetPipeTexture,
      getAuthStatusFromResponse: vi.fn(() => ({ online: true, unauthorized: false })),
      recoverSession: vi.fn(),
      setUserHint: vi.fn(),
      setNetUser: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      describePipeTextureLock: vi.fn(),
      pipeTextureHoverText: vi.fn(),
      DEFAULT_PIPE_TEXTURE_HINT: "hint",
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { pipeTexture: "pipe_texture" }
    });

    await handlers.handlers.handleOptionsClick({ target: elements.button });

    expect(apiSetPipeTexture).not.toHaveBeenCalled();
  });
});
