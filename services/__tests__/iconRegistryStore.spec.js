"use strict";

import { describe, expect, it, vi } from "vitest";
import { createIconRegistryStore } from "../iconRegistryStore.cjs";

describe("icon registry store", () => {
  it("loads icons from persistence and normalizes entries", async () => {
    const persistence = {
      load: vi.fn(async () => [
        null,
        { id: "  alpha  ", unlock: { type: "free" } },
        { id: "alpha", name: "Duplicate Alpha" },
        "not-an-icon",
        { id: "beta", name: "Beta", unlock: { type: "score", minScore: 2 } },
        { id: "" }
      ])
    };
    const now = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(110);
    const store = createIconRegistryStore({ persistence, now });
    const icons = await store.load();
    expect(persistence.load).toHaveBeenCalled();
    expect(icons.map((icon) => icon.id)).toEqual(["alpha", "beta"]);
    expect(icons.find((icon) => icon.id === "alpha")?.name).toBe("alpha");
    expect(icons.find((icon) => icon.id === "beta")?.unlock?.label).toBe("Score 2+");
    expect(store.getMeta().lastPersistedAt).toBe(100);
    expect(store.getMeta().lastLoadedAt).toBe(110);
  });

  it("rejects invalid icon catalogs on save with error details", async () => {
    const persistence = { save: vi.fn(async () => {}) };
    const store = createIconRegistryStore({ persistence });
    const invalidIcons = [{ id: "" }, "nope", { id: "dup" }, { id: "dup" }];
    await expect(store.save(invalidIcons)).rejects.toMatchObject({
      message: "invalid_icon_catalog",
      details: expect.arrayContaining([
        expect.objectContaining({ message: "icon_id_invalid" }),
        expect.objectContaining({ message: "icon_invalid" }),
        expect.objectContaining({ message: "icon_id_duplicate" })
      ])
    });
    expect(persistence.save).not.toHaveBeenCalled();
    expect(store.getMeta().lastSavedAt).toBe(0);
    expect(store.getMeta().lastPersistedAt).toBeNull();
  });

  it("persists normalized icon payloads on save", async () => {
    const persistence = { save: vi.fn(async () => {}) };
    const now = vi.fn().mockReturnValueOnce(300).mockReturnValueOnce(310);
    const store = createIconRegistryStore({ persistence, now });
    const result = await store.save([{ id: "spark", unlock: { type: "free" } }]);
    expect(persistence.save).toHaveBeenCalledWith([{ id: "spark", name: "spark", unlock: { type: "free", label: "Free" } }]);
    expect(result).toEqual([{ id: "spark", name: "spark", unlock: { type: "free", label: "Free" } }]);
    expect(store.getMeta().lastPersistedAt).toBe(300);
    expect(store.getMeta().lastSavedAt).toBe(310);
    expect(store.getMeta().lastLoadedAt).toBe(0);
  });

  it("loads without persistence adapter and keeps lastPersistedAt null", async () => {
    const now = vi.fn(() => 410);
    const store = createIconRegistryStore({ now });
    const icons = await store.load();
    expect(icons).toEqual([]);
    expect(store.getMeta().lastPersistedAt).toBeNull();
    expect(store.getMeta().lastLoadedAt).toBe(410);
    expect(store.getMeta().lastSavedAt).toBe(0);
  });

  it("saves without persistence adapter and keeps lastPersistedAt null", async () => {
    const now = vi.fn(() => 520);
    const store = createIconRegistryStore({ now });
    const icons = await store.save([{ id: "nova" }]);
    expect(icons).toEqual([{ id: "nova", name: "nova", unlock: { type: "free", label: "Free" } }]);
    expect(store.getMeta().lastPersistedAt).toBeNull();
    expect(store.getMeta().lastSavedAt).toBe(520);
    expect(store.getMeta().lastLoadedAt).toBe(0);
  });
});
