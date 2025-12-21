"use strict";

const ACHIEVEMENTS = Object.freeze([
  {
    id: "no_orbs_100",
    title: "Orb-Free Century",
    description: "Score 100 points in one run without picking up an orb.",
    requirement: { minScore: 100, maxOrbs: 0 },
    progressKey: "maxScoreNoOrbs",
    reward: "Cosmetics coming soon"
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
    reward: "Cosmetics coming soon"
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
  maxScoreNoOrbs: 0,
  maxScoreNoAbilities: 0,
  maxPerfectsInRun: 0,
  totalPerfects: 0,
  maxOrbsInRun: 0,
  totalOrbsCollected: 0,
  totalScore: 0
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

  const progress = { ...DEFAULT_PROGRESS };
  if (raw?.progress && typeof raw.progress === "object") {
    for (const key of Object.keys(DEFAULT_PROGRESS)) {
      if (raw.progress[key] !== undefined) {
        progress[key] = clampScoreProgress(raw.progress[key]);
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
    return { ok: true, stats: { orbsCollected: null, abilitiesUsed: null, perfects: null } };
  }
  if (typeof raw !== "object") return { ok: false, error: "invalid_run_stats" };

  const orbs = parseNonNegativeInt(raw.orbsCollected);
  const abilities = parseNonNegativeInt(raw.abilitiesUsed);
  const perfects = parseNonNegativeInt(raw.perfects);

  if (raw.orbsCollected !== undefined && raw.orbsCollected !== null && orbs === null) {
    return { ok: false, error: "invalid_run_stats" };
  }
  if (raw.abilitiesUsed !== undefined && raw.abilitiesUsed !== null && abilities === null) {
    return { ok: false, error: "invalid_run_stats" };
  }
  if (raw.perfects !== undefined && raw.perfects !== null && perfects === null) {
    return { ok: false, error: "invalid_run_stats" };
  }

  return {
    ok: true,
    stats: {
      orbsCollected: orbs,
      abilitiesUsed: abilities,
      perfects
    }
  };
}

function evaluateRunForAchievements({ previous, runStats, score, totalScore, now = Date.now() } = {}) {
  const state = normalizeAchievementState(previous);
  const unlocked = [];

  const safeScore = clampScoreProgress(score);
  const { orbsCollected, abilitiesUsed, perfects } = runStats || {};
  const hasOrbs = orbsCollected !== null && orbsCollected !== undefined;
  const hasAbilities = abilitiesUsed !== null && abilitiesUsed !== undefined;
  const hasPerfects = perfects !== null && perfects !== undefined;
  const safeOrbs = clampScoreProgress(orbsCollected ?? 0);
  const safeAbilities = hasAbilities ? abilitiesUsed : null;
  const safePerfects = clampScoreProgress(perfects ?? 0);
  const baseTotalScore = totalScore === undefined ? state.progress.totalScore : clampScoreProgress(totalScore);

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

  for (const def of ACHIEVEMENTS) {
    if (state.unlocked[def.id]) continue;
    const minScore = def.requirement?.minScore ?? 0;
    const meetsScore = safeScore >= minScore;

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
