import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { DEFAULT_SKILL_SETTINGS } from "../settings.js";
import {
  DEFAULT_REPLAY_PREFS,
  genRandomSeed,
  readIconCookie,
  readLocalBest,
  readPipeTextureCookie,
  readPipeTextureModeCookie,
  readReplayPreferences,
  readSeed,
  readSettingsCookie,
  writeIconCookie,
  writeLocalBest,
  writePipeTextureCookie,
  writePipeTextureModeCookie,
  writeReplayPreferences,
  writeSeed,
  writeSettingsCookie
} from "../preferences.js";
import { DEFAULT_PIPE_TEXTURE_MODE } from "../pipeTextures.js";

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;

beforeEach(() => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test" });
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
});

afterEach(() => {
  globalThis.document = originalDocument;
  globalThis.window = originalWindow;
  vi.restoreAllMocks();
});

function getCookieValue(name) {
  const cookies = (globalThis.document?.cookie || "").split(";").map((c) => c.trim());
  const entry = cookies.find((c) => c.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : null;
}

describe("preferences", () => {
  it("reads and clamps the local best score cookie", () => {
    writeLocalBest(42.8);
    expect(readLocalBest()).toBe(42);

    globalThis.document.cookie = "chocolate_chip=9999999999";
    expect(readLocalBest()).toBe(1e9);

    globalThis.document.cookie = "chocolate_chip=not-a-number";
    expect(readLocalBest()).toBe(0);
  });

  it("round-trips the seed cookie with decoding", () => {
    writeSeed("alpha beta");
    expect(readSeed()).toBe("alpha beta");
  });

  it("generates a deterministic seed when crypto is injected", () => {
    const mockCrypto = {
      getRandomValues(values) {
        values[0] = 0x12;
        values[1] = 0x34;
        return values;
      }
    };
    expect(genRandomSeed(mockCrypto)).toBe("12-34");
  });

  it("round-trips settings cookies through normalization", () => {
    writeSettingsCookie({ dashBehavior: "destroy", slowFieldBehavior: "invalid" });
    const settings = readSettingsCookie();
    expect(settings).toEqual({
      ...DEFAULT_SKILL_SETTINGS,
      dashBehavior: "destroy"
    });
  });

  it("returns null for malformed settings cookies", () => {
    globalThis.document.cookie = "bingus_settings=not-json";
    expect(readSettingsCookie()).toBeNull();
  });

  it("handles icon and pipe texture cookies", () => {
    writeIconCookie("hi_vis_red");
    writePipeTextureCookie("neon");
    writePipeTextureModeCookie("invalid");

    expect(readIconCookie()).toBe("hi_vis_red");
    expect(readPipeTextureCookie()).toBe("neon");
    expect(readPipeTextureModeCookie()).toBe(DEFAULT_PIPE_TEXTURE_MODE);
  });

  it("does not write cookies when no ids are provided", () => {
    writeIconCookie("");
    writePipeTextureCookie(null);

    expect(getCookieValue("bingus_icon")).toBeNull();
    expect(getCookieValue("bingus_pipe_texture")).toBeNull();
  });

  it("round-trips replay preferences through localStorage", () => {
    const prefs = writeReplayPreferences({ uploadReplayVideo: true, preferReplayVideo: false });
    expect(prefs).toEqual({ uploadReplayVideo: true, preferReplayVideo: false });
    expect(readReplayPreferences()).toEqual({ uploadReplayVideo: true, preferReplayVideo: false });
  });

  it("falls back to defaults when replay preferences are malformed", () => {
    globalThis.window.localStorage.setItem("bingus_replay_prefs", "{bad json");
    expect(readReplayPreferences()).toEqual(DEFAULT_REPLAY_PREFS);
  });
});
