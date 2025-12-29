import { describe, expect, it, vi } from "vitest";
import {
  clearSessionToken,
  clearSessionUsername,
  readSessionToken,
  readSessionUsername,
  writeSessionToken,
  writeSessionUsername
} from "../session.js";

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

  it("falls back to the cached token when storage is unavailable", () => {
    const storage = {
      getItem: vi.fn(() => "cached-token"),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    expect(readSessionToken(storage)).toBe("cached-token");
    expect(readSessionToken(null)).toBe("cached-token");
    clearSessionToken(storage);
    expect(readSessionToken(null)).toBeNull();
  });

  it("reads and writes session usernames", () => {
    const store = new Map();
    const storage = {
      getItem: (key) => store.get(key) || null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key)
    };

    expect(readSessionUsername(storage)).toBeNull();
    writeSessionUsername("PlayerOne", storage);
    expect(readSessionUsername(storage)).toBe("PlayerOne");
    clearSessionUsername(storage);
    expect(readSessionUsername(storage)).toBeNull();
  });

  it("caches usernames in memory when storage is unavailable", () => {
    const storage = {
      getItem: vi.fn(() => "PlayerTwo"),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    expect(readSessionUsername(storage)).toBe("PlayerTwo");
    expect(readSessionUsername(null)).toBe("PlayerTwo");
    clearSessionUsername(storage);
    expect(readSessionUsername(null)).toBeNull();
  });
});
