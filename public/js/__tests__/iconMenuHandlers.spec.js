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
      computeUnlockedIconSet: () => new Set(["spark"]),
      openPurchaseModal: vi.fn(),
      applyIconSelection,
      ensureLoggedInForSave: vi.fn().mockResolvedValue(true),
      apiSetIcon,
      classifyIconSaveResponse: vi.fn(() => ({
        outcome: "saved",
        online: true,
        revert: false,
        needsReauth: false,
        message: "Icon saved."
      })),
      setNetUser,
      normalizeTrails: vi.fn((trails) => trails),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      setUserHint: vi.fn(),
      recoverSession: vi.fn(),
      renderIconOptions: vi.fn(),
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
});
