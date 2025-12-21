// =====================
// FILE: public/js/achievements.js
// =====================
import { clamp } from "./util.js";

export const ACHIEVEMENTS = Object.freeze([
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

const DEFAULT_STATE = Object.freeze({
  unlocked: Object.freeze({}),
  progress: Object.freeze({
    maxScoreNoOrbs: 0,
    maxScoreNoAbilities: 0,
    maxPerfectsInRun: 0,
    totalPerfects: 0,
    maxOrbsInRun: 0,
    totalOrbsCollected: 0,
    totalScore: 0
  })
});

function clampScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(1_000_000_000, Math.floor(n));
}

export function normalizeAchievementState(raw) {
  const unlocked = {};
  if (raw?.unlocked && typeof raw.unlocked === "object") {
    for (const [id, ts] of Object.entries(raw.unlocked)) {
      const n = Number(ts);
      if (Number.isFinite(n) && n > 0) unlocked[id] = Math.floor(n);
    }
  }

  const progress = {
    ...DEFAULT_STATE.progress
  };
  for (const key of Object.keys(DEFAULT_STATE.progress)) {
    const val = raw?.progress?.[key];
    if (val !== undefined) progress[key] = clampScore(val);
  }

  return { unlocked, progress };
}

export function resolveAchievementState(state) {
  if (!state || typeof state !== "object") return normalizeAchievementState(DEFAULT_STATE);
  return normalizeAchievementState(state);
}

function progressFor(def, state) {
  const req = def?.requirement || {};
  const key = def?.progressKey;
  const best = key ? (state.progress?.[key] || 0) : 0;
  const target =
    req.minScore ?? req.totalScore ?? req.minPerfects ?? req.totalPerfects ?? req.minOrbs ?? req.totalOrbs ?? 0;
  const pct = target > 0 ? clamp(best / target, 0, 1) : 1;
  return { best, pct, target };
}

export function renderAchievementsList(listEl, payload = {}) {
  if (!listEl) return;
  const definitions = payload.definitions?.length ? payload.definitions : ACHIEVEMENTS;
  const state = resolveAchievementState(payload.state || payload);

  listEl.innerHTML = "";

  definitions.forEach((def) => {
    const item = document.createElement("div");
    item.className = "achievement-row";

    const title = document.createElement("div");
    title.className = "achievement-title";
    title.textContent = def.title;

    const desc = document.createElement("div");
    desc.className = "achievement-desc";
    desc.textContent = def.description;

    const reward = document.createElement("div");
    reward.className = "achievement-reward";
    reward.textContent = def.reward || "Reward: Coming soon";

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
      status.classList.add("unlocked");
      status.textContent = "Unlocked!";
      fill.classList.add("filled");
    } else {
      const needed = Math.max(0, target - best);
      status.textContent = `Progress: ${best}/${target || 0} (needs ${needed} more)`;
    }

    item.append(title, desc, reward, meter, status);
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
  progressFor
};
