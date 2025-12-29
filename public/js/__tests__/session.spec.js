import { describe, expect, it, vi } from "vitest";
import { clearSessionToken, readSessionToken, writeSessionToken } from "../session.js";

describe("session helpers", () => {
  it("reads and writes session tokens", () => {
    const store = new Map();
    const storage = {
      getItem: (key) => store.get(key) || null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key)
    };

    expect(readSessionToken(storage)).toBeNull();
    writeSessionToken("token", storage);
    expect(readSessionToken(storage)).toBe("token");
    clearSessionToken(storage);
    expect(readSessionToken(storage)).toBeNull();
  });

  it("handles missing or failing storage gracefully", () => {
    expect(readSessionToken(null)).toBeNull();
    expect(() => writeSessionToken("token", null)).not.toThrow();
    expect(() => clearSessionToken(null)).not.toThrow();

    const throwingStorage = {
      getItem: () => {
        throw new Error("fail");
      },
      setItem: () => {
        throw new Error("fail");
      },
      removeItem: () => {
        throw new Error("fail");
      }
    };

    expect(readSessionToken(throwingStorage)).toBeNull();
    expect(() => writeSessionToken("token", throwingStorage)).not.toThrow();
    expect(() => clearSessionToken(throwingStorage)).not.toThrow();
  });

  it("ignores empty tokens", () => {
    const storage = {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    writeSessionToken("", storage);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
