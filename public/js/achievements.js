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
    totalScore: 0
  })
});

function clampScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(1_000_000_000, Math.floor(n));
}

const ACHIEVEMENT_CATEGORIES = Object.freeze({
  score: "score",
  perfects: "perfects",
  orbs: "orbs",
  other: "other"
});

const ACHIEVEMENT_CATEGORY_LABELS = Object.freeze({
  [ACHIEVEMENT_CATEGORIES.score]: "Score",
  [ACHIEVEMENT_CATEGORIES.perfects]: "Perfect Gaps",
  [ACHIEVEMENT_CATEGORIES.orbs]: "Orb Collection",
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

function classifyAchievement(def) {
  const req = def?.requirement || {};
  if (req.minPerfects !== undefined || req.totalPerfects !== undefined) return ACHIEVEMENT_CATEGORIES.perfects;
  if (req.minOrbs !== undefined || req.totalOrbs !== undefined) return ACHIEVEMENT_CATEGORIES.orbs;
  if (req.minScore !== undefined || req.totalScore !== undefined) return ACHIEVEMENT_CATEGORIES.score;
  return ACHIEVEMENT_CATEGORIES.other;
}

function describeRequirement(def) {
  const req = def?.requirement || {};
  if (req.minScore !== undefined) return `Score ${req.minScore} in one run`;
  if (req.totalScore !== undefined) return `Score ${req.totalScore} total`;
  if (req.minPerfects !== undefined) return `Clear ${req.minPerfects} perfect gap${req.minPerfects === 1 ? "" : "s"} in one run`;
  if (req.totalPerfects !== undefined) return `Clear ${req.totalPerfects} perfect gap${req.totalPerfects === 1 ? "" : "s"} total`;
  if (req.minOrbs !== undefined) return `Collect ${req.minOrbs} orb${req.minOrbs === 1 ? "" : "s"} in one run`;
  if (req.totalOrbs !== undefined) return `Collect ${req.totalOrbs} orb${req.totalOrbs === 1 ? "" : "s"} total`;
  return "Unlock with a special challenge";
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
