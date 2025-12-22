"use strict";

const { DEFAULT_SKILL_TOTALS, SKILL_IDS, normalizeSkillTotals, parseSkillTotals } = require("./skillConsts.cjs");

const ACHIEVEMENTS = Object.freeze([
  // Trail unlock path
  {
    id: "trail_classic_1",
    title: "1-Point Liftoff",
    description: "Score 1 point to claim your Classic trail.",
    requirement: { minScore: 1 },
    progressKey: "bestScore",
    reward: "Unlocks Classic trail"
  },
  {
    id: "trail_ember_100",
    title: "100-Point Ignition",
    description: "Score 100 in a single run to spark the Ember Core trail.",
    requirement: { minScore: 100 },
    progressKey: "bestScore",
    reward: "Unlocks Ember Core trail"
  },
  {
    id: "trail_sunset_250",
    title: "250 Sundown Sprint",
    description: "Score 250 in one run to paint the Sunset Fade trail.",
    requirement: { minScore: 250 },
    progressKey: "bestScore",
    reward: "Unlocks Sunset Fade trail"
  },
  {
    id: "trail_gothic_400",
    title: "400 Dusk March",
    description: "Score 400 in a single run to earn Garnet Dusk.",
    requirement: { minScore: 400 },
    progressKey: "bestScore",
    reward: "Unlocks Garnet Dusk trail"
  },
  {
    id: "trail_glacier_575",
    title: "575 Frostline Trek",
    description: "Score 575 in one run to unveil Glacial Drift.",
    requirement: { minScore: 575 },
    progressKey: "bestScore",
    reward: "Unlocks Glacial Drift trail"
  },
  {
    id: "trail_ocean_750",
    title: "750 Current Rider",
    description: "Score 750 in a single run to unlock Tidal Current.",
    requirement: { minScore: 750 },
    progressKey: "bestScore",
    reward: "Unlocks Tidal Current trail"
  },
  {
    id: "trail_miami_950",
    title: "950 Neon Rush",
    description: "Score 950 in one run to light up Neon Miami.",
    requirement: { minScore: 950 },
    progressKey: "bestScore",
    reward: "Unlocks Neon Miami trail"
  },
  {
    id: "trail_aurora_1150",
    title: "1150 Aurora Chase",
    description: "Score 1150 in a single run to awaken Aurora.",
    requirement: { minScore: 1150 },
    progressKey: "bestScore",
    reward: "Unlocks Aurora trail"
  },
  {
    id: "trail_rainbow_1350",
    title: "1350 Spectrum Sprint",
    description: "Score 1350 in one run to reveal the Prismatic Ribbon.",
    requirement: { minScore: 1350 },
    progressKey: "bestScore",
    reward: "Unlocks Prismatic Ribbon trail"
  },
  {
    id: "trail_solar_1550",
    title: "1550 Solar Ascent",
    description: "Score 1550 in a single run to ride the Solar Flare.",
    requirement: { minScore: 1550 },
    progressKey: "bestScore",
    reward: "Unlocks Solar Flare trail"
  },
  {
    id: "trail_storm_1750",
    title: "1750 Thunder Run",
    description: "Score 1750 in one run to command Stormstrike.",
    requirement: { minScore: 1750 },
    progressKey: "bestScore",
    reward: "Unlocks Stormstrike trail"
  },
  {
    id: "trail_magma_1950",
    title: "1950 Forgeflight",
    description: "Score 1950 in a single run to forge the Magma trail.",
    requirement: { minScore: 1950 },
    progressKey: "bestScore",
    reward: "Unlocks Forgefire trail"
  },
  {
    id: "trail_plasma_2150",
    title: "2150 Arc Sprint",
    description: "Score 2150 in one run to channel the Plasma Arc.",
    requirement: { minScore: 2150 },
    progressKey: "bestScore",
    reward: "Unlocks Plasma Arc trail"
  },
  {
    id: "trail_nebula_2350",
    title: "2350 Nebula Drift",
    description: "Score 2350 in a single run to bloom the Nebula trail.",
    requirement: { minScore: 2350 },
    progressKey: "bestScore",
    reward: "Unlocks Nebula Bloom trail"
  },
  {
    id: "trail_dragonfire_2600",
    title: "2600 Dragon Dash",
    description: "Score 2600 in one run to unleash Dragonfire.",
    requirement: { minScore: 2600 },
    progressKey: "bestScore",
    reward: "Unlocks Dragonfire trail"
  },
  {
    id: "trail_ultraviolet_2800",
    title: "2800 Ultraviolet Pulse",
    description: "Score 2800 in a single run to pulse Ultraviolet.",
    requirement: { minScore: 2800 },
    progressKey: "bestScore",
    reward: "Unlocks Ultraviolet Pulse trail"
  },
  {
    id: "trail_world_record_3000",
    title: "3000 Blossom Crown",
    description: "Score 3000 in one run to earn the cherry blossom crown.",
    requirement: { minScore: 3000 },
    progressKey: "bestScore",
    reward: "Unlocks World Record Cherry Blossom (record holders only)"
  },
  {
    id: "score_fire_cape_1000",
    title: "Fire Cape Trial",
    description: "Score 1,000 in a single run to temper the Fire Cape.",
    requirement: { minScore: 1000 },
    progressKey: "bestScore",
    reward: "Unlocks the Fire Cape icon"
  },
  {
    id: "score_inferno_cape_2000",
    title: "Inferno Challenge",
    description: "Score 2,000 in one run to seize the Inferno Cape.",
    requirement: { minScore: 2000 },
    progressKey: "bestScore",
    reward: "Unlocks the Inferno Cape icon"
  },

  // Skill achievements
  {
    id: "no_orbs_100",
    title: "Orb-Free Century",
    description: "Score 100 points in one run without picking up an orb.",
    requirement: { minScore: 100, maxOrbs: 0 },
    progressKey: "maxScoreNoOrbs",
    reward: "Unlocks the orb-free icon variant"
  },
  {
    id: "no_abilities_100",
    title: "Ability-Free Century",
    description: "Score 100 points in one run without using an ability.",
    requirement: { minScore: 100, maxAbilities: 0 },
    progressKey: "maxScoreNoAbilities",
    reward: "Cosmetics coming soon"
  },
  {
    id: "total_score_10000",
    title: "Ten-Thousand Club",
    description: "Score 10,000 points total across all runs.",
    requirement: { totalScore: 10_000 },
    progressKey: "totalScore",
    reward: "Cosmetics coming soon"
  },
  {
    id: "perfects_run_10",
    title: "Perfect Ten",
    description: "Clear 10 perfect gaps in a single run.",
    requirement: { minPerfects: 10 },
    progressKey: "maxPerfectsInRun",
    reward: "Unlocks the Perfect Line Beacon icon"
  },
  {
    id: "perfects_total_100",
    title: "Gap Guardian",
    description: "Clear 100 perfect gaps across all runs.",
    requirement: { totalPerfects: 100 },
    progressKey: "totalPerfects",
    reward: "Cosmetics coming soon"
  },
  {
    id: "orbs_run_100",
    title: "Orb Vacuum",
    description: "Pick up 100 orbs in a single run.",
    requirement: { minOrbs: 100 },
    progressKey: "maxOrbsInRun",
    reward: "Cosmetics coming soon"
  },
  {
    id: "orbs_total_2000",
    title: "Treasure Hunter",
    description: "Pick up 2,000 orbs total across all runs.",
    requirement: { totalOrbs: 2_000 },
    progressKey: "totalOrbsCollected",
    reward: "Cosmetics coming soon"
  }
]);

