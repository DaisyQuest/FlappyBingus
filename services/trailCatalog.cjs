"use strict";

/**
 * Build a serializable catalog of all available trail previews. This catalog is
 * served at /trail_previews so the client (and tests) can verify preview data
 * without needing to parse the front-end bundle.
 * @param {Array<{id:string,name:string,minScore:number}>} trails
 * @returns {{ok:true,count:number,generatedAt:string,previews:Array}} catalog
 */
function buildTrailPreviewCatalog(trails) {
  const list = Array.isArray(trails) ? trails : [];
  const previews = list
    .map((t) => ({
      id: String(t.id || ""),
      name: t.name || String(t.id || ""),
      minScore: Number.isFinite(t.minScore) ? t.minScore : 0,
      requiresRecordHolder: Boolean(t.requiresRecordHolder),
      previewSeed: `trail-preview-${t.id || "classic"}`
    }))
    .sort((a, b) => a.minScore - b.minScore || a.name.localeCompare(b.name));

  return {
    ok: true,
    count: previews.length,
    generatedAt: new Date().toISOString(),
    previews
  };
}

module.exports = { buildTrailPreviewCatalog };
