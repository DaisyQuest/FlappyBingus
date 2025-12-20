// =====================
// FILE: public/js/trailProgression.js
// Centralized trail progression data and helpers used by the UI.
// =====================

export const DEFAULT_TRAILS = Object.freeze([
  { id: "classic", name: "Classic", minScore: 0 },
  { id: "ember", name: "Ember Core", minScore: 100 },
  { id: "sunset", name: "Sunset Fade", minScore: 250 },
  { id: "gothic", name: "Garnet Dusk", minScore: 400 },
  { id: "glacier", name: "Glacial Drift", minScore: 575 },
  { id: "ocean", name: "Tidal Current", minScore: 750 },
  { id: "miami", name: "Neon Miami", minScore: 950 },
  { id: "aurora", name: "Aurora", minScore: 1150 },
  { id: "rainbow", name: "Prismatic Ribbon", minScore: 1350 },
  { id: "solar", name: "Solar Flare", minScore: 1550 },
  { id: "storm", name: "Stormstrike", minScore: 1750 },
  { id: "magma", name: "Forgefire", minScore: 1950 },
  { id: "plasma", name: "Plasma Arc", minScore: 2150 },
  { id: "nebula", name: "Nebula Bloom", minScore: 2350 },
  { id: "dragonfire", name: "Dragonfire", minScore: 2600 },
  { id: "ultraviolet", name: "Ultraviolet Pulse", minScore: 2800 },
  { id: "world_record", name: "World Record Cherry Blossom", minScore: 0, requiresRecordHolder: true }
]);

export function normalizeTrails(list) {
  return Array.isArray(list) && list.length ? list : DEFAULT_TRAILS.map((t) => ({ ...t }));
}

export function getUnlockedTrails(trails, bestScore, { isRecordHolder = false } = {}) {
  const s = Number(bestScore) || 0;
  return (Array.isArray(trails) ? trails : DEFAULT_TRAILS)
    .filter((t) => s >= (t?.minScore ?? 0) && (!t?.requiresRecordHolder || isRecordHolder))
    .map((t) => t.id);
}

export function sortTrailsForDisplay(trails, { isRecordHolder = false } = {}) {
  const arr = (Array.isArray(trails) ? trails : DEFAULT_TRAILS).slice();
  if (!isRecordHolder) return arr;
  const gated = arr.filter((t) => t.requiresRecordHolder);
  const normal = arr.filter((t) => !t.requiresRecordHolder);
  return [...gated, ...normal];
}
