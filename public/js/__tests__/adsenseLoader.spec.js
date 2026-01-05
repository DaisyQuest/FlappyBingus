import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import {
  ADSENSE_BASE_URL,
  STORAGE_ACCESS_ERROR_PATTERN,
  attachStorageAccessListener,
  buildScriptUrl,
  getClientId,
  hasAdsenseScript,
  loadAdsense,
  logStorageAccessWarning,
  resolveWindow
} from "../adsenseLoader.js";

describe("adsenseLoader", () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
    document = dom.window.document;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the adsense client id from the current script", () => {
    const script = document.createElement("script");
    script.dataset.adsenseClient = "  ca-pub-test ";
    document.head.append(script);

    Object.defineProperty(document, "currentScript", { value: script, configurable: true });

    expect(getClientId(document)).toBe("ca-pub-test");
  });

  it("returns undefined when window is unavailable", () => {
    expect(resolveWindow()).toBeUndefined();
  });

  it("builds the adsense script URL with the client id", () => {
    const url = buildScriptUrl("ca-pub-123");
    expect(url).toContain(ADSENSE_BASE_URL);
    expect(url).toContain("client=ca-pub-123");
  });

  it("detects existing adsense scripts in the document", () => {
    const script = document.createElement("script");
    script.src = `${ADSENSE_BASE_URL}?client=ca-pub-123`;
    document.head.append(script);

    expect(hasAdsenseScript(document, "ca-pub-123")).toBe(true);
    expect(hasAdsenseScript(document, "ca-pub-456")).toBe(false);
  });

  it("logs a warning when tracking prevention blocks storage access", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logStorageAccessWarning("Tracking Prevention blocked access to storage for googleads.");
    expect(STORAGE_ACCESS_ERROR_PATTERN.test("Tracking Prevention blocked access to storage")).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      "[bingus] Adsense storage access was blocked by browser tracking prevention."
    );
  });

  it("ignores non-storage errors", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logStorageAccessWarning("Some unrelated error");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("attaches and cleans up the storage access listener", () => {
    const addSpy = vi.fn();
    const removeSpy = vi.fn();
    const win = {
      addEventListener: addSpy,
      removeEventListener: removeSpy
    };

    const cleanup = attachStorageAccessListener(win);
    expect(addSpy).toHaveBeenCalledWith("error", expect.any(Function));

    cleanup();
    expect(removeSpy).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("returns early when client id is missing", () => {
    const result = loadAdsense({ doc: document, win: dom.window, clientId: "" });
    expect(result).toEqual({ loaded: false, reason: "missing-client" });
  });

  it("avoids inserting a duplicate adsense script", () => {
    const script = document.createElement("script");
    script.src = `${ADSENSE_BASE_URL}?client=ca-pub-123`;
    document.head.append(script);

    const result = loadAdsense({ doc: document, win: dom.window, clientId: "ca-pub-123" });
    expect(result).toEqual({ loaded: false, reason: "already-loaded" });
    expect(document.head.querySelectorAll("script[src]").length).toBe(1);
  });

  it("appends the adsense script when needed", () => {
    const result = loadAdsense({ doc: document, win: dom.window, clientId: "ca-pub-123" });
    const script = document.head.querySelector("script[src]");

    expect(result).toEqual({ loaded: true });
    expect(script).not.toBeNull();
    expect(script?.src).toContain("client=ca-pub-123");
    expect(script?.async).toBe(true);
    expect(script?.crossOrigin).toBe("anonymous");
  });
});