const DEFAULT_PROGRESS = Object.freeze({
  bestScore: 0,
  maxScoreNoOrbs: 0,
  maxScoreNoAbilities: 0,
  maxPerfectsInRun: 0,
  totalPerfects: 0,
  maxOrbsInRun: 0,
  totalOrbsCollected: 0,
  totalScore: 0,
  skillTotals: DEFAULT_SKILL_TOTALS
});

function clampTimestamp(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return Math.floor(n);
}

function clampScoreProgress(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(1_000_000_000, Math.floor(n));
}

function normalizeAchievementState(raw) {
  const unlocked = {};
  if (raw?.unlocked && typeof raw.unlocked === "object") {
    for (const [id, ts] of Object.entries(raw.unlocked)) {
      const safeTs = clampTimestamp(ts);
      if (safeTs) unlocked[id] = safeTs;
    }
  }

  const progress = { ...DEFAULT_PROGRESS, skillTotals: { ...DEFAULT_PROGRESS.skillTotals } };
  if (raw?.progress && typeof raw.progress === "object") {
    for (const key of Object.keys(DEFAULT_PROGRESS)) {
      if (raw.progress[key] !== undefined) {
        if (key === "skillTotals") {
          progress.skillTotals = normalizeSkillTotals(raw.progress.skillTotals);
        } else {
          progress[key] = clampScoreProgress(raw.progress[key]);
        }
      }
    }
  }

  return { unlocked, progress };
}

