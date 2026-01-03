// =====================
// FILE: public/js/achievements.js
// =====================
import { clamp } from "./util.js";

export const ACHIEVEMENTS = Object.freeze([
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

const SKILL_IDS = Object.freeze(["dash", "phase", "teleport", "slowField"]);

const DEFAULT_SKILL_TOTALS = Object.freeze({
  dash: 0,
  phase: 0,
  teleport: 0,
  slowField: 0
});

const DEFAULT_STATE = Object.freeze({
  unlocked: Object.freeze({}),
  progress: Object.freeze({
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
  })
});

function clampScore(v) {
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

const ACHIEVEMENT_CATEGORIES = Object.freeze({
  score: "score",
  perfects: "perfects",
  orbs: "orbs",
  pipes: "pipes",
  other: "other"
});

const ACHIEVEMENT_CATEGORY_LABELS = Object.freeze({
  [ACHIEVEMENT_CATEGORIES.score]: "Score",
  [ACHIEVEMENT_CATEGORIES.perfects]: "Perfect Gaps",
  [ACHIEVEMENT_CATEGORIES.orbs]: "Orb Collection",
  [ACHIEVEMENT_CATEGORIES.pipes]: "Pipes",
  [ACHIEVEMENT_CATEGORIES.other]: "Special"
});

export function normalizeAchievementState(raw) {
  const unlocked = {};
  if (raw?.unlocked && typeof raw.unlocked === "object") {
    for (const [id, ts] of Object.entries(raw.unlocked)) {
      const n = Number(ts);
      if (Number.isFinite(n) && n > 0) unlocked[id] = Math.floor(n);
    }
  }

  const progress = {
    ...DEFAULT_STATE.progress,
    skillTotals: { ...DEFAULT_SKILL_TOTALS },
    bestRunProgress: { ...DEFAULT_STATE.progress.bestRunProgress }
  };
  for (const key of Object.keys(DEFAULT_STATE.progress)) {
    const val = raw?.progress?.[key];
    if (val === undefined) continue;
    if (key === "skillTotals") {
      const src = val && typeof val === "object" ? val : {};
      for (const skillId of SKILL_IDS) {
        if (src[skillId] !== undefined) progress.skillTotals[skillId] = clampScore(src[skillId]);
      }
    } else if (key === "bestRunProgress") {
      if (val && typeof val === "object") {
        progress.bestRunProgress = {};
        for (const [id, pct] of Object.entries(val)) {
          progress.bestRunProgress[id] = clampPercent(pct);
        }
      }
    } else {
      progress[key] = clampScore(val);
    }
  }

  return { unlocked, progress };
}

export function resolveAchievementState(state) {
  if (!state || typeof state !== "object") return normalizeAchievementState(DEFAULT_STATE);
  return normalizeAchievementState(state);
}

export function evaluateRunForAchievements({
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

  const safeScore = clampScore(score);
  const baseBestScore = clampScore(
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
    runTime
  } = runStats || {};
  const hasOrbs = orbsCollected !== null && orbsCollected !== undefined;
  const hasAbilities = abilitiesUsed !== null && abilitiesUsed !== undefined;
  const hasPerfects = perfects !== null && perfects !== undefined;
  const hasPipesDodged = pipesDodged !== null && pipesDodged !== undefined;
  const hasOrbCombo = maxOrbCombo !== null && maxOrbCombo !== undefined;
  const hasPerfectCombo = maxPerfectCombo !== null && maxPerfectCombo !== undefined;
  const safeOrbs = clampScore(orbsCollected ?? 0);
  const safeAbilities = hasAbilities ? clampScore(abilitiesUsed ?? 0) : null;
  const safePerfects = clampScore(perfects ?? 0);
  const safePipesDodged = clampScore(pipesDodged ?? 0);
  const safeOrbCombo = clampScore(maxOrbCombo ?? 0);
  const safePerfectCombo = clampScore(maxPerfectCombo ?? 0);
  const safeBrokenPipes = clampScore(brokenPipes ?? 0);
  const safeBrokenExplosion = clampScore(maxBrokenPipesInExplosion ?? 0);
  const safeRunTime = clampScore(runTime ?? 0);
  const baseTotalScore = totalScore === undefined ? state.progress.totalScore : clampScore(totalScore);
  const baseTotalRuns = totalRuns === undefined ? state.progress.totalRuns : clampScore(totalRuns);

  const bestScoreProgress = Math.max(safeScore, baseBestScore, state.progress.bestScore || 0);
  state.progress.bestScore = bestScoreProgress;
  state.progress.totalScore = clampScore(baseTotalScore + safeScore);
  state.progress.totalRuns = clampScore(baseTotalRuns + 1);
  if (hasOrbs) {
    state.progress.totalOrbsCollected = clampScore(state.progress.totalOrbsCollected + safeOrbs);
    state.progress.maxOrbsInRun = Math.max(state.progress.maxOrbsInRun, safeOrbs);
  }
  if (hasPerfects) {
    state.progress.totalPerfects = clampScore(state.progress.totalPerfects + safePerfects);
    state.progress.maxPerfectsInRun = Math.max(state.progress.maxPerfectsInRun, safePerfects);
  }
  if (hasPipesDodged) {
    state.progress.totalPipesDodged = clampScore(state.progress.totalPipesDodged + safePipesDodged);
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
    state.progress.totalRunTime = clampScore(state.progress.totalRunTime + safeRunTime);
  }
  if (brokenPipes !== null && brokenPipes !== undefined) {
    state.progress.totalBrokenPipes = clampScore(state.progress.totalBrokenPipes + safeBrokenPipes);
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
  if (runStats?.skillUsage && typeof runStats.skillUsage === "object") {
    const totals = state.progress.skillTotals || DEFAULT_SKILL_TOTALS;
    const merged = {};
    for (const id of SKILL_IDS) {
      merged[id] = clampScore((totals[id] || 0) + clampScore(runStats.skillUsage[id]));
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

function progressFor(def, state) {
  const req = def?.requirement || {};
  const runRequirementEntries = getRunRequirementEntries(req);
  if (runRequirementEntries.length > 1) {
    const pct = clampPercent(state.progress?.bestRunProgress?.[def.id] ?? 0);
    return { best: Math.round(pct * 100), pct, target: 100 };
  }
  const key = def?.progressKey;
  if (key === "skillTotals") {
    const totals = state.progress?.skillTotals || {};
    const best = Object.values(totals).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const target = req.minSkillUses
      ? Object.values(req.minSkillUses).reduce((sum, val) => sum + (Number(val) || 0), 0)
      : 0;
    const pct = target > 0 ? clamp(best / target, 0, 1) : 1;
    return { best, pct, target };
  }
  const best = key ? (state.progress?.[key] || 0) : 0;
  const target = (() => {
    if (!key) return 0;
    if (key === "bestScore") return req.minScore ?? 0;
    if (key === "totalScore") return req.totalScore ?? 0;
    if (key === "totalRuns") return req.totalRuns ?? 0;
    if (key === "totalRunTime") return req.totalRunTime ?? 0;
    if (key === "maxRunTime") return req.minRunTime ?? 0;
    if (key === "maxOrbsInRun") return req.minOrbs ?? 0;
    if (key === "totalOrbsCollected") return req.totalOrbs ?? 0;
    if (key === "maxPerfectsInRun") return req.minPerfects ?? 0;
    if (key === "totalPerfects") return req.totalPerfects ?? 0;
    if (key === "maxOrbComboInRun") return req.minOrbCombo ?? 0;
    if (key === "maxPerfectComboInRun") return req.minPerfectCombo ?? 0;
    if (key === "maxPipesDodgedInRun") return req.minPipesDodged ?? 0;
    if (key === "totalPipesDodged") return req.totalPipesDodged ?? 0;
    if (key === "maxBrokenPipesInExplosion") return req.minBrokenPipesInExplosion ?? 0;
    if (key === "maxBrokenPipesInRun") return req.minBrokenPipesInRun ?? 0;
    if (key === "totalBrokenPipes") return req.totalBrokenPipes ?? 0;
    return 0;
  })();
  const pct = target > 0 ? clamp(best / target, 0, 1) : 1;
  return { best, pct, target };
}

function classifyAchievement(def) {
  const req = def?.requirement || {};
  if (req.minPerfects !== undefined || req.totalPerfects !== undefined) return ACHIEVEMENT_CATEGORIES.perfects;
  if (req.minOrbs !== undefined || req.totalOrbs !== undefined || req.minOrbCombo !== undefined) return ACHIEVEMENT_CATEGORIES.orbs;
  if (
    req.minPipesDodged !== undefined ||
    req.totalPipesDodged !== undefined ||
    req.minBrokenPipesInExplosion !== undefined ||
    req.minBrokenPipesInRun !== undefined ||
    req.totalBrokenPipes !== undefined
  ) {
    return ACHIEVEMENT_CATEGORIES.pipes;
  }
  if (req.minScore !== undefined || req.totalScore !== undefined) return ACHIEVEMENT_CATEGORIES.score;
  return ACHIEVEMENT_CATEGORIES.other;
}

function describeRequirement(def) {
  const req = def?.requirement || {};
  const clauses = [];
  if (req.minScore !== undefined) clauses.push(`Score ${req.minScore} in one run`);
  if (req.maxOrbs !== undefined) {
    clauses.push(`Collect at most ${req.maxOrbs} orb${req.maxOrbs === 1 ? "" : "s"} in one run`);
  }
  if (req.maxAbilities !== undefined) {
    const label = req.maxAbilities === 1 ? "ability" : "abilities";
    clauses.push(`Use at most ${req.maxAbilities} ${label} in one run`);
  }
  if (req.totalScore !== undefined) clauses.push(`Score ${req.totalScore} total`);
  if (req.minPerfects !== undefined) {
    clauses.push(`Clear ${req.minPerfects} perfect gap${req.minPerfects === 1 ? "" : "s"} in one run`);
  }
  if (req.totalPerfects !== undefined) {
    clauses.push(`Clear ${req.totalPerfects} perfect gap${req.totalPerfects === 1 ? "" : "s"} total`);
  }
  if (req.minOrbs !== undefined) clauses.push(`Collect ${req.minOrbs} orb${req.minOrbs === 1 ? "" : "s"} in one run`);
  if (req.totalOrbs !== undefined) clauses.push(`Collect ${req.totalOrbs} orb${req.totalOrbs === 1 ? "" : "s"} total`);
  if (req.minOrbCombo !== undefined) clauses.push(`Reach an orb combo of ${req.minOrbCombo} in one run`);
  if (req.minPerfectCombo !== undefined) clauses.push(`Reach a perfect gap combo of ${req.minPerfectCombo} in one run`);
  if (req.minPipesDodged !== undefined) {
    clauses.push(`Dodge ${req.minPipesDodged} pipe${req.minPipesDodged === 1 ? "" : "s"} in one run`);
  }
  if (req.totalPipesDodged !== undefined) {
    clauses.push(`Dodge ${req.totalPipesDodged} pipe${req.totalPipesDodged === 1 ? "" : "s"} total`);
  }
  if (req.minRunTime !== undefined) {
    clauses.push(`Survive for ${req.minRunTime} second${req.minRunTime === 1 ? "" : "s"} in one run`);
  }
  if (req.totalRunTime !== undefined) {
    clauses.push(`Survive for ${req.totalRunTime} second${req.totalRunTime === 1 ? "" : "s"} total`);
  }
  if (req.totalRuns !== undefined) clauses.push(`Play ${req.totalRuns} game${req.totalRuns === 1 ? "" : "s"} total`);
  if (req.minBrokenPipesInExplosion !== undefined) {
    clauses.push(`Break ${req.minBrokenPipesInExplosion} pipe${req.minBrokenPipesInExplosion === 1 ? "" : "s"} in one explosion`);
  }
  if (req.minBrokenPipesInRun !== undefined) {
    clauses.push(`Break ${req.minBrokenPipesInRun} pipe${req.minBrokenPipesInRun === 1 ? "" : "s"} in one run`);
  }
  if (req.totalBrokenPipes !== undefined) {
    clauses.push(`Break ${req.totalBrokenPipes} pipe${req.totalBrokenPipes === 1 ? "" : "s"} total`);
  }
  if (req.minSkillUses && typeof req.minSkillUses === "object") {
    for (const id of SKILL_IDS) {
      const amount = req.minSkillUses[id];
      if (amount !== undefined) {
        clauses.push(`Use ${id} ${amount} time${amount === 1 ? "" : "s"} total`);
      }
    }
  }
  return clauses.length ? clauses.join(" and ") : "Unlock with a special challenge";
}

function normalizeFilters(raw = {}) {
  const allowed = Object.values(ACHIEVEMENT_CATEGORIES);
  const provided = raw.categories !== undefined;
  let selected;
  if (Array.isArray(raw.categories)) {
    selected = raw.categories.filter((c) => allowed.includes(c));
  } else if (raw.categories && typeof raw.categories === "object") {
    selected = allowed.filter((c) => Boolean(raw.categories[c]));
  } else {
    selected = allowed;
  }

  const categories = new Set(selected);
  const requestedEmpty = provided && selected.length === 0;

  return {
    hideCompleted: Boolean(raw.hideCompleted),
    categories,
    requestedEmpty
  };
}

export function renderAchievementsList(listEl, payload = {}) {
  if (!listEl) return;
  const definitions = payload.definitions?.length ? payload.definitions : ACHIEVEMENTS;
  const state = resolveAchievementState(payload.state || payload);
  const filters = normalizeFilters(payload.filters || payload);
  const hideCompleted = filters.hideCompleted;

  listEl.innerHTML = "";

  const filtered = (hideCompleted ? definitions.filter((def) => !state.unlocked?.[def.id]) : definitions)
    .filter((def) => filters.categories.has(classifyAchievement(def)));

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "achievement-empty";
    if (filters.requestedEmpty) {
      empty.textContent = "Select at least one filter to see achievements.";
    } else if (hideCompleted) {
      empty.textContent = "Everything here is unlocked. Toggle the filter or show completed achievements.";
    } else {
      empty.textContent = "Achievements are loading.";
    }
    listEl.append(empty);
    return;
  }

  filtered.forEach((def) => {
    const item = document.createElement("div");
    item.className = "achievement-row";
    const category = classifyAchievement(def);
    item.dataset.category = category;

    const header = document.createElement("div");
    header.className = "achievement-header";

    const title = document.createElement("div");
    title.className = "achievement-title";
    title.textContent = def.title;

    const tag = document.createElement("div");
    tag.className = "achievement-tag";
    tag.textContent = ACHIEVEMENT_CATEGORY_LABELS[category] || "Achievement";
    header.append(title, tag);

    const desc = document.createElement("div");
    desc.className = "achievement-desc";
    desc.textContent = def.description;

    const meta = document.createElement("div");
    meta.className = "achievement-meta";

    const requirement = document.createElement("div");
    requirement.className = "achievement-requirement";
    requirement.textContent = describeRequirement(def);

    const reward = document.createElement("div");
    reward.className = "achievement-reward";
    reward.textContent = def.reward || "Reward: Coming soon";

    meta.append(requirement, reward);

    const status = document.createElement("div");
    status.className = "achievement-status";

    const unlockedAt = state.unlocked?.[def.id];
    const { best, pct, target } = progressFor(def, state);

    const meter = document.createElement("div");
    meter.className = "achievement-meter";
    const fill = document.createElement("div");
    fill.className = "achievement-meter-fill";
    fill.style.width = `${Math.round(pct * 100)}%`;
    meter.append(fill);

    if (unlockedAt) {
      item.classList.add("unlocked");
      status.classList.add("unlocked");
      status.textContent = "Unlocked!";
      fill.classList.add("filled");
    } else {
      const needed = Math.max(0, target - best);
      status.textContent = `Progress: ${best}/${target || 0} (needs ${needed} more)`;
    }

    item.append(header, desc, meta, meter, status);
    listEl.append(item);
  });
}

export function appendAchievementToast(target, def) {
  if (!def) return null;
  const game = target && typeof target.showAchievementPopup === "function" ? target : null;
  if (game) return game.showAchievementPopup(def);

  if (!target) return null;
  const fallback = document.createElement("div");
  fallback.className = "achievement-toast visible";
  fallback.innerHTML = `
    <div class="achievement-toast-title">Achievement unlocked</div>
    <div class="achievement-toast-name">${def.title}</div>
    <div class="achievement-toast-desc">${def.description}</div>
  `;
  target.append(fallback);
  return fallback;
}

export const __testables = {
  progressFor,
  classifyAchievement,
  normalizeFilters
};
