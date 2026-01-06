/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { createIconMenuHandlers } from "../iconMenuHandlers.js";

function buildElements() {
  const iconOptions = document.createElement("div");
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.iconId = "spark";
  iconOptions.append(button);

  return {
    iconOptions,
    iconHint: document.createElement("div"),
    iconLauncher: document.createElement("button"),
    iconOverlay: document.createElement("div"),
    iconOverlayClose: document.createElement("button"),
    button
  };
}

describe("icon menu handlers", () => {
  it("optimistically updates the selected icon for logged-in users", async () => {
    const elements = buildElements();
    const net = {
      user: { username: "pilot", selectedIcon: "old" },
      online: true,
      trails: [],
      icons: [],
      pipeTextures: []
    };

    const setNetUser = vi.fn();
    const applyIconSelection = vi.fn();
    const refreshIconMenu = vi.fn();
    const apiSetIcon = vi.fn().mockResolvedValue({
      ok: true,
      user: { username: "pilot", selectedIcon: "spark" },
      trails: [],
      icons: [],
      pipeTextures: []
    });

    const handlers = createIconMenuHandlers({
      elements,
      getNet: () => net,
      getPlayerIcons: () => [{ id: "spark", name: "Spark" }],
      getCurrentIconId: () => "old",
      getIconMenuState: () => ({ unlocked: new Set(["spark"]) }),
      openPurchaseModal: vi.fn(),
      applyIconSelection,
      apiSetIcon,
      classifyIconSaveResponse: vi.fn(() => ({
        outcome: "saved",
        online: true,
        revert: false,
        needsReauth: false,
        message: "Icon saved."
      })),
      setNetUser,
      mergeTrailCatalog: vi.fn((trails) => trails),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      refreshIconMenu,
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn(() => "Locked"),
      iconHoverText: vi.fn(() => "Hover"),
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { playerTexture: "player_texture" }
    });

    await handlers.handlers.handleOptionsClick({ target: elements.button });

    expect(setNetUser).toHaveBeenCalled();
    expect(setNetUser.mock.calls[0][0]?.selectedIcon).toBe("spark");
    expect(applyIconSelection).toHaveBeenCalledWith("spark", expect.any(Array), expect.any(Set));
    expect(apiSetIcon).toHaveBeenCalledWith("spark");
  });

  it("opens the purchase modal when a locked icon is purchasable", async () => {
    const elements = buildElements();
    elements.button.dataset.unlockType = "purchase";
    elements.button.dataset.unlockCost = "12";
    elements.button.dataset.unlockCurrency = "bustercoin";
    const net = { user: null, online: true, trails: [], icons: [], pipeTextures: [] };
    const openPurchaseModal = vi.fn();

    const handlers = createIconMenuHandlers({
      elements,
      getNet: () => net,
      getPlayerIcons: () => [{ id: "spark", name: "Spark", unlock: { type: "purchase" } }],
      getCurrentIconId: () => "old",
      getIconMenuState: () => ({ unlocked: new Set() }),
      openPurchaseModal,
      applyIconSelection: vi.fn(),
      apiSetIcon: vi.fn(),
      classifyIconSaveResponse: vi.fn(),
      setNetUser: vi.fn(),
      mergeTrailCatalog: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      refreshIconMenu: vi.fn(),
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn(() => "Locked"),
      iconHoverText: vi.fn(() => "Hover"),
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { playerTexture: "player_texture" }
    });

    await handlers.handlers.handleOptionsClick({ target: elements.button });

    expect(openPurchaseModal).toHaveBeenCalledWith(expect.objectContaining({
      id: "spark",
      name: "Spark",
      type: "player_texture",
      unlock: expect.objectContaining({ cost: 12, currencyId: "bustercoin" })
    }), { source: "icon" });
  });

  it("shows a lock hint and refreshes when the icon is locked", async () => {
    const elements = buildElements();
    const net = { user: null, online: true, trails: [], icons: [], pipeTextures: [] };
    const refreshIconMenu = vi.fn();

    const handlers = createIconMenuHandlers({
      elements,
      getNet: () => net,
      getPlayerIcons: () => [{ id: "spark", name: "Spark", unlock: { type: "score", minScore: 10 } }],
      getCurrentIconId: () => "old",
      getIconMenuState: () => ({ unlocked: new Set() }),
      openPurchaseModal: vi.fn(),
      applyIconSelection: vi.fn(),
      apiSetIcon: vi.fn(),
      classifyIconSaveResponse: vi.fn(),
      setNetUser: vi.fn(),
      mergeTrailCatalog: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      refreshIconMenu,
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn(() => "Locked: Reach score 10"),
      iconHoverText: vi.fn(() => "Hover"),
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { playerTexture: "player_texture" }
    });

    await handlers.handlers.handleOptionsClick({ target: elements.button });

    expect(elements.iconHint.textContent).toBe("Locked: Reach score 10");
    expect(elements.iconHint.className).toBe("hint bad");
    expect(refreshIconMenu).toHaveBeenCalled();
  });

  it("reverts when the selected icon is unavailable after save checks", async () => {
    const elements = buildElements();
    const net = { user: { username: "pilot" }, online: true, trails: [], icons: [], pipeTextures: [] };
    const getPlayerIcons = vi.fn()
      .mockReturnValueOnce([{ id: "spark", name: "Spark" }])
      .mockReturnValueOnce([]);
    const getIconMenuState = vi.fn()
      .mockReturnValueOnce({ unlocked: new Set(["spark"]) })
      .mockReturnValueOnce({ unlocked: new Set() });
    const applyIconSelection = vi.fn();
    const refreshIconMenu = vi.fn();

    const handlers = createIconMenuHandlers({
      elements,
      getNet: () => net,
      getPlayerIcons,
      getCurrentIconId: () => "old",
      getIconMenuState,
      openPurchaseModal: vi.fn(),
      applyIconSelection,
      apiSetIcon: vi.fn(),
      classifyIconSaveResponse: vi.fn(),
      setNetUser: vi.fn(),
      mergeTrailCatalog: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      refreshIconMenu,
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn(() => "Locked"),
      iconHoverText: vi.fn(() => "Hover"),
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { playerTexture: "player_texture" }
    });

    await handlers.handlers.handleOptionsClick({ target: elements.button });

    expect(applyIconSelection).toHaveBeenLastCalledWith("old", [], expect.any(Set));
    expect(elements.iconHint.textContent).toBe("That icon is unavailable.");
    expect(refreshIconMenu).toHaveBeenCalled();
  });

  it("handles saved responses and refreshes catalogs", async () => {
    const elements = buildElements();
    const net = {
      user: { username: "pilot", selectedIcon: "old" },
      online: true,
      trails: [],
      icons: [],
      pipeTextures: []
    };
    const applyIconSelection = vi.fn();
    const setNetUser = vi.fn();
    const syncUnlockablesCatalog = vi.fn();
    const syncIconCatalog = vi.fn();
    const syncPipeTextureCatalog = vi.fn();
    const apiSetIcon = vi.fn().mockResolvedValue({
      ok: true,
      user: { username: "pilot", selectedIcon: "spark" },
      trails: [{ id: "classic" }],
      icons: [{ id: "spark" }],
      pipeTextures: [{ id: "basic" }]
    });

    const handlers = createIconMenuHandlers({
      elements,
      getNet: () => net,
      getPlayerIcons: () => [{ id: "spark", name: "Spark" }],
      getCurrentIconId: () => "old",
      getIconMenuState: () => ({ unlocked: new Set(["spark"]) }),
      openPurchaseModal: vi.fn(),
      applyIconSelection,
      apiSetIcon,
      classifyIconSaveResponse: vi.fn(() => ({
        outcome: "saved",
        online: true,
        revert: false,
        needsReauth: false,
        message: "Icon saved."
      })),
      setNetUser,
      mergeTrailCatalog: vi.fn((trails) => trails),
      syncUnlockablesCatalog,
      syncIconCatalog,
      syncPipeTextureCatalog,
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      refreshIconMenu: vi.fn(),
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn(() => "Locked"),
      iconHoverText: vi.fn(() => "Hover"),
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { playerTexture: "player_texture" }
    });

    await handlers.handlers.handleOptionsClick({ target: elements.button });

    expect(setNetUser).toHaveBeenCalledWith({ username: "pilot", selectedIcon: "spark" });
    expect(syncUnlockablesCatalog).toHaveBeenCalled();
    expect(syncIconCatalog).toHaveBeenCalledWith([{ id: "spark" }]);
    expect(syncPipeTextureCatalog).toHaveBeenCalledWith([{ id: "basic" }]);
    expect(applyIconSelection).toHaveBeenCalledWith("spark", expect.any(Array));
  });

  it("reverts on failed save responses and triggers reauth", async () => {
    const elements = buildElements();
    const net = { user: { username: "pilot" }, online: true, trails: [], icons: [], pipeTextures: [] };
    const applyIconSelection = vi.fn();
    const recoverSession = vi.fn();
    const setUserHint = vi.fn();

    const handlers = createIconMenuHandlers({
      elements,
      getNet: () => net,
      getPlayerIcons: () => [{ id: "spark", name: "Spark" }],
      getCurrentIconId: () => "old",
      getIconMenuState: () => ({ unlocked: new Set(["spark"]) }),
      openPurchaseModal: vi.fn(),
      applyIconSelection,
      apiSetIcon: vi.fn(),
      classifyIconSaveResponse: vi.fn(() => ({
        outcome: "failed",
        online: false,
        revert: true,
        needsReauth: true,
        message: "Icon failed."
      })),
      setNetUser: vi.fn(),
      mergeTrailCatalog: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint,
      recoverSession,
      refreshIconMenu: vi.fn(),
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn(() => "Locked"),
      iconHoverText: vi.fn(() => "Hover"),
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { playerTexture: "player_texture" }
    });

    await handlers.handlers.handleOptionsClick({ target: elements.button });

    expect(recoverSession).toHaveBeenCalled();
    expect(setUserHint).toHaveBeenCalledWith({ allowReauth: false });
    expect(applyIconSelection).toHaveBeenCalledWith("old", expect.any(Array));
    expect(elements.iconHint.textContent).toBe("Icon failed.");
  });

  it("skips server saves for guests and keeps the local selection", async () => {
    const elements = buildElements();
    const net = { user: null, online: true, trails: [], icons: [], pipeTextures: [] };
    const applyIconSelection = vi.fn();
    const apiSetIcon = vi.fn();
    const classifyIconSaveResponse = vi.fn();

    const handlers = createIconMenuHandlers({
      elements,
      getNet: () => net,
      getPlayerIcons: () => [{ id: "spark", name: "Spark" }],
      getCurrentIconId: () => "old",
      getIconMenuState: () => ({ unlocked: new Set(["spark"]) }),
      openPurchaseModal: vi.fn(),
      applyIconSelection,
      apiSetIcon,
      classifyIconSaveResponse,
      setNetUser: vi.fn(),
      mergeTrailCatalog: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      refreshIconMenu: vi.fn(),
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn(() => "Locked"),
      iconHoverText: vi.fn(() => "Hover"),
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { playerTexture: "player_texture" }
    });

    await handlers.handlers.handleOptionsClick({ target: elements.button });

    expect(applyIconSelection).toHaveBeenCalledWith("spark", expect.any(Array), expect.any(Set));
    expect(elements.iconHint.textContent).toBe("Equipped (guest mode). Sign in to save.");
    expect(apiSetIcon).not.toHaveBeenCalled();
    expect(classifyIconSaveResponse).not.toHaveBeenCalled();
  });

  it("shows hover hints based on unlock state", () => {
    const elements = buildElements();
    const net = { user: null, online: true, trails: [], icons: [], pipeTextures: [] };

    const handlers = createIconMenuHandlers({
      elements,
      getNet: () => net,
      getPlayerIcons: () => [{ id: "spark", name: "Spark" }],
      getCurrentIconId: () => "old",
      computeUnlockedIconSet: () => new Set(["spark"]),
      openPurchaseModal: vi.fn(),
      applyIconSelection: vi.fn(),
      apiSetIcon: vi.fn(),
      classifyIconSaveResponse: vi.fn(),
      setNetUser: vi.fn(),
      mergeTrailCatalog: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      refreshIconMenu: vi.fn(),
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn(() => "Locked"),
      iconHoverText: vi.fn(() => "Hover text"),
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { playerTexture: "player_texture" }
    });

    handlers.handlers.handleOptionsMouseOver({ target: elements.button });

    expect(elements.iconHint.textContent).toBe("Hover text");
  });

  it("avoids duplicate icon saves while a request is in flight", async () => {
    const elements = buildElements();
    const net = {
      user: { username: "pilot", selectedIcon: "old" },
      online: true,
      trails: [],
      icons: [],
      pipeTextures: []
    };
    let resolveSave;
    const apiSetIcon = vi.fn(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));

    const handlers = createIconMenuHandlers({
      elements,
      getNet: () => net,
      getPlayerIcons: () => [{ id: "spark", name: "Spark" }],
      getCurrentIconId: () => "old",
      getIconMenuState: () => ({ unlocked: new Set(["spark"]) }),
      openPurchaseModal: vi.fn(),
      applyIconSelection: vi.fn(),
      apiSetIcon,
      classifyIconSaveResponse: vi.fn(() => ({
        outcome: "saved",
        online: true,
        revert: false,
        needsReauth: false,
        message: "Icon saved."
      })),
      setNetUser: vi.fn(),
      mergeTrailCatalog: vi.fn((trails) => trails),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      refreshIconMenu: vi.fn(),
      toggleIconMenu: vi.fn(),
      resetIconHint: vi.fn(),
      describeIconLock: vi.fn(() => "Locked"),
      iconHoverText: vi.fn(() => "Hover"),
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { playerTexture: "player_texture" }
    });

    const first = handlers.handlers.handleOptionsClick({ target: elements.button });
    await Promise.resolve();
    const second = handlers.handlers.handleOptionsClick({ target: elements.button });

    expect(apiSetIcon).toHaveBeenCalledTimes(1);

    resolveSave({
      ok: true,
      user: { username: "pilot", selectedIcon: "spark" },
      trails: [],
      icons: [],
      pipeTextures: []
    });

    await first;
    await second;
  });
});
