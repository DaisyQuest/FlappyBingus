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
      previewSeed: "trail-preview-a",
      requiresRecordHolder: false
    });
    expect(catalog.previews[1]).toMatchObject({ id: "b", requiresRecordHolder: false });
  });

  it("sorts by name when scores match", () => {
    const catalog = buildTrailPreviewCatalog([
      { id: "b", name: "Beta", minScore: 50 },
      { id: "a", name: "Alpha", minScore: 50 }
    ]);

    expect(catalog.previews[0].id).toBe("a");
    expect(catalog.previews[1].id).toBe("b");
  });

  it("defaults missing trail names to their ids", () => {
    const catalog = buildTrailPreviewCatalog([{ id: "ember" }]);
    expect(catalog.previews[0]).toMatchObject({ name: "ember" });
  });

  it("handles numeric ids and non-finite min scores", () => {
    const catalog = buildTrailPreviewCatalog([{ id: 7, name: "Lucky", minScore: NaN }]);
    expect(catalog.previews[0]).toMatchObject({ id: "7", minScore: 0 });
    expect(catalog.previews[0].previewSeed).toBe("trail-preview-7");
  });

  it("marks record holder requirements in previews", () => {
    const catalog = buildTrailPreviewCatalog([{ id: "record", requiresRecordHolder: true }]);
    expect(catalog.previews[0].requiresRecordHolder).toBe(true);
  });

  it("handles missing or malformed trail arrays gracefully", () => {
    const catalog = buildTrailPreviewCatalog(null);
    expect(catalog.previews).toEqual([]);
    expect(catalog.count).toBe(0);
  });
});
