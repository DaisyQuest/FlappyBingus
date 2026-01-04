// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { buildBootStatus, refreshBootUI } from "../main/bootUI.js";

describe("boot UI helpers", () => {
  it("returns loading status when boot is not ready", () => {
    const status = buildBootStatus({
      boot: { imgReady: false, cfgReady: false },
      net: { online: true, user: { username: "ace" } }
    });

    expect(status).toEqual({
      ready: false,
      pillClass: "neutral",
      text: "Loading…"
    });
  });

  it("applies ready status text and enables buttons", () => {
    const startBtn = document.createElement("button");
    const tutorialBtn = document.createElement("button");
    const bootPill = document.createElement("div");
    bootPill.classList.add("neutral");
    const bootText = document.createElement("div");

    refreshBootUI({
      boot: { imgReady: true, cfgReady: true, imgOk: false, cfgOk: false, cfgSrc: "remote" },
      net: { online: false, user: { username: "ace" } },
      elements: { startBtn, tutorialBtn, bootPill, bootText }
    });

    expect(startBtn.disabled).toBe(false);
    expect(tutorialBtn.disabled).toBe(false);
    expect(bootPill.classList.contains("ok")).toBe(true);
    expect(bootText.textContent).toBe("player fallback • defaults • offline");
  });
});
