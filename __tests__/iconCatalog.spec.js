import { describe, expect, it } from "vitest";
import { getBaseIconCatalog, mergeIconCatalogs, resolveIconCatalog } from "../services/iconCatalog.cjs";

describe("icon catalog helpers", () => {
  it("returns the base catalog when stored icons are missing", () => {
    const base = getBaseIconCatalog();
    const resolved = resolveIconCatalog();
    expect(resolved.map((icon) => icon.id)).toEqual(base.map((icon) => icon.id));
  });

  it("merges stored icons and overrides matching ids", () => {
    const baseIcons = [
      { id: "alpha", name: "Alpha", unlock: { type: "free" } },
      { id: "shared", name: "Shared Base", unlock: { type: "free" } }
    ];
    const storedIcons = [
      { id: "shared", name: "Shared Override", unlock: { type: "free" }, style: { fill: "#111" } },
      { id: "beta", name: "Beta", unlock: { type: "free" } }
    ];

    const merged = mergeIconCatalogs({ baseIcons, storedIcons });

    expect(merged.map((icon) => icon.id)).toEqual(["alpha", "shared", "beta"]);
    expect(merged.find((icon) => icon.id === "shared")?.name).toBe("Shared Override");
  });

  it("keeps base icons when stored entries are invalid", () => {
    const baseIcons = [{ id: "alpha", name: "Alpha", unlock: { type: "free" } }];
    const resolved = resolveIconCatalog({
      baseIcons,
      storedIcons: [null, { id: "", name: "Bad" }]
    });

    expect(resolved.map((icon) => icon.id)).toEqual(["alpha"]);
  });

  it("includes custom icons when stored icons are valid", () => {
    const baseIcons = [{ id: "alpha", name: "Alpha", unlock: { type: "free" } }];
    const resolved = resolveIconCatalog({
      baseIcons,
      storedIcons: [{ id: "beta", name: "Beta", unlock: { type: "free" } }]
    });

    expect(resolved.map((icon) => icon.id)).toEqual(["alpha", "beta"]);
  });
});
