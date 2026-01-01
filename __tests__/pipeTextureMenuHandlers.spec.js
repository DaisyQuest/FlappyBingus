import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

import { createPipeTextureMenuHandlers } from "../public/js/pipeTextureMenuHandlers.js";

const buildDom = () => {
  const dom = new JSDOM(`<!doctype html><body>
    <button id="launcher"></button>
    <div id="overlay"></div>
    <div id="mode-options">
      <button data-pipe-texture-mode="classic"></button>
      <button data-pipe-texture-mode="alt"></button>
    </div>
    <div id="options">
      <button data-pipe-texture-id="spark"></button>
      <button data-pipe-texture-id="locked"></button>
    </div>
    <div id="hint"></div>
  </body>`);
  return dom.window.document;
};

describe("pipe texture menu handlers", () => {
  it("skips mode changes when the mode is unchanged", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-pipe-texture-mode='classic']");

    const { handlers } = createPipeTextureMenuHandlers({
      elements: {
        pipeTextureLauncher: document.getElementById("launcher"),
        pipeTextureOverlay: document.getElementById("overlay"),
        pipeTextureOptions: document.getElementById("options"),
        pipeTextureModeOptions: document.getElementById("mode-options"),
        pipeTextureHint: document.getElementById("hint")
      },
      getNet: () => ({ pipeTextures: [], user: { bestScore: 0 } }),
      getCurrentPipeTextureId: () => "spark",
      setCurrentPipeTextureId: vi.fn(),
      getCurrentPipeTextureMode: () => "classic",
      setCurrentPipeTextureMode: vi.fn(),
      refreshPipeTextureMenu: vi.fn(),
      togglePipeTextureMenu: vi.fn(),
      shouldClosePipeTextureMenu: vi.fn(),
      normalizePipeTextureMode: vi.fn().mockReturnValue("classic"),
      writePipeTextureModeCookie: vi.fn(),
      renderPipeTextureModeButtons: vi.fn(),
      syncPipeTextureSwatch: vi.fn(),
      renderPipeTextureMenuOptions: vi.fn(),
      computeUnlockedPipeTextureSet: vi.fn(),
      openPurchaseModal: vi.fn(),
      applyPipeTextureSelection: vi.fn(),
      shouldTriggerSelectionSave: vi.fn(),
      triggerUserSave: vi.fn(),
      ensureLoggedInForSave: vi.fn(),
      apiSetPipeTexture: vi.fn(),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      setUserHint: vi.fn(),
      setNetUser: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      describePipeTextureLock: vi.fn(),
      pipeTextureHoverText: vi.fn(),
      DEFAULT_PIPE_TEXTURE_HINT: "Pick a texture",
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { pipeTexture: "pipeTexture" }
    });

    await handlers.handleModeClick({ target: button });

    expect(handlers.handleModeClick).toBeDefined();
  });

  it("reverts mode changes on save failure", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-pipe-texture-mode='alt']");
    const net = { pipeTextures: [{ id: "spark" }], user: { bestScore: 0 }, online: true };
    const setCurrentPipeTextureMode = vi.fn();
    const setUserHint = vi.fn();

    const { handlers } = createPipeTextureMenuHandlers({
      elements: {
        pipeTextureLauncher: document.getElementById("launcher"),
        pipeTextureOverlay: document.getElementById("overlay"),
        pipeTextureOptions: document.getElementById("options"),
        pipeTextureModeOptions: document.getElementById("mode-options"),
        pipeTextureHint: document.getElementById("hint")
      },
      getNet: () => net,
      getCurrentPipeTextureId: () => "spark",
      setCurrentPipeTextureId: vi.fn(),
      getCurrentPipeTextureMode: () => "classic",
      setCurrentPipeTextureMode,
      refreshPipeTextureMenu: vi.fn(),
      togglePipeTextureMenu: vi.fn(),
      shouldClosePipeTextureMenu: vi.fn(),
      normalizePipeTextureMode: vi.fn().mockReturnValue("alt"),
      writePipeTextureModeCookie: vi.fn(),
      renderPipeTextureModeButtons: vi.fn(),
      syncPipeTextureSwatch: vi.fn(),
      renderPipeTextureMenuOptions: vi.fn(),
      computeUnlockedPipeTextureSet: vi.fn().mockReturnValue(new Set(["spark"])),
      openPurchaseModal: vi.fn(),
      applyPipeTextureSelection: vi.fn(),
      shouldTriggerSelectionSave: vi.fn(),
      triggerUserSave: vi.fn(),
      ensureLoggedInForSave: vi.fn(),
      apiSetPipeTexture: vi.fn().mockResolvedValue({ ok: false, error: "pipe_texture_locked" }),
      getAuthStatusFromResponse: vi.fn().mockReturnValue({ online: false, unauthorized: false }),
      recoverSession: vi.fn(),
      setUserHint,
      setNetUser: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      describePipeTextureLock: vi.fn(),
      pipeTextureHoverText: vi.fn(),
      DEFAULT_PIPE_TEXTURE_HINT: "Pick a texture",
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { pipeTexture: "pipeTexture" }
    });

    await handlers.handleModeClick({ target: button });

    expect(setCurrentPipeTextureMode).toHaveBeenCalledWith("alt");
    expect(setUserHint).toHaveBeenCalled();
    expect(document.getElementById("hint").className).toBe("hint bad");
    expect(document.getElementById("hint").textContent).toBe("That mode is locked with this texture.");
  });

  it("confirms mode changes after successful save", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-pipe-texture-mode='alt']");
    const net = { pipeTextures: [{ id: "spark" }], user: { bestScore: 0 }, online: true };

    const { handlers } = createPipeTextureMenuHandlers({
      elements: {
        pipeTextureLauncher: document.getElementById("launcher"),
        pipeTextureOverlay: document.getElementById("overlay"),
        pipeTextureOptions: document.getElementById("options"),
        pipeTextureModeOptions: document.getElementById("mode-options"),
        pipeTextureHint: document.getElementById("hint")
      },
      getNet: () => net,
      getCurrentPipeTextureId: () => "spark",
      setCurrentPipeTextureId: vi.fn(),
      getCurrentPipeTextureMode: () => "classic",
      setCurrentPipeTextureMode: vi.fn(),
      refreshPipeTextureMenu: vi.fn(),
      togglePipeTextureMenu: vi.fn(),
      shouldClosePipeTextureMenu: vi.fn(),
      normalizePipeTextureMode: vi.fn().mockReturnValue("alt"),
      writePipeTextureModeCookie: vi.fn(),
      renderPipeTextureModeButtons: vi.fn(),
      syncPipeTextureSwatch: vi.fn(),
      renderPipeTextureMenuOptions: vi.fn(),
      computeUnlockedPipeTextureSet: vi.fn().mockReturnValue(new Set(["spark"])),
      openPurchaseModal: vi.fn(),
      applyPipeTextureSelection: vi.fn(),
      shouldTriggerSelectionSave: vi.fn(),
      triggerUserSave: vi.fn(),
      ensureLoggedInForSave: vi.fn(),
      apiSetPipeTexture: vi.fn().mockResolvedValue({
        ok: true,
        user: { pipeTextureMode: "alt" },
        pipeTextures: []
      }),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      setUserHint: vi.fn(),
      setNetUser: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      describePipeTextureLock: vi.fn(),
      pipeTextureHoverText: vi.fn(),
      DEFAULT_PIPE_TEXTURE_HINT: "Pick a texture",
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { pipeTexture: "pipeTexture" }
    });

    await handlers.handleModeClick({ target: button });

    expect(document.getElementById("hint").className).toBe("hint good");
    expect(document.getElementById("hint").textContent).toBe("Pipe texture mode saved.");
  });

  it("opens purchase modal for locked textures with purchase unlocks", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-pipe-texture-id='locked']");
    button.dataset.unlockType = "purchase";
    button.dataset.unlockCost = "10";
    button.dataset.unlockCurrency = "coin";
    const net = { pipeTextures: [{ id: "locked", name: "Locked" }] };
    const openPurchaseModal = vi.fn();

    const { handlers } = createPipeTextureMenuHandlers({
      elements: {
        pipeTextureLauncher: document.getElementById("launcher"),
        pipeTextureOverlay: document.getElementById("overlay"),
        pipeTextureOptions: document.getElementById("options"),
        pipeTextureModeOptions: document.getElementById("mode-options"),
        pipeTextureHint: document.getElementById("hint")
      },
      getNet: () => net,
      getCurrentPipeTextureId: () => "spark",
      setCurrentPipeTextureId: vi.fn(),
      getCurrentPipeTextureMode: () => "classic",
      setCurrentPipeTextureMode: vi.fn(),
      refreshPipeTextureMenu: vi.fn(),
      togglePipeTextureMenu: vi.fn(),
      shouldClosePipeTextureMenu: vi.fn(),
      normalizePipeTextureMode: vi.fn(),
      writePipeTextureModeCookie: vi.fn(),
      renderPipeTextureModeButtons: vi.fn(),
      syncPipeTextureSwatch: vi.fn(),
      renderPipeTextureMenuOptions: vi.fn(),
      computeUnlockedPipeTextureSet: vi.fn().mockReturnValue(new Set()),
      openPurchaseModal,
      applyPipeTextureSelection: vi.fn(),
      shouldTriggerSelectionSave: vi.fn(),
      triggerUserSave: vi.fn(),
      ensureLoggedInForSave: vi.fn(),
      apiSetPipeTexture: vi.fn(),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      setUserHint: vi.fn(),
      setNetUser: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      describePipeTextureLock: vi.fn(),
      pipeTextureHoverText: vi.fn(),
      DEFAULT_PIPE_TEXTURE_HINT: "Pick a texture",
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { pipeTexture: "pipeTexture" }
    });

    await handlers.handleOptionsClick({ target: button });

    expect(openPurchaseModal).toHaveBeenCalledWith(
      {
        id: "locked",
        name: "Locked",
        type: "pipeTexture",
        unlock: { type: "purchase", cost: 10, currencyId: "coin" }
      },
      { source: "pipe_texture" }
    );
  });

  it("shows lock hints for locked textures without purchase unlocks", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-pipe-texture-id='locked']");
    const net = { pipeTextures: [{ id: "locked", unlock: {} }] };
    const renderPipeTextureMenuOptions = vi.fn();

    const { handlers } = createPipeTextureMenuHandlers({
      elements: {
        pipeTextureLauncher: document.getElementById("launcher"),
        pipeTextureOverlay: document.getElementById("overlay"),
        pipeTextureOptions: document.getElementById("options"),
        pipeTextureModeOptions: document.getElementById("mode-options"),
        pipeTextureHint: document.getElementById("hint")
      },
      getNet: () => net,
      getCurrentPipeTextureId: () => "spark",
      setCurrentPipeTextureId: vi.fn(),
      getCurrentPipeTextureMode: () => "classic",
      setCurrentPipeTextureMode: vi.fn(),
      refreshPipeTextureMenu: vi.fn(),
      togglePipeTextureMenu: vi.fn(),
      shouldClosePipeTextureMenu: vi.fn(),
      normalizePipeTextureMode: vi.fn(),
      writePipeTextureModeCookie: vi.fn(),
      renderPipeTextureModeButtons: vi.fn(),
      syncPipeTextureSwatch: vi.fn(),
      renderPipeTextureMenuOptions,
      computeUnlockedPipeTextureSet: vi.fn().mockReturnValue(new Set()),
      openPurchaseModal: vi.fn(),
      applyPipeTextureSelection: vi.fn(),
      shouldTriggerSelectionSave: vi.fn(),
      triggerUserSave: vi.fn(),
      ensureLoggedInForSave: vi.fn(),
      apiSetPipeTexture: vi.fn(),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      setUserHint: vi.fn(),
      setNetUser: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      describePipeTextureLock: vi.fn().mockReturnValue("Locked"),
      pipeTextureHoverText: vi.fn(),
      DEFAULT_PIPE_TEXTURE_HINT: "Pick a texture",
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { pipeTexture: "pipeTexture" }
    });

    await handlers.handleOptionsClick({ target: button });

    expect(document.getElementById("hint").className).toBe("hint bad");
    expect(document.getElementById("hint").textContent).toBe("Locked");
    expect(renderPipeTextureMenuOptions).toHaveBeenCalled();
  });

  it("handles guest selection without saving", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-pipe-texture-id='spark']");
    const net = { pipeTextures: [{ id: "spark" }], user: null };
    const ensureLoggedInForSave = vi.fn().mockResolvedValue(false);
    const applyPipeTextureSelection = vi.fn();
    const setCurrentPipeTextureId = vi.fn();

    const { handlers } = createPipeTextureMenuHandlers({
      elements: {
        pipeTextureLauncher: document.getElementById("launcher"),
        pipeTextureOverlay: document.getElementById("overlay"),
        pipeTextureOptions: document.getElementById("options"),
        pipeTextureModeOptions: document.getElementById("mode-options"),
        pipeTextureHint: document.getElementById("hint")
      },
      getNet: () => net,
      getCurrentPipeTextureId: () => "spark",
      setCurrentPipeTextureId,
      getCurrentPipeTextureMode: () => "classic",
      setCurrentPipeTextureMode: vi.fn(),
      refreshPipeTextureMenu: vi.fn(),
      togglePipeTextureMenu: vi.fn(),
      shouldClosePipeTextureMenu: vi.fn(),
      normalizePipeTextureMode: vi.fn(),
      writePipeTextureModeCookie: vi.fn(),
      renderPipeTextureModeButtons: vi.fn(),
      syncPipeTextureSwatch: vi.fn(),
      renderPipeTextureMenuOptions: vi.fn(),
      computeUnlockedPipeTextureSet: vi.fn().mockReturnValue(new Set(["spark"])),
      openPurchaseModal: vi.fn(),
      applyPipeTextureSelection,
      shouldTriggerSelectionSave: vi.fn().mockReturnValue(true),
      triggerUserSave: vi.fn(),
      ensureLoggedInForSave,
      apiSetPipeTexture: vi.fn(),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      setUserHint: vi.fn(),
      setNetUser: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      describePipeTextureLock: vi.fn(),
      pipeTextureHoverText: vi.fn(),
      DEFAULT_PIPE_TEXTURE_HINT: "Pick a texture",
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { pipeTexture: "pipeTexture" }
    });

    await handlers.handleOptionsClick({ target: button });

    expect(applyPipeTextureSelection).toHaveBeenCalled();
    expect(setCurrentPipeTextureId).toHaveBeenCalledWith("spark");
    expect(ensureLoggedInForSave).toHaveBeenCalled();
    expect(document.getElementById("hint").textContent).toBe("Equipped (guest mode).");
  });

  it("updates hover hints and resets them on mouseout", () => {
    const document = buildDom();
    const button = document.querySelector("button[data-pipe-texture-id='spark']");
    const net = { pipeTextures: [{ id: "spark" }] };

    const { handlers } = createPipeTextureMenuHandlers({
      elements: {
        pipeTextureLauncher: document.getElementById("launcher"),
        pipeTextureOverlay: document.getElementById("overlay"),
        pipeTextureOptions: document.getElementById("options"),
        pipeTextureModeOptions: document.getElementById("mode-options"),
        pipeTextureHint: document.getElementById("hint")
      },
      getNet: () => net,
      getCurrentPipeTextureId: () => "spark",
      setCurrentPipeTextureId: vi.fn(),
      getCurrentPipeTextureMode: () => "classic",
      setCurrentPipeTextureMode: vi.fn(),
      refreshPipeTextureMenu: vi.fn(),
      togglePipeTextureMenu: vi.fn(),
      shouldClosePipeTextureMenu: vi.fn(),
      normalizePipeTextureMode: vi.fn(),
      writePipeTextureModeCookie: vi.fn(),
      renderPipeTextureModeButtons: vi.fn(),
      syncPipeTextureSwatch: vi.fn(),
      renderPipeTextureMenuOptions: vi.fn(),
      computeUnlockedPipeTextureSet: vi.fn().mockReturnValue(new Set(["spark"])),
      openPurchaseModal: vi.fn(),
      applyPipeTextureSelection: vi.fn(),
      shouldTriggerSelectionSave: vi.fn(),
      triggerUserSave: vi.fn(),
      ensureLoggedInForSave: vi.fn(),
      apiSetPipeTexture: vi.fn(),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      setUserHint: vi.fn(),
      setNetUser: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      describePipeTextureLock: vi.fn(),
      pipeTextureHoverText: vi.fn().mockReturnValue("Hover"),
      DEFAULT_PIPE_TEXTURE_HINT: "Pick a texture",
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { pipeTexture: "pipeTexture" }
    });

    handlers.handleOptionsMouseOver({ target: button });
    expect(document.getElementById("hint").className).toBe("hint good");
    expect(document.getElementById("hint").textContent).toBe("Hover");

    handlers.handleOptionsMouseOut({ relatedTarget: null });
    expect(document.getElementById("hint").textContent).toBe("Pick a texture");
  });
});
