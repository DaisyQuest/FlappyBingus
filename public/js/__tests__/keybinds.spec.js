import { afterEach, describe, expect, it, vi } from "vitest";

const readJsonCookie = vi.fn();
const writeJsonCookie = vi.fn();

vi.mock("../util.js", () => ({
  readJsonCookie,
  writeJsonCookie
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("keybind helpers", () => {
  it("converts binds to tokens and compares them", async () => {
    const { bindToken, bindEquals } = await import("../keybinds.js");
    expect(bindToken({ type: "key", code: "KeyA" })).toBe("k:KeyA");
    expect(bindToken({ type: "mouse", button: 1 })).toBe("m:1");
    expect(bindEquals({ type: "key", code: "KeyA" }, { type: "mouse", button: 1 })).toBe(false);
  });

  it("normalizes bind inputs with strict validation", async () => {
    const { normalizeBind } = await import("../keybinds.js");
    expect(normalizeBind({ type: "key", code: "Digit9" })).toEqual({ type: "key", code: "Digit9" });
    expect(normalizeBind({ type: "key", code: "Bad Code!" })).toBeNull();
    expect(normalizeBind({ type: "mouse", button: 3 })).toBeNull();
    expect(normalizeBind({ type: "mouse", button: 0 })).toEqual({ type: "mouse", button: 0 });
  });

  it("rejects malformed binds and tokens that cannot be represented", async () => {
    const { normalizeBind, bindToken } = await import("../keybinds.js");
    expect(normalizeBind({ type: "key", code: "a".repeat(40) })).toBeNull();
    expect(normalizeBind({ type: "gamepad", button: 1 })).toBeNull();
    expect(bindToken({ type: "unknown" })).toBe("");
  });

  it("merges binds using defaults for invalid entries", async () => {
    const { mergeBinds, DEFAULT_KEYBINDS } = await import("../keybinds.js");
    const incoming = {
      dash: { type: "key", code: "KeyZ" },
      phase: { type: "mouse", button: 0 },
      teleport: { type: "key", code: "Bad!" }, // will be dropped
      slowField: { type: "mouse", button: 1 }
    };
    const merged = mergeBinds(DEFAULT_KEYBINDS, incoming);
    expect(merged.dash).toEqual({ type: "key", code: "KeyZ" });
    expect(merged.teleport).toEqual(DEFAULT_KEYBINDS.teleport); // invalid -> default
  });

  it("humanizes binds into readable labels", async () => {
    const { humanizeBind } = await import("../keybinds.js");
    expect(humanizeBind({ type: "mouse", button: 2 })).toBe("RMB");
    expect(humanizeBind({ type: "key", code: "Space" })).toBe("Space");
    expect(humanizeBind({ type: "key", code: "KeyB" })).toBe("B");
    expect(humanizeBind({ type: "key", code: "Digit5" })).toBe("5");
    expect(humanizeBind({ type: "key", code: "ShiftLeft" })).toBe("Shift");
    expect(humanizeBind(null)).toBe("Unbound");
    expect(humanizeBind({ type: "key", code: "ArrowLeft" })).toContain("Arrow");
    expect(humanizeBind({ type: "mouse", button: 5 })).toBe("Mouse 5");
  });

  it("swaps binds when rebinding to an already-used input", async () => {
    const { applyRebindWithSwap, DEFAULT_KEYBINDS, bindEquals } = await import("../keybinds.js");
    const result = applyRebindWithSwap(DEFAULT_KEYBINDS, "teleport", { type: "key", code: "Space" });
    expect(result.changed).toBe(true);
    expect(result.swappedWith).toBe("dash"); // Space was dash's bind
    expect(bindEquals(result.binds.dash, DEFAULT_KEYBINDS.teleport)).toBe(true);
  });

  it("loads and saves guest binds via cookies", async () => {
    const { loadGuestBinds, saveGuestBinds, DEFAULT_KEYBINDS } = await import("../keybinds.js");

    readJsonCookie.mockReturnValue({ dash: { type: "mouse", button: 2 } });
    const loaded = loadGuestBinds();
    expect(loaded.dash).toEqual({ type: "mouse", button: 2 });
    expect(loaded.phase).toEqual(DEFAULT_KEYBINDS.phase); // untouched defaults

    saveGuestBinds(loaded);
    expect(writeJsonCookie).toHaveBeenCalledWith(expect.any(String), loaded, 3650);
  });
});
