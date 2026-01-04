import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

import { createTrailMenuController } from "../public/js/main/trailMenuController.js";

const buildElements = () => {
  const dom = new JSDOM(`<!doctype html><body>
    <div id="trail-text"></div>
    <div id="trail-launcher"><span class="trail-launcher-name"></span></div>
    <div id="trail-hint"></div>
    <div id="trail-options"></div>
  </body>`, { url: "http://localhost" });
  const document = dom.window.document;
  return {
    document,
    elements: {
      trailText: document.getElementById("trail-text"),
      trailLauncher: document.getElementById("trail-launcher"),
      trailHint: document.getElementById("trail-hint"),
      trailOptions: document.getElementById("trail-options")
    }
  };
};

const buildController = ({
  elements,
  net,
  getTrailMenuState,
  normalizeTrailSelection = ({ currentId }) => currentId,
  renderTrailMenuOptions = () => ({ rendered: 1 }),
  buildTrailHint = () => ({ className: "hint", text: "hint" }),
  shouldTriggerGuestSave = () => false,
  saveUserButton,
  trailPreview
} = {}) => {
  let currentTrailId = "classic";
  const getNet = () => net;
  const setCurrentTrailId = vi.fn((id) => { currentTrailId = id; });

  const controller = createTrailMenuController({
    elements,
    getNet,
    getTrailMenuState,
    getCurrentTrailId: () => currentTrailId,
    setCurrentTrailId,
    getCurrentIconId: () => "icon-1",
    getPlayerIcons: () => [{ id: "icon-1" }],
    getPlayerImage: () => ({ src: "icon" }),
    getTrailDisplayName: (id, trails) => trails.find((t) => t.id === id)?.name || id,
    normalizeTrailSelection,
    renderTrailMenuOptions,
    describeTrailLock: vi.fn(),
    buildTrailHint,
    shouldTriggerGuestSave,
    syncMenuProfileBindingsFromState: vi.fn(),
    syncLauncherSwatch: vi.fn(),
    trailPreview,
    saveUserButton,
    DEFAULT_TRAIL_HINT: "Pick a trail",
    GUEST_TRAIL_HINT_TEXT: "Guest save hint"
  });

  return { controller, setCurrentTrailId, getCurrentTrailId: () => currentTrailId };
};

describe("trail menu controller", () => {
  it("applies trail selection updates and syncs preview", () => {
    const { elements } = buildElements();
    const net = { trails: [{ id: "classic", name: "Classic" }] };
    const trailPreview = { setTrail: vi.fn(), start: vi.fn(), stop: vi.fn() };
    const { controller, setCurrentTrailId } = buildController({ elements, net, getTrailMenuState: () => ({}), trailPreview });

    controller.applyTrailSelection("classic", net.trails);

    expect(setCurrentTrailId).toHaveBeenCalledWith("classic");
    expect(elements.trailText.textContent).toBe("Classic");
    expect(elements.trailLauncher.querySelector(".trail-launcher-name").textContent).toBe("Classic");
    expect(trailPreview.setTrail).toHaveBeenCalledWith("classic");
  });

  it("tracks guest save triggers and preserves hint state", () => {
    const { elements } = buildElements();
    const net = { trails: [] };
    const saveUserButton = { click: vi.fn() };
    const shouldTriggerGuestSave = vi.fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    const { controller } = buildController({
      elements,
      net,
      getTrailMenuState: () => ({}),
      shouldTriggerGuestSave,
      saveUserButton
    });

    controller.setTrailHint({ className: "hint", text: "trigger" });
    controller.setTrailHint({ className: "hint", text: "Guest save hint" });
    controller.setTrailHint({ className: "hint", text: "reset" });

    expect(saveUserButton.click).toHaveBeenCalledTimes(1);
    expect(shouldTriggerGuestSave.mock.calls[0][0]).toMatchObject({ alreadyTriggered: false });
    expect(shouldTriggerGuestSave.mock.calls[1][0]).toMatchObject({ alreadyTriggered: true });
    expect(shouldTriggerGuestSave.mock.calls[2][0]).toMatchObject({ alreadyTriggered: true });
    expect(controller.getLastTrailHint().text).toBe("reset");
  });

  it("refreshes menu and handles empty trail lists", () => {
    const { elements } = buildElements();
    const net = { trails: [], user: { bestScore: 0 }, online: true, achievements: {} };
    const getTrailMenuState = () => ({ orderedTrails: [], unlocked: new Set(), bestScore: 0, isRecordHolder: false });
    const renderTrailMenuOptions = vi.fn().mockReturnValue({ rendered: 0 });
    const buildTrailHint = vi.fn().mockReturnValue({ className: "hint", text: "hint" });

    const { controller } = buildController({
      elements,
      net,
      getTrailMenuState,
      renderTrailMenuOptions,
      buildTrailHint,
      normalizeTrailSelection: () => "classic"
    });

    controller.refreshTrailMenu("classic");

    expect(renderTrailMenuOptions).toHaveBeenCalled();
    expect(elements.trailHint.textContent).toBe("No trails available.");
  });

  it("resumes and pauses trail preview", () => {
    const { elements } = buildElements();
    const net = { trails: [{ id: "classic", name: "Classic" }] };
    const trailPreview = { setTrail: vi.fn(), start: vi.fn(), stop: vi.fn() };
    const { controller } = buildController({ elements, net, getTrailMenuState: () => ({}), trailPreview });

    controller.resumeTrailPreview("classic");
    controller.pauseTrailPreview();

    expect(trailPreview.start).toHaveBeenCalled();
    expect(trailPreview.stop).toHaveBeenCalled();
  });
});
