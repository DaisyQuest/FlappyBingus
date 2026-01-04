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

  it("persists normalized icon payloads on save", async () => {
    const persistence = { save: vi.fn(async () => {}) };
    const now = vi.fn(() => 456);
    const store = createIconRegistryStore({ persistence, now });
    const result = await store.save([{ id: "spark", unlock: { type: "free" } }]);
    expect(persistence.save).toHaveBeenCalledWith([{ id: "spark", name: "spark", unlock: { type: "free", label: "Free" } }]);
    expect(result).toEqual([{ id: "spark", name: "spark", unlock: { type: "free", label: "Free" } }]);
    expect(store.getMeta().lastSavedAt).toBe(456);
  });
});
