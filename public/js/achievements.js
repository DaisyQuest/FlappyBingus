// =====================
// FILE: public/js/achievements.js
// =====================
import { clamp } from "./util.js";

export const ACHIEVEMENTS = Object.freeze([
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

const DEFAULT_STATE = Object.freeze({
  unlocked: Object.freeze({}),
  progress: Object.freeze({ maxScoreNoOrbs: 0, maxScoreNoAbilities: 0 })
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
    maxScoreNoOrbs: clampScore(raw?.progress?.maxScoreNoOrbs),
    maxScoreNoAbilities: clampScore(raw?.progress?.maxScoreNoAbilities)
  };

  return { unlocked, progress };
}

export function resolveAchievementState(state) {
  if (!state || typeof state !== "object") return normalizeAchievementState(DEFAULT_STATE);
  return normalizeAchievementState(state);
}

function progressFor(def, state) {
  const minScore = def?.requirement?.minScore ?? 0;
  let best = 0;

  if (def.id === "no_orbs_100") best = state.progress.maxScoreNoOrbs || 0;
  if (def.id === "no_abilities_100") best = state.progress.maxScoreNoAbilities || 0;

  const pct = minScore > 0 ? clamp(best / minScore, 0, 1) : 1;
  return { best, pct };
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
    const { best, pct } = progressFor(def, state);

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
      const needed = Math.max(0, (def.requirement?.minScore || 0) - best);
      status.textContent = `Progress: ${best}/${def.requirement?.minScore || 0} (needs ${needed} more)`;
    }

    item.append(title, desc, reward, meter, status);
    listEl.append(item);
  });
}

export function appendAchievementToast(container, def) {
  if (!container || !def) return null;
  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  toast.innerHTML = `
    <div class="achievement-toast-title">Achievement unlocked</div>
    <div class="achievement-toast-name">${def.title}</div>
    <div class="achievement-toast-desc">${def.description}</div>
  `;
  container.append(toast);

  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => toast.classList.add("fade"), 3800);
  setTimeout(() => toast.remove(), 4400);
  return toast;
}

export const __testables = {
  progressFor
};
