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
    expect(ui.trailLauncher).toBeInstanceOf(window.HTMLElement);
    expect(ui.trailLauncher?.querySelector(".trail-swatch")).toBeNull();
    expect(ui.menu?.id).toBe("menu");
    expect(ui.over?.id).toBe("over");
    expect(ui.start?.textContent).toContain("Start");
    const readyCard = mount.querySelector(".panel-main .info-card");
    const readyFields = readyCard?.querySelectorAll(".field");
    expect(readyFields?.[0]?.querySelector("#iconOptions")).toBeInstanceOf(window.HTMLElement);
    expect(readyFields?.[1]?.querySelector("#trailLauncher")).toBeInstanceOf(window.HTMLElement);
    expect(ui.iconLauncher).toBeInstanceOf(window.HTMLElement);
    expect(ui.iconLauncher?.querySelector(".icon-swatch-canvas")).toBeInstanceOf(window.HTMLCanvasElement);
    expect(ui.iconOverlay?.classList.contains("hidden")).toBe(true);
    const overlay = mount.querySelector("#menu .trail-preview-overlay");
    expect(overlay?.querySelectorAll(".trail-preview-canvas")?.length).toBe(1);
    expect(overlay?.querySelectorAll(".trail-preview-glow")?.length).toBe(1);
    const trailOverlay = mount.querySelector("#trailOverlay");
    expect(trailOverlay?.querySelector("#trailOptions")).toBeInstanceOf(window.HTMLElement);
    expect(ui.iconOptions?.className).toContain("icon-grid");
    const mainTitles = Array.from(mount.querySelectorAll(".panel-main .section-title")).map(el => el.textContent);
    expect(mainTitles).not.toContain("Ready to fly");
    expect(mainTitles).not.toContain("Player Icon");
    expect(mainTitles).not.toContain("Cosmetic Trail");
  });

  it("exposes interactive controls with expected defaults", () => {
    const ui = buildGameUI({ document, mount });

    expect(ui.start?.disabled).toBe(true);
    expect(ui.tutorial?.disabled).toBe(true);
    expect(ui.exportGif?.disabled).toBe(true);
    expect(ui.exportMp4?.disabled).toBe(true);
    expect(ui.trailText?.textContent).toBe("classic");
    expect(ui.iconText?.textContent).toBe("High-Vis Orange");
    expect(ui.seedInput?.maxLength).toBe(48);
    expect(ui.musicVolume?.value).toBe("70");
    expect(ui.sfxVolume?.value).toBe("80");
    const howtoCard = mount.querySelector(".howto-card");
    expect(howtoCard?.contains(ui.tutorial)).toBe(true);
    expect(ui.tutorial?.className).toContain("wide");
    expect(ui.tutorial?.className).not.toContain("small");
    expect(ui.iconHint?.textContent).toBe("");
  });

  it("renders all expected controls needed by main.js wiring", () => {
    const ui = buildGameUI({ document, mount });
    const requiredRefs = [
      "bootPill",
      "bootText",
      "bindWrap",
      "bindHint",
      "dashBehaviorOptions",
      "slowFieldBehaviorOptions",
      "hsWrap",
      "pbText",
      "trailText",
      "iconText",
      "iconOptions",
      "iconHint",
      "iconOverlay",
      "iconOverlayClose",
      "iconLauncher",
      "trailLauncher",
      "trailOptions",
      "trailOverlay",
      "trailOverlayClose",
      "bustercoinText",
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
      "replayStatus",
      "achievementsHideCompleted",
      "achievementsList",
      "achievementToasts",
      "viewAchievements",
      "settingsHeaderBack"
    ];

    for (const key of requiredRefs) {
      expect(ui[key]).toBeTruthy();
    }

    const howToItems = ui.menu?.querySelectorAll(".howto-list li");
    expect(howToItems?.length).toBe(6);
    expect(ui.seedHint?.textContent).toContain("pipe/orb");
    expect(ui.trailHint?.textContent).toContain("Unlock trails");
    expect(ui.dashBehaviorOptions?.querySelectorAll(".skill-option")?.length).toBe(2);
    expect(ui.slowFieldBehaviorOptions?.querySelectorAll(".skill-option")?.length).toBe(2);
  });

  it("positions the trail swatch to the left of the launcher text and exposes the overlay grid", () => {
    buildGameUI({ document, mount });
    const launcher = mount.querySelector("#trailLauncher");
    const badge = launcher?.querySelector(".trail-launcher-badge");
    const label = launcher?.querySelector(".trail-launcher-label");
    const overlay = mount.querySelector("#trailOverlay");
    const options = overlay?.querySelector("#trailOptions");

    expect(badge?.firstElementChild).toBe(label);
    expect(launcher?.querySelector(".trail-swatch")).toBeNull();
    expect(label?.querySelector(".trail-launcher-name")?.textContent).toBe("Classic");
    expect(options?.getAttribute("role")).toBe("listbox");
    expect(overlay?.getAttribute("aria-modal")).toBe("true");
  });

  it("prioritizes skills in the settings layout while compacting utilities", () => {
    buildGameUI({ document, mount });
    const settingsGrid = document.querySelector(".settings-grid");
    expect(settingsGrid?.classList.contains("info-grid")).toBe(true);

    const featureCards = Array.from(settingsGrid?.querySelectorAll(".settings-feature") || []);
    const featureTitles = featureCards.map(card => card.querySelector(".section-title")?.textContent);
    expect(featureCards.length).toBe(2);
    expect(featureTitles).toContain("Skill Behaviors");
    expect(featureTitles).toContain("Skill Keybinds");
    expect(settingsGrid?.firstElementChild?.querySelector(".section-title")?.textContent).toBe("Skill Behaviors");

    const secondary = settingsGrid?.querySelector(".settings-secondary");
    expect(secondary?.querySelector("#musicVolume")).toBeInstanceOf(window.HTMLInputElement);
    expect(secondary?.querySelector("#sfxVolume")).toBeInstanceOf(window.HTMLInputElement);

    const utilityTitles = Array.from(settingsGrid?.querySelectorAll(".settings-utility .section-title") || []).map(
      el => el?.textContent
    );
    expect(utilityTitles).toContain("Status");
    expect(utilityTitles).toContain("Level Seed");

    const seedRow = document.querySelector(".seed-row");
    expect(seedRow?.classList.contains("minirow")).toBe(true);
    expect(seedRow?.querySelector("#seedInput")).toBeInstanceOf(window.HTMLInputElement);
    expect(seedRow?.querySelector("#seedRandomBtn")).toBeInstanceOf(window.HTMLButtonElement);
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
    expect(viewRadios.length).toBe(3);
    const mainRadio = document.getElementById("viewMain");
    const settingsRadio = document.getElementById("viewSettings");
    const achievementsRadio = document.getElementById("viewAchievements");
    expect(mainRadio?.checked).toBe(true);
    expect(settingsRadio?.checked).toBe(false);
    expect(achievementsRadio?.checked).toBe(false);
    const shell = document.querySelector(".menu-shell");
    expect(shell?.dataset.view).toBe("main");
    const sideStack = document.querySelector(".side-stack");
    expect(sideStack?.hidden).toBe(false);
  });

  it("recreates the layout cleanly on repeated mounts", () => {
    buildGameUI({ document, mount });
    const second = buildGameUI({ document, mount });

    expect(mount.querySelectorAll("#wrap").length).toBe(1);
    expect(second.bindWrap?.classList.contains("bindList")).toBe(true);
    expect(second.userHint?.textContent).toBe("Not signed in.");
  });

  it("updates the title and layout when switching to settings or achievements", () => {
    buildGameUI({ document, mount });
    const title = document.getElementById("menuTitle");
    const subtitle = document.querySelector(".menu-subtitle");
    const shell = document.querySelector(".menu-shell");
    const sideStack = document.querySelector(".side-stack");
    const settingsRadio = document.getElementById("viewSettings");
    const achievementsRadio = document.getElementById("viewAchievements");
    const mainRadio = document.getElementById("viewMain");
    const achievementsBack = document.getElementById("achievementsHeaderBack");
    const settingsBack = document.getElementById("settingsHeaderBack");

    expect(title?.textContent).toBe("Flappy Bingus");
    expect(subtitle?.hidden).toBe(false);
    expect(shell?.dataset.view).toBe("main");
    expect(sideStack?.hidden).toBe(false);
    expect(achievementsBack?.hidden).toBe(true);
    expect(settingsBack?.hidden).toBe(true);

    settingsRadio.checked = true;
    settingsRadio.dispatchEvent(new window.Event("change"));
    expect(title?.textContent).toBe("Settings");
    expect(subtitle?.hidden).toBe(false);
    expect(shell?.dataset.view).toBe("settings");
    expect(sideStack?.hidden).toBe(true);
    expect(achievementsBack?.hidden).toBe(true);
    expect(settingsBack?.hidden).toBe(false);

    achievementsRadio.checked = true;
    achievementsRadio.dispatchEvent(new window.Event("change"));
    expect(title?.textContent).toBe("Achievements");
    expect(subtitle?.hidden).toBe(true);
    expect(shell?.dataset.view).toBe("achievements");
    expect(sideStack?.hidden).toBe(true);
    expect(achievementsBack?.hidden).toBe(false);
    expect(settingsBack?.hidden).toBe(true);

    mainRadio.checked = true;
    mainRadio.dispatchEvent(new window.Event("change"));
    expect(title?.textContent).toBe("Flappy Bingus");
    expect(subtitle?.hidden).toBe(false);
    expect(shell?.dataset.view).toBe("main");
    expect(sideStack?.hidden).toBe(false);
    expect(achievementsBack?.hidden).toBe(true);
    expect(settingsBack?.hidden).toBe(true);
  });

  it("places the achievements back control beside the menu title and removes the card heading", () => {
    buildGameUI({ document, mount });
    const menuTitleRow = document.querySelector(".menu-title-row");
    const headerBack = document.getElementById("achievementsHeaderBack");
    const settingsBack = document.getElementById("settingsHeaderBack");
    const achievementList = document.getElementById("achievementsList");
    const achievementToggle = document.querySelector(".panel-achievements .tab-toggle");
    const settingsToggle = document.querySelector(".panel-settings .tab-toggle");
    const achievementsHeading = document.querySelector(".achievements-card .section-title");
    const blurb = document.querySelector(".achievements-card .compact");
    const achievementsRadio = document.getElementById("viewAchievements");
    const settingsRadio = document.getElementById("viewSettings");
    const mainRadio = document.getElementById("viewMain");
    const subtitle = document.querySelector(".menu-subtitle");

    expect(menuTitleRow?.firstElementChild).toBe(headerBack);
    expect(menuTitleRow?.children?.[1]).toBe(settingsBack);
    expect(headerBack?.hidden).toBe(true);
    expect(settingsBack?.hidden).toBe(true);
    expect(achievementToggle).toBeFalsy();
    expect(settingsToggle).toBeFalsy();
    expect(achievementsHeading).toBeFalsy();
    expect(blurb).toBeFalsy();

    settingsRadio.checked = true;
    settingsRadio.dispatchEvent(new window.Event("change"));
    expect(settingsBack?.hidden).toBe(false);

    achievementsRadio.checked = true;
    achievementsRadio.dispatchEvent(new window.Event("change"));
    expect(headerBack?.hidden).toBe(false);
    expect(subtitle?.hidden).toBe(true);
    expect(settingsBack?.hidden).toBe(true);

    mainRadio.checked = true;
    mainRadio.dispatchEvent(new window.Event("change"));
    expect(headerBack?.hidden).toBe(true);
    expect(subtitle?.hidden).toBe(false);
    expect(achievementList?.style.maxHeight).toBe("520px");
  });
});
