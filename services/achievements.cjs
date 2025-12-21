"use strict";

const ACHIEVEMENTS = Object.freeze([
  {
    id: "no_orbs_100",
    title: "Orb-Free Century",
    description: "Score 100 points without picking up an orb.",
    requirement: { minScore: 100, maxOrbs: 0 },
    reward: "Cosmetics coming soon"
  },
  {
    id: "no_abilities_100",
    title: "Ability-Free Century",
    description: "Score 100 points without using an ability.",
    requirement: { minScore: 100, maxAbilities: 0 },
    reward: "Cosmetics coming soon"
  }
]);

const DEFAULT_PROGRESS = Object.freeze({
  maxScoreNoOrbs: 0,
  maxScoreNoAbilities: 0
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
    if (raw.progress.maxScoreNoOrbs !== undefined) {
      progress.maxScoreNoOrbs = clampScoreProgress(raw.progress.maxScoreNoOrbs);
    }
    if (raw.progress.maxScoreNoAbilities !== undefined) {
      progress.maxScoreNoAbilities = clampScoreProgress(raw.progress.maxScoreNoAbilities);
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
    return { ok: true, stats: { orbsCollected: null, abilitiesUsed: null } };
  }
  if (typeof raw !== "object") return { ok: false, error: "invalid_run_stats" };

  const orbs = parseNonNegativeInt(raw.orbsCollected);
  const abilities = parseNonNegativeInt(raw.abilitiesUsed);

  if (raw.orbsCollected !== undefined && raw.orbsCollected !== null && orbs === null) {
    return { ok: false, error: "invalid_run_stats" };
  }
  if (raw.abilitiesUsed !== undefined && raw.abilitiesUsed !== null && abilities === null) {
    return { ok: false, error: "invalid_run_stats" };
  }

  return {
    ok: true,
    stats: {
      orbsCollected: orbs,
      abilitiesUsed: abilities
    }
  };
}

function evaluateRunForAchievements({ previous, runStats, score, now = Date.now() } = {}) {
  const state = normalizeAchievementState(previous);
  const unlocked = [];

  if (!runStats || (runStats.orbsCollected === null && runStats.abilitiesUsed === null)) {
    return { state, unlocked };
  }

  const safeScore = clampScoreProgress(score);
  const { orbsCollected, abilitiesUsed } = runStats;

  if (orbsCollected === 0) {
    state.progress.maxScoreNoOrbs = Math.max(state.progress.maxScoreNoOrbs, safeScore);
  }
  if (abilitiesUsed === 0) {
    state.progress.maxScoreNoAbilities = Math.max(state.progress.maxScoreNoAbilities, safeScore);
  }

  for (const def of ACHIEVEMENTS) {
    if (state.unlocked[def.id]) continue;
    const minScore = def.requirement?.minScore ?? 0;
    const meetsScore = safeScore >= minScore;

    const orbsOk =
      def.requirement?.maxOrbs === undefined
        ? true
        : orbsCollected !== null && orbsCollected <= def.requirement.maxOrbs;
    const abilitiesOk =
      def.requirement?.maxAbilities === undefined
        ? true
        : abilitiesUsed !== null && abilitiesUsed <= def.requirement.maxAbilities;

    if (meetsScore && orbsOk && abilitiesOk) {
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
