// =====================
// FILE: public/js/trailProgression.js
// Centralized trail progression data and helpers used by the UI.
// =====================

export const DEFAULT_TRAILS = Object.freeze([
  { id: "classic", name: "Classic", minScore: 0, achievementId: "trail_classic_1", alwaysUnlocked: true },
  { id: "ember", name: "Ember Core", minScore: 100, achievementId: "trail_ember_100" },
  { id: "sunset", name: "Sunset Fade", minScore: 250, achievementId: "trail_sunset_250" },
  { id: "gothic", name: "Garnet Dusk", minScore: 400, achievementId: "trail_gothic_400" },
  { id: "glacier", name: "Glacial Drift", minScore: 575, achievementId: "trail_glacier_575" },
  { id: "ocean", name: "Tidal Current", minScore: 750, achievementId: "trail_ocean_750" },
  { id: "miami", name: "Neon Miami", minScore: 950, achievementId: "trail_miami_950" },
  { id: "aurora", name: "Aurora", minScore: 1150, achievementId: "trail_aurora_1150" },
  { id: "rainbow", name: "Prismatic Ribbon", minScore: 1350, achievementId: "trail_rainbow_1350" },
  { id: "solar", name: "Solar Flare", minScore: 1550, achievementId: "trail_solar_1550" },
  { id: "storm", name: "Stormstrike", minScore: 1750, achievementId: "trail_storm_1750" },
  { id: "magma", name: "Forgefire", minScore: 1950, achievementId: "trail_magma_1950" },
  { id: "plasma", name: "Plasma Arc", minScore: 2150, achievementId: "trail_plasma_2150" },
  { id: "nebula", name: "Nebula Bloom", minScore: 2350, achievementId: "trail_nebula_2350" },
  { id: "dragonfire", name: "Dragonfire", minScore: 2600, achievementId: "trail_dragonfire_2600" },
  { id: "ultraviolet", name: "Ultraviolet Pulse", minScore: 2800, achievementId: "trail_ultraviolet_2800" },
  { id: "world_record", name: "World Record Cherry Blossom", minScore: 3000, achievementId: "trail_world_record_3000", requiresRecordHolder: true }
]);

export function normalizeTrails(list) {
  return Array.isArray(list) && list.length ? list : DEFAULT_TRAILS.map((t) => ({ ...t }));
}

export function getUnlockedTrails(trails, achievements, { isRecordHolder = false } = {}) {
  const defs = Array.isArray(trails) ? trails : DEFAULT_TRAILS;
  const unlockedAchievements = achievements?.unlocked && typeof achievements.unlocked === "object"
    ? achievements.unlocked
    : {};

  return defs
    .filter((t) => {
      if (t.alwaysUnlocked) return true;
      if (t.requiresRecordHolder && !isRecordHolder) return false;
      const required = t.achievementId;
      return required ? Boolean(unlockedAchievements[required]) : false;
    })
    .map((t) => t.id);
}

export function sortTrailsForDisplay(trails, { isRecordHolder = false } = {}) {
  const arr = (Array.isArray(trails) ? trails : DEFAULT_TRAILS).slice();
  if (!isRecordHolder) return arr;
  const gated = arr.filter((t) => t.requiresRecordHolder);
  const normal = arr.filter((t) => !t.requiresRecordHolder);
  return [...gated, ...normal];
}
