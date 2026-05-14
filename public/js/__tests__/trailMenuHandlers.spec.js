/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { createTrailMenuHandlers } from "../trailMenuHandlers.js";

function buildElements() {
  const trailOptions = document.createElement("div");
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.trailId = "classic";
  trailOptions.append(button);

  return {
    trailLauncher: document.createElement("button"),
    trailOverlay: document.createElement("div"),
    trailOverlayClose: document.createElement("button"),
    trailOptions,
    button
  };
}

describe("trail menu handlers", () => {
  it("avoids duplicate trail saves while a request is in flight", async () => {
    const elements = buildElements();
    const net = {
      user: { username: "pilot", selectedTrail: "old" },
      online: true,
      trails: [{ id: "classic" }],
      icons: [],
      pipeTextures: []
    };
    let resolveSave;
    const apiSetTrail = vi.fn(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));
    const handleTrailSaveResponse = vi.fn().mockResolvedValue();

    const handlers = createTrailMenuHandlers({
      elements,
      getNet: () => net,
      getCurrentTrailId: () => "old",
      getCurrentIconId: () => "icon",
      getPlayerIcons: () => [{ id: "icon" }],
      getLastTrailHint: vi.fn(),
      apiSetTrail,
      refreshTrailMenu: vi.fn(),
      toggleTrailMenu: vi.fn(),
      setTrailHint: vi.fn(),
      applyTrailSelection: vi.fn(),
      openPurchaseModal: vi.fn(),
      handleTrailSaveResponse,
      setNetUser: vi.fn(),
      setUserHint: vi.fn(),
      buildTrailHint: vi.fn(),
      mergeTrailCatalog: vi.fn((trails) => trails),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      applyIconSelection: vi.fn(),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      getTrailMenuState: () => ({
        orderedTrails: [{ id: "classic" }],
        unlocked: new Set(["classic"]),
        bestScore: 0,
        isRecordHolder: false
      }),
      describeTrailLock: vi.fn(),
      trailHoverText: vi.fn(),
      DEFAULT_TRAIL_HINT: "hint",
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { trail: "trail" }
    });

    const first = handlers.handlers.handleOptionsClick({ target: elements.button });
    await Promise.resolve();
    const second = handlers.handlers.handleOptionsClick({ target: elements.button });

    expect(apiSetTrail).toHaveBeenCalledTimes(1);

    resolveSave({ ok: true });
    await first;
    await second;

    expect(handleTrailSaveResponse).toHaveBeenCalledTimes(1);
  });

  it("skips server saves for guests while updating the trail locally", async () => {
    const elements = buildElements();
    const net = {
      user: null,
      online: true,
      trails: [{ id: "classic" }],
      icons: [],
      pipeTextures: []
    };
    const apiSetTrail = vi.fn();
    const applyTrailSelection = vi.fn();
    const setTrailHint = vi.fn();

    const handlers = createTrailMenuHandlers({
      elements,
      getNet: () => net,
      getCurrentTrailId: () => "old",
      getCurrentIconId: () => "icon",
      getPlayerIcons: () => [{ id: "icon" }],
      getLastTrailHint: vi.fn(),
      apiSetTrail,
      refreshTrailMenu: vi.fn(),
      toggleTrailMenu: vi.fn(),
      setTrailHint,
      applyTrailSelection,
      openPurchaseModal: vi.fn(),
      handleTrailSaveResponse: vi.fn(),
      setNetUser: vi.fn(),
      setUserHint: vi.fn(),
      buildTrailHint: vi.fn(),
      mergeTrailCatalog: vi.fn((trails) => trails),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      applyIconSelection: vi.fn(),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      getTrailMenuState: () => ({
        orderedTrails: [{ id: "classic" }],
        unlocked: new Set(["classic"]),
        bestScore: 0,
        isRecordHolder: false
      }),
      describeTrailLock: vi.fn(),
      trailHoverText: vi.fn(),
      DEFAULT_TRAIL_HINT: "hint",
      DEFAULT_CURRENCY_ID: "bustercoin",
      UNLOCKABLE_TYPES: { trail: "trail" }
    });

    await handlers.handlers.handleOptionsClick({ target: elements.button });

    expect(applyTrailSelection).toHaveBeenCalledWith("classic", [{ id: "classic" }]);
    expect(setTrailHint).toHaveBeenCalledWith({
      className: "hint good",
      text: "Equipped (guest mode). Sign in to save."
    }, { persist: false });
    expect(apiSetTrail).not.toHaveBeenCalled();
  });
});
