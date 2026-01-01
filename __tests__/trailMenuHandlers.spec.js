import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

import { createTrailMenuHandlers } from "../public/js/trailMenuHandlers.js";

const buildDom = () => {
  const dom = new JSDOM(`<!doctype html><body>
    <button id="launcher"></button>
    <div id="overlay"></div>
    <button id="overlay-close"></button>
    <div id="options">
      <button data-trail-id="spark"></button>
      <button data-trail-id="locked"></button>
    </div>
  </body>`);
  return dom.window.document;
};

describe("trail menu handlers", () => {
  it("handles unlocked trail selection and save flow", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-trail-id='spark']");
    const net = {
      trails: [{ id: "spark", name: "Spark" }],
      user: { bestScore: 10, isRecordHolder: false },
      achievements: {}
    };
    const setNetUser = vi.fn((user) => { net.user = user; });
    const applyTrailSelection = vi.fn();
    const refreshTrailMenu = vi.fn();
    const setTrailHint = vi.fn();
    const apiSetTrail = vi.fn().mockResolvedValue({ ok: true });
    const handleTrailSaveResponse = vi.fn().mockResolvedValue(undefined);

    const { handlers } = createTrailMenuHandlers({
      elements: {
        trailLauncher: document.getElementById("launcher"),
        trailOverlay: document.getElementById("overlay"),
        trailOverlayClose: document.getElementById("overlay-close"),
        trailOptions: document.getElementById("options")
      },
      getNet: () => net,
      getCurrentTrailId: () => "classic",
      getCurrentIconId: () => "icon-1",
      getPlayerIcons: () => [{ id: "icon-1" }],
      getLastTrailHint: () => ({ className: "hint", text: "cached" }),
      apiSetTrail,
      refreshTrailMenu,
      toggleTrailMenu: vi.fn(),
      setTrailHint,
      applyTrailSelection,
      ensureLoggedInForSave: vi.fn(),
      openPurchaseModal: vi.fn(),
      handleTrailSaveResponse,
      setNetUser,
      setUserHint: vi.fn(),
      buildTrailHint: vi.fn(),
      normalizeTrails: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      applyIconSelection: vi.fn(),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      sortTrailsForDisplay: vi.fn().mockReturnValue(net.trails),
      computeUnlockedTrailSet: vi.fn().mockReturnValue(new Set(["spark"])),
      describeTrailLock: vi.fn(),
      trailHoverText: vi.fn(),
      DEFAULT_TRAIL_HINT: "Pick a trail",
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { trail: "trail" }
    });

    await handlers.handleOptionsClick({ target: button });

    expect(setNetUser).toHaveBeenCalledWith({ ...net.user, selectedTrail: "spark" });
    expect(applyTrailSelection).toHaveBeenCalledWith("spark", net.trails);
    expect(refreshTrailMenu).toHaveBeenCalledWith("spark");
    expect(setTrailHint).toHaveBeenCalledWith(
      { className: "hint", text: "Saving trail choice…" },
      { persist: true }
    );
    expect(apiSetTrail).toHaveBeenCalledWith("spark");
    expect(handleTrailSaveResponse).toHaveBeenCalledWith(
      expect.objectContaining({ selectedTrailId: "spark" })
    );
  });

  it("opens purchase modal for locked trails with purchase unlocks", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-trail-id='locked']");
    button.dataset.unlockType = "purchase";
    button.dataset.unlockCost = "40";
    button.dataset.unlockCurrency = "coin";
    const net = {
      trails: [{ id: "locked", name: "Locked" }],
      user: { bestScore: 0 }
    };
    const openPurchaseModal = vi.fn();

    const { handlers } = createTrailMenuHandlers({
      elements: {
        trailLauncher: null,
        trailOverlay: null,
        trailOverlayClose: null,
        trailOptions: document.getElementById("options")
      },
      getNet: () => net,
      getCurrentTrailId: () => "classic",
      getCurrentIconId: () => "icon-1",
      getPlayerIcons: () => [{ id: "icon-1" }],
      getLastTrailHint: () => null,
      apiSetTrail: vi.fn(),
      refreshTrailMenu: vi.fn(),
      toggleTrailMenu: vi.fn(),
      setTrailHint: vi.fn(),
      applyTrailSelection: vi.fn(),
      ensureLoggedInForSave: vi.fn(),
      openPurchaseModal,
      handleTrailSaveResponse: vi.fn(),
      setNetUser: vi.fn(),
      setUserHint: vi.fn(),
      buildTrailHint: vi.fn(),
      normalizeTrails: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      applyIconSelection: vi.fn(),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      sortTrailsForDisplay: vi.fn().mockReturnValue(net.trails),
      computeUnlockedTrailSet: vi.fn().mockReturnValue(new Set()),
      describeTrailLock: vi.fn(),
      trailHoverText: vi.fn(),
      DEFAULT_TRAIL_HINT: "Pick a trail",
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { trail: "trail" }
    });

    await handlers.handleOptionsClick({ target: button });

    expect(openPurchaseModal).toHaveBeenCalledWith(
      {
        id: "locked",
        name: "Locked",
        type: "trail",
        unlock: { type: "purchase", cost: 40, currencyId: "coin" }
      },
      { source: "trail" }
    );
  });

  it("shows lock hint for locked trails without purchase unlocks", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-trail-id='locked']");
    const net = {
      trails: [{ id: "locked", name: "Locked" }],
      user: { bestScore: 0, isRecordHolder: false }
    };
    const setTrailHint = vi.fn();
    const refreshTrailMenu = vi.fn();
    const describeTrailLock = vi.fn().mockReturnValue("Need more score");

    const { handlers } = createTrailMenuHandlers({
      elements: {
        trailLauncher: null,
        trailOverlay: null,
        trailOverlayClose: null,
        trailOptions: document.getElementById("options")
      },
      getNet: () => net,
      getCurrentTrailId: () => "classic",
      getCurrentIconId: () => "icon-1",
      getPlayerIcons: () => [{ id: "icon-1" }],
      getLastTrailHint: () => null,
      apiSetTrail: vi.fn(),
      refreshTrailMenu,
      toggleTrailMenu: vi.fn(),
      setTrailHint,
      applyTrailSelection: vi.fn(),
      ensureLoggedInForSave: vi.fn(),
      openPurchaseModal: vi.fn(),
      handleTrailSaveResponse: vi.fn(),
      setNetUser: vi.fn(),
      setUserHint: vi.fn(),
      buildTrailHint: vi.fn(),
      normalizeTrails: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      applyIconSelection: vi.fn(),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      sortTrailsForDisplay: vi.fn().mockReturnValue(net.trails),
      computeUnlockedTrailSet: vi.fn().mockReturnValue(new Set()),
      describeTrailLock,
      trailHoverText: vi.fn(),
      DEFAULT_TRAIL_HINT: "Pick a trail",
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { trail: "trail" }
    });

    await handlers.handleOptionsClick({ target: button });

    expect(refreshTrailMenu).toHaveBeenCalledWith("classic");
    expect(setTrailHint).toHaveBeenCalledWith(
      { className: "hint bad", text: "Need more score" },
      { persist: false }
    );
  });

  it("handles hover hints and restores previous hint on mouseout", () => {
    const document = buildDom();
    const button = document.querySelector("button[data-trail-id='spark']");
    const net = {
      trails: [{ id: "spark", name: "Spark" }],
      user: { bestScore: 15, isRecordHolder: false }
    };
    const setTrailHint = vi.fn();
    const trailHoverText = vi.fn().mockReturnValue("Spark trail");

    const { handlers } = createTrailMenuHandlers({
      elements: {
        trailLauncher: null,
        trailOverlay: null,
        trailOverlayClose: null,
        trailOptions: document.getElementById("options")
      },
      getNet: () => net,
      getCurrentTrailId: () => "classic",
      getCurrentIconId: () => "icon-1",
      getPlayerIcons: () => [{ id: "icon-1" }],
      getLastTrailHint: () => ({ className: "hint", text: "cached" }),
      apiSetTrail: vi.fn(),
      refreshTrailMenu: vi.fn(),
      toggleTrailMenu: vi.fn(),
      setTrailHint,
      applyTrailSelection: vi.fn(),
      ensureLoggedInForSave: vi.fn(),
      openPurchaseModal: vi.fn(),
      handleTrailSaveResponse: vi.fn(),
      setNetUser: vi.fn(),
      setUserHint: vi.fn(),
      buildTrailHint: vi.fn(),
      normalizeTrails: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      applyIconSelection: vi.fn(),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      sortTrailsForDisplay: vi.fn().mockReturnValue(net.trails),
      computeUnlockedTrailSet: vi.fn().mockReturnValue(new Set(["spark"])),
      describeTrailLock: vi.fn().mockReturnValue("Locked"),
      trailHoverText,
      DEFAULT_TRAIL_HINT: "Pick a trail",
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { trail: "trail" }
    });

    handlers.handleOptionsMouseOver({ target: button });
    expect(setTrailHint).toHaveBeenCalledWith(
      { className: "hint good", text: "Spark trail" },
      { persist: false }
    );

    handlers.handleOptionsMouseOut({ relatedTarget: null });
    expect(setTrailHint).toHaveBeenCalledWith(
      { className: "hint", text: "cached" },
      { persist: false }
    );
  });

  it("stops before saving when guest authentication fails", async () => {
    const document = buildDom();
    const button = document.querySelector("button[data-trail-id='spark']");
    const net = { trails: [{ id: "spark", name: "Spark" }], user: null };
    const ensureLoggedInForSave = vi.fn().mockResolvedValue(false);
    const apiSetTrail = vi.fn();
    const setTrailHint = vi.fn();

    const { handlers } = createTrailMenuHandlers({
      elements: {
        trailLauncher: null,
        trailOverlay: null,
        trailOverlayClose: null,
        trailOptions: document.getElementById("options")
      },
      getNet: () => net,
      getCurrentTrailId: () => "classic",
      getCurrentIconId: () => "icon-1",
      getPlayerIcons: () => [{ id: "icon-1" }],
      getLastTrailHint: () => null,
      apiSetTrail,
      refreshTrailMenu: vi.fn(),
      toggleTrailMenu: vi.fn(),
      setTrailHint,
      applyTrailSelection: vi.fn(),
      ensureLoggedInForSave,
      openPurchaseModal: vi.fn(),
      handleTrailSaveResponse: vi.fn(),
      setNetUser: vi.fn(),
      setUserHint: vi.fn(),
      buildTrailHint: vi.fn(),
      normalizeTrails: vi.fn(),
      syncUnlockablesCatalog: vi.fn(),
      syncIconCatalog: vi.fn(),
      syncPipeTextureCatalog: vi.fn(),
      applyIconSelection: vi.fn(),
      getAuthStatusFromResponse: vi.fn(),
      recoverSession: vi.fn(),
      sortTrailsForDisplay: vi.fn().mockReturnValue(net.trails),
      computeUnlockedTrailSet: vi.fn().mockReturnValue(new Set(["spark"])),
      describeTrailLock: vi.fn(),
      trailHoverText: vi.fn(),
      DEFAULT_TRAIL_HINT: "Pick a trail",
      DEFAULT_CURRENCY_ID: "coin",
      UNLOCKABLE_TYPES: { trail: "trail" }
    });

    await handlers.handleOptionsClick({ target: button });

    expect(ensureLoggedInForSave).toHaveBeenCalled();
    expect(apiSetTrail).not.toHaveBeenCalled();
    expect(setTrailHint).toHaveBeenCalledWith(
      { className: "hint good", text: "Equipped (guest mode)." },
      { persist: false }
    );
  });
});
