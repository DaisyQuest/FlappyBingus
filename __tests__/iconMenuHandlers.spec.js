import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

import { createIconMenuHandlers } from "../public/js/iconMenuHandlers.js";

const buildDom = () => {
  const dom = new JSDOM(`<!doctype html><body>
    <div id="options">
      <button data-icon-id="spark"></button>
      <button data-icon-id="locked"></button>
    </div>
    <div id="hint"></div>
    <button id="launcher"></button>
    <div id="overlay"></div>
    <button id="overlay-close"></button>
  </body>`, { url: "http://localhost" });
  return dom.window.document;
};

describe("icon menu handlers", () => {
  it("handles unlocked icon selection and save flow", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-icon-id='spark']");
    const net = {
      user: { bestScore: 5 },
      trails: [],
      icons: []
    };
    const applyIconSelection = vi.fn();
    const apiSetIcon = vi.fn().mockResolvedValue({ ok: true, user: { selectedIcon: "spark" } });
    const classifyIconSaveResponse = vi.fn().mockReturnValue({
      outcome: "saved",
      online: true,
      needsReauth: false,
      message: "Saved"
    });

    const { handlers } = createIconMenuHandlers({
      elements: {
        iconOptions: document.getElementById("options"),
        iconHint: document.getElementById("hint"),
        iconLauncher: document.getElementById("launcher"),
        iconOverlay: document.getElementById("overlay"),
        iconOverlayClose: document.getElementById("overlay-close")
      },
      getNet: () => net,
      getPlayerIcons: () => [{ id: "spark", name: "Spark" }],
      getCurrentIconId: () => "spark",
      computeUnlockedIconSet: vi.fn().mockReturnValue(new Set(["spark"])),
      openPurchaseModal: vi.fn(),
      applyIconSelection,
      ensureLoggedInForSave: vi.fn(),
      apiSetIcon,
      classifyIconSaveResponse,
      setNetUser: vi.fn((user) => { net.user = user; }),
      normalizeTrails: vi.fn().mockReturnValue([]),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      renderIconOptions: vi.fn(),
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn(),
      iconHoverText: vi.fn(),
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { playerTexture: "playerTexture" }
    });

    await handlers.handleOptionsClick({ target: button });

    expect(applyIconSelection).toHaveBeenCalledWith(
      "spark",
      [{ id: "spark", name: "Spark" }],
      expect.any(Set)
    );
    expect(apiSetIcon).toHaveBeenCalledWith("spark");
    expect(classifyIconSaveResponse).toHaveBeenCalled();
    expect(document.getElementById("hint").className).toBe("hint good");
    expect(document.getElementById("hint").textContent).toBe("Saved");
  });

  it("opens purchase modal for locked icons with purchase unlocks", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-icon-id='locked']");
    button.dataset.unlockType = "purchase";
    button.dataset.unlockCost = "12";
    button.dataset.unlockCurrency = "coin";
    const openPurchaseModal = vi.fn();

    const { handlers } = createIconMenuHandlers({
      elements: {
        iconOptions: document.getElementById("options"),
        iconHint: document.getElementById("hint"),
        iconLauncher: null,
        iconOverlay: null,
        iconOverlayClose: null
      },
      getNet: () => ({ user: { bestScore: 0 } }),
      getPlayerIcons: () => [{ id: "locked", name: "Locked" }],
      getCurrentIconId: () => "spark",
      computeUnlockedIconSet: vi.fn().mockReturnValue(new Set()),
      openPurchaseModal,
      applyIconSelection: vi.fn(),
      ensureLoggedInForSave: vi.fn(),
      apiSetIcon: vi.fn(),
      classifyIconSaveResponse: vi.fn(),
      setNetUser: vi.fn(),
      normalizeTrails: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      renderIconOptions: vi.fn(),
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn(),
      iconHoverText: vi.fn(),
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { playerTexture: "playerTexture" }
    });

    await handlers.handleOptionsClick({ target: button });

    expect(openPurchaseModal).toHaveBeenCalledWith(
      {
        id: "locked",
        name: "Locked",
        type: "playerTexture",
        unlock: { type: "purchase", cost: 12, currencyId: "coin" }
      },
      { source: "icon" }
    );
  });

  it("shows lock hints for locked icons without purchase unlocks", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-icon-id='locked']");
    const renderIconOptions = vi.fn();

    const { handlers } = createIconMenuHandlers({
      elements: {
        iconOptions: document.getElementById("options"),
        iconHint: document.getElementById("hint"),
        iconLauncher: null,
        iconOverlay: null,
        iconOverlayClose: null
      },
      getNet: () => ({ user: { bestScore: 0 } }),
      getPlayerIcons: () => [{ id: "locked", unlock: {} }],
      getCurrentIconId: () => "spark",
      computeUnlockedIconSet: vi.fn().mockReturnValue(new Set()),
      openPurchaseModal: vi.fn(),
      applyIconSelection: vi.fn(),
      ensureLoggedInForSave: vi.fn(),
      apiSetIcon: vi.fn(),
      classifyIconSaveResponse: vi.fn(),
      setNetUser: vi.fn(),
      normalizeTrails: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      renderIconOptions,
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn().mockReturnValue("Locked"),
      iconHoverText: vi.fn(),
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { playerTexture: "playerTexture" }
    });

    await handlers.handleOptionsClick({ target: button });

    expect(document.getElementById("hint").className).toBe("hint bad");
    expect(document.getElementById("hint").textContent).toBe("Locked");
    expect(renderIconOptions).toHaveBeenCalled();
  });

  it("updates hover hints and clears them on mouseout", () => {
    const document = buildDom();
    const button = document.querySelector("button[data-icon-id='spark']");
    const resetIconHint = vi.fn();

    const { handlers } = createIconMenuHandlers({
      elements: {
        iconOptions: document.getElementById("options"),
        iconHint: document.getElementById("hint"),
        iconLauncher: null,
        iconOverlay: null,
        iconOverlayClose: null
      },
      getNet: () => ({ user: { bestScore: 0 } }),
      getPlayerIcons: () => [{ id: "spark" }],
      getCurrentIconId: () => "spark",
      computeUnlockedIconSet: vi.fn().mockReturnValue(new Set(["spark"])),
      openPurchaseModal: vi.fn(),
      applyIconSelection: vi.fn(),
      ensureLoggedInForSave: vi.fn(),
      apiSetIcon: vi.fn(),
      classifyIconSaveResponse: vi.fn(),
      setNetUser: vi.fn(),
      normalizeTrails: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      renderIconOptions: vi.fn(),
      toggleIconMenu: vi.fn(),
      resetIconHint,
      describeIconLock: vi.fn(),
      iconHoverText: vi.fn().mockReturnValue("Hover"),
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { playerTexture: "playerTexture" }
    });

    handlers.handleOptionsMouseOver({ target: button });
    expect(document.getElementById("hint").className).toBe("hint good");
    expect(document.getElementById("hint").textContent).toBe("Hover");

    handlers.handleOptionsMouseOut({ relatedTarget: null });
    expect(resetIconHint).toHaveBeenCalledWith(document.getElementById("hint"));
  });

  it("reverts selection and flags failures", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-icon-id='spark']");
    const net = { user: { bestScore: 0 } };
    const applyIconSelection = vi.fn();
    const setUserHint = vi.fn();

    const { handlers } = createIconMenuHandlers({
      elements: {
        iconOptions: document.getElementById("options"),
        iconHint: document.getElementById("hint"),
        iconLauncher: null,
        iconOverlay: null,
        iconOverlayClose: null
      },
      getNet: () => net,
      getPlayerIcons: () => [{ id: "spark" }],
      getCurrentIconId: () => "spark",
      computeUnlockedIconSet: vi.fn().mockReturnValue(new Set(["spark"])),
      openPurchaseModal: vi.fn(),
      applyIconSelection,
      ensureLoggedInForSave: vi.fn(),
      apiSetIcon: vi.fn().mockResolvedValue({ ok: false }),
      classifyIconSaveResponse: vi.fn().mockReturnValue({
        outcome: "failed",
        online: false,
        needsReauth: true,
        revert: true,
        message: "Failed"
      }),
      setNetUser: vi.fn(),
      normalizeTrails: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint,
      recoverSession: vi.fn(),
      renderIconOptions: vi.fn(),
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn(),
      iconHoverText: vi.fn(),
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { playerTexture: "playerTexture" }
    });

    await handlers.handleOptionsClick({ target: button });

    expect(applyIconSelection).toHaveBeenCalledWith(
      "spark",
      [{ id: "spark" }],
      expect.any(Set)
    );
    expect(setUserHint).toHaveBeenCalled();
    expect(document.getElementById("hint").className).toBe("hint bad");
    expect(document.getElementById("hint").textContent).toBe("Failed");
  });
});