function parseNonNegativeInt(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function validateRunStats(raw) {
  if (raw === null || raw === undefined) {
    return { ok: true, stats: { orbsCollected: null, abilitiesUsed: null, perfects: null, skillUsage: null } };
  }
  if (typeof raw !== "object") return { ok: false, error: "invalid_run_stats" };

  const orbs = parseNonNegativeInt(raw.orbsCollected);
  const abilities = parseNonNegativeInt(raw.abilitiesUsed);
  const perfects = parseNonNegativeInt(raw.perfects);
  const skills =
    raw.skillUsage === undefined || raw.skillUsage === null
      ? null
      : parseSkillTotals(raw.skillUsage);

  if (raw.orbsCollected !== undefined && raw.orbsCollected !== null && orbs === null) {
    return { ok: false, error: "invalid_run_stats" };
  }
  if (raw.abilitiesUsed !== undefined && raw.abilitiesUsed !== null && abilities === null) {
    return { ok: false, error: "invalid_run_stats" };
  }
  if (raw.perfects !== undefined && raw.perfects !== null && perfects === null) {
    return { ok: false, error: "invalid_run_stats" };
  }
  if (raw.skillUsage !== undefined && raw.skillUsage !== null && !skills) {
    return { ok: false, error: "invalid_run_stats" };
  }

  return {
    ok: true,
    stats: {
      orbsCollected: orbs,
      abilitiesUsed: abilities,
      perfects,
      skillUsage: skills
    }
  };
}

function evaluateRunForAchievements({ previous, runStats, score, totalScore, bestScore, now = Date.now() } = {}) {
  const state = normalizeAchievementState(previous);
  const unlocked = [];

  const safeScore = clampScoreProgress(score);
  const baseBestScore = clampScoreProgress(
    Math.max(previous?.progress?.bestScore ?? 0, bestScore ?? 0)
  );
  const { orbsCollected, abilitiesUsed, perfects, skillUsage } = runStats || {};
  const hasOrbs = orbsCollected !== null && orbsCollected !== undefined;
  const hasAbilities = abilitiesUsed !== null && abilitiesUsed !== undefined;
  const hasPerfects = perfects !== null && perfects !== undefined;
  const safeOrbs = clampScoreProgress(orbsCollected ?? 0);
  const safeAbilities = hasAbilities ? abilitiesUsed : null;
  const safePerfects = clampScoreProgress(perfects ?? 0);
  const baseTotalScore = totalScore === undefined ? state.progress.totalScore : clampScoreProgress(totalScore);
  const safeSkillTotals = skillUsage ? normalizeSkillTotals(skillUsage) : null;

  const bestScoreProgress = Math.max(safeScore, baseBestScore, state.progress.bestScore || 0);
  state.progress.bestScore = bestScoreProgress;
  state.progress.totalScore = clampScoreProgress(baseTotalScore + safeScore);
  if (hasOrbs) {
    state.progress.totalOrbsCollected = clampScoreProgress(state.progress.totalOrbsCollected + safeOrbs);
    state.progress.maxOrbsInRun = Math.max(state.progress.maxOrbsInRun, safeOrbs);
  }
  if (hasPerfects) {
    state.progress.totalPerfects = clampScoreProgress(state.progress.totalPerfects + safePerfects);
    state.progress.maxPerfectsInRun = Math.max(state.progress.maxPerfectsInRun, safePerfects);
  }

  if (safeOrbs === 0 && hasOrbs) {
    state.progress.maxScoreNoOrbs = Math.max(state.progress.maxScoreNoOrbs, safeScore);
  }
  if (safeAbilities === 0 && hasAbilities) {
    state.progress.maxScoreNoAbilities = Math.max(state.progress.maxScoreNoAbilities, safeScore);
  }
  if (safeSkillTotals) {
    const totals = state.progress.skillTotals || DEFAULT_SKILL_TOTALS;
    const merged = {};
    for (const id of SKILL_IDS) {
      merged[id] = clampScoreProgress(totals[id] + safeSkillTotals[id]);
    }
    state.progress.skillTotals = merged;
  }

  for (const def of ACHIEVEMENTS) {
    if (state.unlocked[def.id]) continue;
    const minScore = def.requirement?.minScore ?? 0;
    const scoreOnlyRequirement = Object.keys(def.requirement || {}).every((key) => key === "minScore");
    const meetsScore = scoreOnlyRequirement ? bestScoreProgress >= minScore : safeScore >= minScore;

    const orbsOk =
      def.requirement?.maxOrbs === undefined
        ? true
        : hasOrbs && safeOrbs <= def.requirement.maxOrbs;
    const abilitiesOk =
      def.requirement?.maxAbilities === undefined
        ? true
        : hasAbilities && safeAbilities <= def.requirement.maxAbilities;
    const totalOrbsOk =
      def.requirement?.totalOrbs === undefined
        ? true
        : state.progress.totalOrbsCollected >= def.requirement.totalOrbs;
    const minOrbsOk =
      def.requirement?.minOrbs === undefined
        ? true
        : hasOrbs && safeOrbs >= def.requirement.minOrbs;
    const totalPerfectsOk =
      def.requirement?.totalPerfects === undefined
        ? true
        : state.progress.totalPerfects >= def.requirement.totalPerfects;
    const minPerfectsOk =
      def.requirement?.minPerfects === undefined
        ? true
        : hasPerfects && safePerfects >= def.requirement.minPerfects;
    const totalScoreOk =
      def.requirement?.totalScore === undefined
        ? true
        : state.progress.totalScore >= def.requirement.totalScore;

    if (meetsScore && orbsOk && abilitiesOk && totalOrbsOk && minOrbsOk && totalPerfectsOk && minPerfectsOk && totalScoreOk) {
      state.unlocked[def.id] = now;
      unlocked.push(def.id);
    }
  }

  return { state, unlocked };
}

function buildAchievementsPayload(user, unlocked = []) {
  const state = normalizeAchievementState(user?.achievements);
  const seen = new Set();
  const uniqueUnlocked = [];
  for (const id of unlocked || []) {
    if (seen.has(id)) continue;
    seen.add(id);
    uniqueUnlocked.push(id);
  }
  return { definitions: ACHIEVEMENTS, state, unlocked: uniqueUnlocked };
}

module.exports = {
  ACHIEVEMENTS,
  DEFAULT_PROGRESS,
  normalizeAchievementState,
  validateRunStats,
  evaluateRunForAchievements,
  buildAchievementsPayload
};
