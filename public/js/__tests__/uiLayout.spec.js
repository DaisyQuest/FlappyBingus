import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import { buildGameUI } from "../uiLayout.js";

describe("uiLayout", () => {
  let document;
  let window;
  let mount;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><body><div id='mount'></div></body>");
    document = dom.window.document;
    window = dom.window;
    mount = document.getElementById("mount");
  });

  it("builds the UI shell with required screens and canvas", () => {
    const ui = buildGameUI({ document, mount });

    expect(mount.querySelectorAll("#wrap").length).toBe(1);
    expect(ui.canvas).toBeInstanceOf(window.HTMLCanvasElement);
    expect(ui.trailPreviewCanvas).toBeInstanceOf(window.HTMLCanvasElement);
    expect(ui.menu?.id).toBe("menu");
    expect(ui.over?.id).toBe("over");
    expect(ui.start?.textContent).toContain("Start");
    const overlay = mount.querySelector("#menu .trail-preview-overlay");
    expect(overlay?.querySelectorAll(".trail-preview-canvas")?.length).toBe(1);
    expect(overlay?.querySelectorAll(".trail-preview-glow")?.length).toBe(1);
    const selectPanel = mount.querySelector(".trail-select-panel");
    expect(selectPanel?.querySelectorAll("select")?.length).toBe(1);
    expect(selectPanel?.textContent.trim()).toBe("");
  });

  it("exposes interactive controls with expected defaults", () => {
    const ui = buildGameUI({ document, mount });

    expect(ui.start?.disabled).toBe(true);
    expect(ui.tutorial?.disabled).toBe(true);
    expect(ui.exportGif?.disabled).toBe(true);
    expect(ui.exportMp4?.disabled).toBe(true);
    expect(ui.trailText?.textContent).toBe("classic");
    expect(ui.seedInput?.maxLength).toBe(48);
    expect(ui.musicVolume?.value).toBe("70");
    expect(ui.sfxVolume?.value).toBe("80");
  });

  it("renders all expected controls needed by main.js wiring", () => {
    const ui = buildGameUI({ document, mount });
    const requiredRefs = [
      "bootPill",
      "bootText",
      "trailSelect",
      "bindWrap",
      "bindHint",
      "hsWrap",
      "pbText",
      "trailText",
      "trailPreviewCanvas",
      "final",
      "overPB",
      "seedInput",
      "seedRandomBtn",
      "seedHint",
      "musicVolume",
      "sfxVolume",
      "muteToggle",
      "watchReplay",
      "exportGif",
      "exportMp4",
      "replayStatus"
    ];

    for (const key of requiredRefs) {
      expect(ui[key]).toBeTruthy();
    }

    const howToItems = ui.menu?.querySelectorAll(".howto-list li");
    expect(howToItems?.length).toBe(6);
    expect(ui.seedHint?.textContent).toContain("pipe/orb");
    expect(ui.trailHint?.textContent).toContain("Unlock trails");
  });

  it("layers the trail preview behind panel content while keeping menus interactive", () => {
    buildGameUI({ document, mount });
    const screen = mount.querySelector("#menu.screen");
    const overlay = screen?.querySelector(":scope > .trail-preview-overlay");
    const panel = screen?.querySelector(":scope > .panel");
    const aurora = panel?.querySelector(".light-aurora");
    const content = panel?.querySelector(".content-layer");

    expect(screen?.firstElementChild).toBe(overlay);
    expect(overlay?.contains(panel)).toBe(false);
    expect(panel?.contains(overlay)).toBe(false);
    expect(panel?.contains(aurora)).toBe(true);
    expect(panel?.contains(content)).toBe(true);
  });

  it("preserves a single #wrap when mounted on body without a custom mount", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    const bodyDoc = dom.window.document;

    buildGameUI({ document: bodyDoc });
    const firstWrap = bodyDoc.querySelector("#wrap");
    expect(firstWrap).toBeTruthy();

    buildGameUI({ document: bodyDoc });
    const wraps = bodyDoc.querySelectorAll("#wrap");
    expect(wraps.length).toBe(1);
  });

  it("sets up tab radios with shared name and default main view", () => {
    buildGameUI({ document, mount });
    const viewRadios = document.querySelectorAll('input[name="view"]');
    expect(viewRadios.length).toBe(2);
    const mainRadio = document.getElementById("viewMain");
    const settingsRadio = document.getElementById("viewSettings");
    expect(mainRadio?.checked).toBe(true);
    expect(settingsRadio?.checked).toBe(false);
  });

  it("recreates the layout cleanly on repeated mounts", () => {
    buildGameUI({ document, mount });
    const second = buildGameUI({ document, mount });

    expect(mount.querySelectorAll("#wrap").length).toBe(1);
    expect(second.bindWrap?.classList.contains("bindList")).toBe(true);
    expect(second.userHint?.textContent).toBe("Not signed in.");
  });
});
