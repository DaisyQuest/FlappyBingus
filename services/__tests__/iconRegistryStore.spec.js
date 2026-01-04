"use strict";

import { describe, expect, it, vi } from "vitest";
import { createIconRegistryStore } from "../iconRegistryStore.cjs";

describe("icon registry store", () => {
  it("loads icons from persistence and normalizes entries", async () => {
    const persistence = {
      load: vi.fn(async () => [
        null,
        { id: "alpha", unlock: { type: "free" } },
        { id: "beta", name: "Beta", unlock: { type: "free" } }
      ])
    };
    const store = createIconRegistryStore({ persistence, now: () => 123 });
    const icons = await store.load();
    expect(persistence.load).toHaveBeenCalled();
    expect(icons.map((icon) => icon.id)).toEqual(["alpha", "beta"]);
    expect(icons.find((icon) => icon.id === "alpha")?.name).toBe("alpha");
    expect(store.getMeta().lastLoadedAt).toBe(123);
  });

  it("rejects invalid icon catalogs on save", async () => {
    const persistence = { save: vi.fn(async () => {}) };
    const store = createIconRegistryStore({ persistence });
    await expect(store.save([{ id: "" }])).rejects.toThrow("invalid_icon_catalog");
    expect(persistence.save).not.toHaveBeenCalled();
  });

  it("rejects non-array inputs on save", async () => {
    const persistence = { save: vi.fn(async () => {}) };
    const store = createIconRegistryStore({ persistence });
    await expect(store.save("not-an-array")).rejects.toThrow("invalid_icon_catalog");
    expect(persistence.save).not.toHaveBeenCalled();
  });

  it("persists normalized icon payloads on save", async () => {
    const persistence = { save: vi.fn(async () => {}) };
    const now = vi.fn(() => 456);
    const store = createIconRegistryStore({ persistence, now });
    const result = await store.save([{ id: "spark", unlock: { type: "free" } }]);
    expect(persistence.save).toHaveBeenCalledWith([{ id: "spark", name: "spark", unlock: { type: "free", label: "Free" } }]);
    expect(result).toEqual([{ id: "spark", name: "spark", unlock: { type: "free", label: "Free" } }]);
    expect(store.getMeta().lastSavedAt).toBe(456);
  });

  it("operates without persistence load/save adapters", async () => {
    const now = vi.fn(() => 789);
    const store = createIconRegistryStore({ persistence: {}, now });
    const loadedIcons = await store.load();
    const savedIcons = await store.save([{ id: "ember", unlock: { type: "free" } }]);

    expect(loadedIcons).toEqual([]);
    expect(savedIcons).toEqual([{ id: "ember", name: "ember", unlock: { type: "free", label: "Free" } }]);
    expect(store.getMeta()).toEqual({ lastLoadedAt: 789, lastSavedAt: 789, lastPersistedAt: null });
  });

  it("returns cloned icons to avoid shared references", async () => {
    const store = createIconRegistryStore();
    const savedIcons = await store.save([{ id: "nova", unlock: { type: "free" } }]);
    const fetchedIcons = store.getIcons();

    expect(savedIcons[0]).not.toBe(fetchedIcons[0]);
    savedIcons[0].name = "mutated";
    const fetchedAgain = store.getIcons();
    expect(fetchedAgain[0].name).toBe("nova");
    expect(fetchedIcons[0]).not.toBe(fetchedAgain[0]);
  });
});
