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
    title: "2350 Starfall Drift",
    description: "Score 2350 in a single run to unlock the Starfall Drift trail.",
    requirement: { minScore: 2350 },
    progressKey: "bestScore",
    reward: "Unlocks Starfall Drift trail"
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
    id: "run_time_60",
    title: "One-Minute Glide",
    description: "Stay airborne for a full minute in a single run.",
    requirement: { minRunTime: 60 },
    progressKey: "maxRunTime",
    reward: "Unlocks Lemon Slice trail"
  },
  {
    id: "play_10_games",
    title: "Ten-Run Warmup",
    description: "Play 10 games to earn a full-spectrum trail.",
    requirement: { totalRuns: 10 },
    progressKey: "totalRuns",
    reward: "Unlocks Prismatic Ribbon trail"
  },
  {
    id: "total_run_time_600",
    title: "Ten-Minute Soarer",
    description: "Accumulate 10 minutes of flight time across all runs.",
    requirement: { totalRunTime: 600 },
    progressKey: "totalRunTime",
    reward: "Unlocks the Honeycomb Drift icon"
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
    reward: "Unlocks the Rainbow Stripes icon"
  },
  {
    id: "orbs_total_2000",
    title: "Treasure Hunter",
    description: "Pick up 2,000 orbs total across all runs.",
    requirement: { totalOrbs: 2_000 },
    progressKey: "totalOrbsCollected",
    reward: "Cosmetics coming soon"
  },
  {
    id: "orb_combo_20",
    title: "Orb Crescendo",
    description: "Reach a 20-orb combo in a single run.",
    requirement: { minOrbCombo: 20 },
    progressKey: "maxOrbComboInRun",
    reward: "Unlocks the Bee Stripes icon"
  },
  {
    id: "orb_combo_50",
    title: "Orb Maestro",
    description: "Reach a 50-orb combo in a single run.",
    requirement: { minOrbCombo: 50 },
    progressKey: "maxOrbComboInRun",
    reward: "Cosmetics coming soon"
  },
  {
    id: "perfect_combo_10",
    title: "Perfect Rhythm",
    description: "Chain a 10-gap perfect combo in one run.",
    requirement: { minPerfectCombo: 10 },
    progressKey: "maxPerfectComboInRun",
    reward: "Cosmetics coming soon"
  },
  {
    id: "pipes_dodged_run_500",
    title: "Pipe Whisperer",
    description: "Dodge 500 pipes in a single run.",
    requirement: { minPipesDodged: 500 },
    progressKey: "maxPipesDodgedInRun",
    reward: "Cosmetics coming soon"
  },
  {
    id: "pipes_dodged_run_1000",
    title: "Pipe Marathoner",
    description: "Dodge 1,000 pipes in a single run.",
    requirement: { minPipesDodged: 1_000 },
    progressKey: "maxPipesDodgedInRun",
    reward: "Cosmetics coming soon"
  },
  {
    id: "pipes_dodged_total_10000",
    title: "Skyway Veteran",
    description: "Dodge 10,000 pipes total across all runs.",
    requirement: { totalPipesDodged: 10_000 },
    progressKey: "totalPipesDodged",
    reward: "Cosmetics coming soon"
  },
  {
    id: "pipes_broken_explosion_10",
    title: "Pipe Shatterburst",
    description: "Break 10 pipes in a single explosion.",
    requirement: { minBrokenPipesInExplosion: 10 },
    progressKey: "maxBrokenPipesInExplosion",
    reward: "Unlocks Honeycomb trail"
  },
  {
    id: "pipes_broken_run_100",
    title: "Shatterstorm Run",
    description: "Break 100 pipes in one run.",
    requirement: { minBrokenPipesInRun: 100 },
    progressKey: "maxBrokenPipesInRun",
    reward: "Unlocks the Lemon Slice icon"
  },
  {
    id: "pipes_broken_total_1000",
    title: "Pipe Purger",
    description: "Break 1,000 pipes total across all runs.",
    requirement: { totalBrokenPipes: 1_000 },
    progressKey: "totalBrokenPipes",
    reward: "Unlocks the Midnight Honeycomb icon"
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
  maxOrbComboInRun: 0,
  maxPerfectComboInRun: 0,
  maxPipesDodgedInRun: 0,
  totalPipesDodged: 0,
  totalScore: 0,
  maxRunTime: 0,
  totalRunTime: 0,
  totalRuns: 0,
  maxBrokenPipesInExplosion: 0,
  maxBrokenPipesInRun: 0,
  totalBrokenPipes: 0,
  skillTotals: DEFAULT_SKILL_TOTALS,
  bestRunProgress: {}
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

function clampPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

const RUN_REQUIREMENT_CONFIG = Object.freeze([
  { key: "minScore", type: "min", getValue: (ctx) => ctx.score, hasValue: () => true },
  { key: "maxOrbs", type: "max", getValue: (ctx) => ctx.orbs, hasValue: (ctx) => ctx.hasOrbs },
  { key: "maxAbilities", type: "max", getValue: (ctx) => ctx.abilities, hasValue: (ctx) => ctx.hasAbilities },
  { key: "minOrbs", type: "min", getValue: (ctx) => ctx.orbs, hasValue: (ctx) => ctx.hasOrbs },
  { key: "minPerfects", type: "min", getValue: (ctx) => ctx.perfects, hasValue: (ctx) => ctx.hasPerfects },
  { key: "minPipesDodged", type: "min", getValue: (ctx) => ctx.pipesDodged, hasValue: (ctx) => ctx.hasPipesDodged },
  { key: "minOrbCombo", type: "min", getValue: (ctx) => ctx.orbCombo, hasValue: (ctx) => ctx.hasOrbCombo },
  { key: "minPerfectCombo", type: "min", getValue: (ctx) => ctx.perfectCombo, hasValue: (ctx) => ctx.hasPerfectCombo },
  { key: "minRunTime", type: "min", getValue: (ctx) => ctx.runTime, hasValue: (ctx) => ctx.hasRunTime },
  { key: "minBrokenPipesInExplosion", type: "min", getValue: (ctx) => ctx.brokenExplosion, hasValue: (ctx) => ctx.hasBrokenExplosion },
  { key: "minBrokenPipesInRun", type: "min", getValue: (ctx) => ctx.brokenPipes, hasValue: (ctx) => ctx.hasBrokenPipes }
]);

function getRunRequirementEntries(requirement) {
  if (!requirement || typeof requirement !== "object") return [];
  return RUN_REQUIREMENT_CONFIG.filter((entry) => requirement[entry.key] !== undefined);
}

function computeRunRequirementPercent(requirement, context) {
  const entries = getRunRequirementEntries(requirement);
  if (entries.length <= 1) return null;
  let sum = 0;
  for (const entry of entries) {
    const target = Number(requirement[entry.key]);
    if (!Number.isFinite(target)) {
      sum += 0;
      continue;
    }
    if (!entry.hasValue(context)) {
      sum += 0;
      continue;
    }
    const value = entry.getValue(context);
    if (!Number.isFinite(value)) {
      sum += 0;
      continue;
    }
    if (entry.type === "max") {
      if (target <= 0) {
        sum += value <= target ? 1 : 0;
      } else if (value <= target) {
        sum += 1;
      } else {
        sum += clampPercent(target / value);
      }
    } else if (target <= 0) {
      sum += 1;
    } else {
      sum += clampPercent(value / target);
    }
  }
  return clampPercent(sum / entries.length);
}

function normalizeAchievementState(raw) {
  const unlocked = {};
  if (raw?.unlocked && typeof raw.unlocked === "object") {
    for (const [id, ts] of Object.entries(raw.unlocked)) {
      const safeTs = clampTimestamp(ts);
      if (safeTs) unlocked[id] = safeTs;
    }
  }

  const progress = {
    ...DEFAULT_PROGRESS,
    skillTotals: { ...DEFAULT_PROGRESS.skillTotals },
    bestRunProgress: { ...DEFAULT_PROGRESS.bestRunProgress }
  };
  if (raw?.progress && typeof raw.progress === "object") {
    for (const key of Object.keys(DEFAULT_PROGRESS)) {
      if (raw.progress[key] !== undefined) {
        if (key === "skillTotals") {
          progress.skillTotals = normalizeSkillTotals(raw.progress.skillTotals);
        } else if (key === "bestRunProgress") {
          if (raw.progress.bestRunProgress && typeof raw.progress.bestRunProgress === "object") {
            progress.bestRunProgress = {};
            for (const [id, pct] of Object.entries(raw.progress.bestRunProgress)) {
              progress.bestRunProgress[id] = clampPercent(pct);
            }
          }
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
    return {
      ok: true,
      stats: {
        orbsCollected: null,
        abilitiesUsed: null,
        perfects: null,
        pipesDodged: null,
        maxOrbCombo: null,
        maxPerfectCombo: null,
        brokenPipes: null,
        maxBrokenPipesInExplosion: null,
        runTime: null,
        skillUsage: null
      }
    };
  }
  if (typeof raw !== "object") return { ok: false, error: "invalid_run_stats" };

  const orbs = parseNonNegativeInt(raw.orbsCollected);
  const abilities = parseNonNegativeInt(raw.abilitiesUsed);
  const perfects = parseNonNegativeInt(raw.perfects);
  const pipesDodged = parseNonNegativeInt(raw.pipesDodged);
  const maxOrbCombo = parseNonNegativeInt(raw.maxOrbCombo);
  const maxPerfectCombo = parseNonNegativeInt(raw.maxPerfectCombo);
  const brokenPipes = parseNonNegativeInt(raw.brokenPipes);
  const maxBrokenPipesInExplosion = parseNonNegativeInt(raw.maxBrokenPipesInExplosion);
  const runTime = parseNonNegativeInt(raw.runTime);
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
  if (raw.pipesDodged !== undefined && raw.pipesDodged !== null && pipesDodged === null) {
    return { ok: false, error: "invalid_run_stats" };
  }
  if (raw.maxOrbCombo !== undefined && raw.maxOrbCombo !== null && maxOrbCombo === null) {
    return { ok: false, error: "invalid_run_stats" };
  }
  if (raw.maxPerfectCombo !== undefined && raw.maxPerfectCombo !== null && maxPerfectCombo === null) {
    return { ok: false, error: "invalid_run_stats" };
  }
  if (raw.brokenPipes !== undefined && raw.brokenPipes !== null && brokenPipes === null) {
    return { ok: false, error: "invalid_run_stats" };
  }
  if (raw.maxBrokenPipesInExplosion !== undefined && raw.maxBrokenPipesInExplosion !== null && maxBrokenPipesInExplosion === null) {
    return { ok: false, error: "invalid_run_stats" };
  }
  if (raw.runTime !== undefined && raw.runTime !== null && runTime === null) {
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
      pipesDodged,
      maxOrbCombo,
      maxPerfectCombo,
      brokenPipes,
      maxBrokenPipesInExplosion,
      runTime,
      skillUsage: skills
    }
  };
}

function evaluateRunForAchievements({
  previous,
  runStats,
  score,
  totalScore,
  totalRuns,
  bestScore,
  now = Date.now(),
  definitions = ACHIEVEMENTS
} = {}) {
  const state = normalizeAchievementState(previous);
  const unlocked = [];

  const safeScore = clampScoreProgress(score);
  const baseBestScore = clampScoreProgress(
    Math.max(previous?.progress?.bestScore ?? 0, bestScore ?? 0)
  );
  const {
    orbsCollected,
    abilitiesUsed,
    perfects,
    pipesDodged,
    maxOrbCombo,
    maxPerfectCombo,
    brokenPipes,
    maxBrokenPipesInExplosion,
    runTime,
    skillUsage
  } = runStats || {};
  const hasOrbs = orbsCollected !== null && orbsCollected !== undefined;
  const hasAbilities = abilitiesUsed !== null && abilitiesUsed !== undefined;
  const hasPerfects = perfects !== null && perfects !== undefined;
  const hasPipesDodged = pipesDodged !== null && pipesDodged !== undefined;
  const hasOrbCombo = maxOrbCombo !== null && maxOrbCombo !== undefined;
  const hasPerfectCombo = maxPerfectCombo !== null && maxPerfectCombo !== undefined;
  const safeOrbs = clampScoreProgress(orbsCollected ?? 0);
  const safeAbilities = hasAbilities ? abilitiesUsed : null;
  const safePerfects = clampScoreProgress(perfects ?? 0);
  const safePipesDodged = clampScoreProgress(pipesDodged ?? 0);
  const safeOrbCombo = clampScoreProgress(maxOrbCombo ?? 0);
  const safePerfectCombo = clampScoreProgress(maxPerfectCombo ?? 0);
  const safeBrokenPipes = clampScoreProgress(brokenPipes ?? 0);
  const safeBrokenExplosion = clampScoreProgress(maxBrokenPipesInExplosion ?? 0);
  const safeRunTime = clampScoreProgress(runTime ?? 0);
  const baseTotalScore = totalScore === undefined ? state.progress.totalScore : clampScoreProgress(totalScore);
  const baseTotalRuns = totalRuns === undefined ? state.progress.totalRuns : clampScoreProgress(totalRuns);
  const safeSkillTotals = skillUsage ? normalizeSkillTotals(skillUsage) : null;

  const bestScoreProgress = Math.max(safeScore, baseBestScore, state.progress.bestScore || 0);
  state.progress.bestScore = bestScoreProgress;
  state.progress.totalScore = clampScoreProgress(baseTotalScore + safeScore);
  state.progress.totalRuns = clampScoreProgress(baseTotalRuns + 1);
  if (hasOrbs) {
    state.progress.totalOrbsCollected = clampScoreProgress(state.progress.totalOrbsCollected + safeOrbs);
    state.progress.maxOrbsInRun = Math.max(state.progress.maxOrbsInRun, safeOrbs);
  }
  if (hasPerfects) {
    state.progress.totalPerfects = clampScoreProgress(state.progress.totalPerfects + safePerfects);
    state.progress.maxPerfectsInRun = Math.max(state.progress.maxPerfectsInRun, safePerfects);
  }
  if (hasPipesDodged) {
    state.progress.totalPipesDodged = clampScoreProgress(state.progress.totalPipesDodged + safePipesDodged);
    state.progress.maxPipesDodgedInRun = Math.max(state.progress.maxPipesDodgedInRun, safePipesDodged);
  }
  if (hasOrbCombo) {
    state.progress.maxOrbComboInRun = Math.max(state.progress.maxOrbComboInRun, safeOrbCombo);
  }
  if (hasPerfectCombo) {
    state.progress.maxPerfectComboInRun = Math.max(state.progress.maxPerfectComboInRun, safePerfectCombo);
  }
  if (runTime !== null && runTime !== undefined) {
    state.progress.maxRunTime = Math.max(state.progress.maxRunTime, safeRunTime);
    state.progress.totalRunTime = clampScoreProgress(state.progress.totalRunTime + safeRunTime);
  }
  if (brokenPipes !== null && brokenPipes !== undefined) {
    state.progress.totalBrokenPipes = clampScoreProgress(state.progress.totalBrokenPipes + safeBrokenPipes);
    state.progress.maxBrokenPipesInRun = Math.max(state.progress.maxBrokenPipesInRun, safeBrokenPipes);
  }
  if (maxBrokenPipesInExplosion !== null && maxBrokenPipesInExplosion !== undefined) {
    state.progress.maxBrokenPipesInExplosion = Math.max(state.progress.maxBrokenPipesInExplosion, safeBrokenExplosion);
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

  const runRequirementContext = {
    score: safeScore,
    orbs: safeOrbs,
    abilities: safeAbilities,
    perfects: safePerfects,
    pipesDodged: safePipesDodged,
    orbCombo: safeOrbCombo,
    perfectCombo: safePerfectCombo,
    brokenPipes: safeBrokenPipes,
    brokenExplosion: safeBrokenExplosion,
    runTime: safeRunTime,
    hasOrbs,
    hasAbilities,
    hasPerfects,
    hasPipesDodged,
    hasOrbCombo,
    hasPerfectCombo,
    hasBrokenPipes: brokenPipes !== null && brokenPipes !== undefined,
    hasBrokenExplosion: maxBrokenPipesInExplosion !== null && maxBrokenPipesInExplosion !== undefined,
    hasRunTime: runTime !== null && runTime !== undefined
  };
  if (!state.progress.bestRunProgress || typeof state.progress.bestRunProgress !== "object") {
    state.progress.bestRunProgress = {};
  }

  for (const def of definitions) {
    if (state.unlocked[def.id]) continue;
    const runPercent = computeRunRequirementPercent(def.requirement, runRequirementContext);
    if (runPercent !== null) {
      const currentBest = clampPercent(state.progress.bestRunProgress[def.id] ?? 0);
      if (runPercent > currentBest) {
        state.progress.bestRunProgress[def.id] = runPercent;
      }
    }
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
    const minPipesDodgedOk =
      def.requirement?.minPipesDodged === undefined
        ? true
        : hasPipesDodged && safePipesDodged >= def.requirement.minPipesDodged;
    const totalPipesDodgedOk =
      def.requirement?.totalPipesDodged === undefined
        ? true
        : state.progress.totalPipesDodged >= def.requirement.totalPipesDodged;
    const minOrbComboOk =
      def.requirement?.minOrbCombo === undefined
        ? true
        : hasOrbCombo && safeOrbCombo >= def.requirement.minOrbCombo;
    const minPerfectComboOk =
      def.requirement?.minPerfectCombo === undefined
        ? true
        : hasPerfectCombo && safePerfectCombo >= def.requirement.minPerfectCombo;
    const minRunTimeOk =
      def.requirement?.minRunTime === undefined
        ? true
        : runTime !== null && runTime !== undefined && safeRunTime >= def.requirement.minRunTime;
    const totalRunTimeOk =
      def.requirement?.totalRunTime === undefined
        ? true
        : state.progress.totalRunTime >= def.requirement.totalRunTime;
    const totalRunsOk =
      def.requirement?.totalRuns === undefined
        ? true
        : state.progress.totalRuns >= def.requirement.totalRuns;
    const minBrokenExplosionOk =
      def.requirement?.minBrokenPipesInExplosion === undefined
        ? true
        : maxBrokenPipesInExplosion !== null && safeBrokenExplosion >= def.requirement.minBrokenPipesInExplosion;
    const minBrokenRunOk =
      def.requirement?.minBrokenPipesInRun === undefined
        ? true
        : brokenPipes !== null && safeBrokenPipes >= def.requirement.minBrokenPipesInRun;
    const totalBrokenOk =
      def.requirement?.totalBrokenPipes === undefined
        ? true
        : state.progress.totalBrokenPipes >= def.requirement.totalBrokenPipes;
    const totalScoreOk =
      def.requirement?.totalScore === undefined
        ? true
        : state.progress.totalScore >= def.requirement.totalScore;
    const minSkillUsesOk = (() => {
      if (def.requirement?.minSkillUses === undefined) return true;
      const requirements = def.requirement.minSkillUses;
      if (!requirements || typeof requirements !== "object") return false;
      const totals = state.progress.skillTotals || DEFAULT_SKILL_TOTALS;
      return SKILL_IDS.every((id) => {
        const required = Number(requirements[id] ?? 0);
        if (!Number.isFinite(required) || required <= 0) return true;
        return totals[id] >= required;
      });
    })();

    if (
      meetsScore &&
      orbsOk &&
      abilitiesOk &&
      totalOrbsOk &&
      minOrbsOk &&
      totalPerfectsOk &&
      minPerfectsOk &&
      minPipesDodgedOk &&
      totalPipesDodgedOk &&
      minOrbComboOk &&
      minPerfectComboOk &&
      minRunTimeOk &&
      totalRunTimeOk &&
      totalRunsOk &&
      minBrokenExplosionOk &&
      minBrokenRunOk &&
      totalBrokenOk &&
      totalScoreOk &&
      minSkillUsesOk
    ) {
      state.unlocked[def.id] = now;
      unlocked.push(def.id);
    }
  }

  return { state, unlocked };
}

function buildAchievementsPayload(user, unlocked = [], definitions = ACHIEVEMENTS) {
  const state = normalizeAchievementState(user?.achievements);
  const seen = new Set();
  const uniqueUnlocked = [];
  for (const id of unlocked || []) {
    if (seen.has(id)) continue;
    seen.add(id);
    uniqueUnlocked.push(id);
  }
  return { definitions, state, unlocked: uniqueUnlocked };
}

module.exports = {
  ACHIEVEMENTS,
  DEFAULT_PROGRESS,
  normalizeAchievementState,
  validateRunStats,
  evaluateRunForAchievements,
  buildAchievementsPayload
};
