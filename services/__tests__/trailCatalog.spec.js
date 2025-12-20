import { describe, expect, it } from "vitest";
import { buildTrailPreviewCatalog } from "../trailCatalog.cjs";

describe("trailCatalog", () => {
  it("creates a sorted preview catalog with seeds", () => {
    const catalog = buildTrailPreviewCatalog([
      { id: "b", name: "Beta", minScore: 200 },
      { id: "a", name: "Alpha", minScore: 100 }
    ]);

    expect(catalog.ok).toBe(true);
    expect(catalog.count).toBe(2);
    expect(catalog.generatedAt).toMatch(/T/);
    expect(catalog.previews[0]).toMatchObject({
      id: "a",
      name: "Alpha",
      minScore: 100,
      previewSeed: "trail-preview-a"
    });
    expect(catalog.previews[1].id).toBe("b");
  });

  it("handles missing or malformed trail arrays gracefully", () => {
    const catalog = buildTrailPreviewCatalog(null);
    expect(catalog.previews).toEqual([]);
    expect(catalog.count).toBe(0);
  });
});
