import { normalizeAchievementState } from "./achievements.js";

export const GAME_OVER_STAT_VIEWS = Object.freeze({
  run: "run",
  lifetime: "lifetime"
});

const RUN_LABELS = Object.freeze({
  orb: "Best orb combo (this run)",
  perfect: "Best perfect combo (this run)",
  skillUsage: "Skill usage (this run)",
  toggle: "Show lifetime stats",
  mode: "Run stats"
});

const LIFETIME_LABELS = Object.freeze({
  orb: "Best orb combo (lifetime)",
  perfect: "Best perfect combo (lifetime)",
  skillUsage: "Skill usage (lifetime)",
  toggle: "Show run stats",
  mode: "Lifetime stats"
});

function clampCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function normalizeSkillTotals(skillTotals) {
  if (!skillTotals || typeof skillTotals !== "object") return null;
  const entries = Object.entries(skillTotals);
  if (!entries.length) return null;
  const normalized = {};
  for (const [key, value] of entries) {
    normalized[key] = clampCount(value);
  }
  return normalized;
}

function normalizeRunStats(runStats = null) {
  return {
    maxOrbCombo: clampCount(runStats?.maxOrbCombo),
    maxPerfectCombo: clampCount(runStats?.maxPerfectCombo),
    skillUsage: runStats?.skillUsage && typeof runStats.skillUsage === "object" ? runStats.skillUsage : null
  };
}

function normalizeLifetimeStats(achievementsState = null, skillTotals = null) {
  const state = normalizeAchievementState(achievementsState);
  const progress = state.progress || {};
  const rawTotals = normalizeSkillTotals(skillTotals)
    || normalizeSkillTotals(achievementsState?.progress?.skillTotals)
    || normalizeSkillTotals(achievementsState?.skillTotals)
    || normalizeSkillTotals(progress.skillTotals);
  return {
    maxOrbCombo: clampCount(progress.maxOrbComboInRun),
    maxPerfectCombo: clampCount(progress.maxPerfectComboInRun),
    skillUsage: rawTotals
  };
}

export function buildGameOverStats({ view, runStats, achievementsState, skillTotals } = {}) {
  const normalizedView = view === GAME_OVER_STAT_VIEWS.lifetime ? GAME_OVER_STAT_VIEWS.lifetime : GAME_OVER_STAT_VIEWS.run;
  const run = normalizeRunStats(runStats);
  const lifetime = normalizeLifetimeStats(achievementsState, skillTotals);
  const source = normalizedView === GAME_OVER_STAT_VIEWS.lifetime ? lifetime : run;
  const labels = normalizedView === GAME_OVER_STAT_VIEWS.lifetime ? LIFETIME_LABELS : RUN_LABELS;
  return {
    view: normalizedView,
    combo: {
      orb: source.maxOrbCombo,
      perfect: source.maxPerfectCombo
    },
    skillUsage: source.skillUsage,
    labels
  };
}
