// =====================
// FILE: public/js/playerIcons.js
// Player icon definitions + helpers for unlock logic and UI presentation.
// =====================
import { DEFAULT_CURRENCY_ID, formatCurrencyAmount, normalizeCurrencyId } from "./currencySystem.js";

export const DEFAULT_PLAYER_ICON_ID = "hi_vis_orange";

export const DEFAULT_PLAYER_ICONS = Object.freeze([
  {
    id: DEFAULT_PLAYER_ICON_ID,
    name: "High-Vis Orange",
    unlock: { type: "free", label: "Free" },
    style: {
      fill: "#ff8c1a",
      core: "#ffc285",
      rim: "#0f172a",
      glow: "#ffe8c2"
    }
  },
  {
    id: "hi_vis_red",
    name: "High-Vis Red",
    unlock: { type: "free", label: "Free" },
    style: {
      fill: "#ff3b30",
      core: "#ff7b72",
      rim: "#0f172a",
      glow: "#ffd7d3"
    }
  },
  {
    id: "perfect_ten_liner",
    name: "Perfect Line Beacon",
    unlock: { type: "achievement", id: "perfects_run_10", label: "Perfect Ten" },
    style: {
      fill: "#000000",
      core: "#000000",
      rim: "#ff1a1a",
      glow: "#ff4d4d",
      pattern: { type: "centerline", stroke: "#ff1a1a", accent: "#ff1a1a", glow: "#ff4d4d" }
    }
  },
  {
    id: "orb_free_zigzag",
    name: "Azure Zigzag",
    unlock: { type: "achievement", id: "no_orbs_100", label: "Orb-Free Century" },
    style: {
      fill: "#f8fbff",
      core: "#e0f2fe",
      rim: "#7dd3fc",
      glow: "#bae6fd",
      pattern: {
        type: "zigzag",
        stroke: "#7dd3fc",
        background: "#bae6fd",
        amplitude: 0.2,
        waves: 7,
        spacing: 10
      },
      animation: { type: "zigzag_scroll", speed: 0.35 }
    }
  },
  {
    id: "bee_stripes",
    name: "Bee Stripes",
    unlock: { type: "achievement", id: "orb_combo_20", label: "Orb Crescendo" },
    style: {
      fill: "#facc15",
      core: "#111827",
      rim: "#0b0b0b",
      glow: "#fde68a",
      pattern: { type: "stripes", colors: ["#0b0b0b", "#facc15"], angle: Math.PI / 4 }
    }
  },
  {
    id: "rainbow_stripes",
    name: "Rainbow Stripes",
    unlock: { type: "achievement", id: "orbs_run_100", label: "Orb Vacuum" },
    style: {
      fill: "#f8fafc",
      core: "#e2e8f0",
      rim: "#1f2937",
      glow: "#f8fafc",
      pattern: {
        type: "stripes",
        colors: ["#ef4444", "#fb923c", "#facc15", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"],
        angle: Math.PI / 4
      }
    }
  },
  {
    id: "honeycomb",
    name: "Honeycomb",
    unlock: { type: "achievement", id: "total_run_time_600", label: "Honeycomb Drift" },
    style: {
      fill: "#fbbf24",
      core: "#fde68a",
      rim: "#3b240a",
      glow: "#fff1b8",
      pattern: { type: "honeycomb", stroke: "#f59e0b", glow: "#ffe9a3" }
    }
  },
  {
    id: "midnight_honeycomb",
    name: "Midnight Honeycomb",
    unlock: { type: "achievement", id: "pipes_broken_total_1000", label: "Pipe Purger" },
    style: {
      fill: "#facc15",
      core: "#fde047",
      rim: "#111827",
      glow: "#fef08a",
      pattern: { type: "honeycomb", stroke: "#0b0b0b", glow: "#fef3c7" }
    }
  },
  {
    id: "lemon_slice",
    name: "Lemon Slice",
    unlock: { type: "achievement", id: "pipes_broken_run_100", label: "Shatterstorm Run" },
    style: {
      fill: "#facc15",
      core: "#fef3c7",
      rim: "#b45309",
      glow: "#fef9c3",
      pattern: {
        type: "citrus_slice",
        stroke: "#f59e0b",
        rindStroke: "#f59e0b",
        segmentStroke: "#ea8c00",
        segments: 10,
        glow: "#fde68a"
      }
    }
  },
  {
    id: "fire_cape",
    name: "Fire Cape",
    unlock: { type: "achievement", id: "score_fire_cape_1000", label: "Fire Cape Trial" },
    style: {
      fill: "#1d0707",
      core: "#ffb264",
      rim: "#110404",
      glow: "#ffd08a",
      pattern: {
        type: "cobblestone",
        base: "#2a0c0b",
        highlight: "#ff8a2a",
        stroke: "#130404",
        glow: "#ffb870",
        stoneSize: 0.18,
        gap: 0.03
      },
      animation: {
        type: "cape_flow",
        palette: {
          base: "#200909",
          ash: "#3a0e0d",
          ember: "#b32716",
          molten: "#f06d22",
          flare: "#ffd07d"
        },
        speed: 0.32,
        bands: 7,
        embers: 0.85
      }
    }
  },
  {
    id: "inferno_cape",
    name: "Inferno Cape",
    unlock: { type: "achievement", id: "score_inferno_cape_2000", label: "Inferno Challenge" },
    style: {
      fill: "#140303",
      core: "#ff7b2f",
      rim: "#070303",
      glow: "#ffb36a",
      pattern: {
        type: "cobblestone",
        base: "#1f0706",
        highlight: "#ff5f1f",
        stroke: "#0b0202",
        glow: "#ff9c5a",
        stoneSize: 0.17,
        gap: 0.028
      },
      animation: {
        type: "cape_flow",
        palette: {
          base: "#160505",
          ash: "#2f0807",
          ember: "#84130f",
          molten: "#e0521a",
          flare: "#ffb25d"
        },
        speed: 0.36,
        bands: 8,
        embers: 0.9
      }
    }
  }
]);

export function normalizeIconUnlock(unlock) {
  if (!unlock || typeof unlock !== "object") return { type: "free", label: "Free" };
  const type = unlock.type;
  if (type === "score") {
    const minScore = Number.isFinite(unlock.minScore) ? Math.max(0, Math.floor(unlock.minScore)) : 0;
    return { type, minScore, label: unlock.label || `Score ${minScore}+` };
  }
  if (type === "achievement" && typeof unlock.id === "string") {
    return { type, id: unlock.id, label: unlock.label || "Achievement" };
  }
  if (type === "purchase") {
    const cost = Number.isFinite(unlock.cost) ? Math.max(0, Math.floor(unlock.cost)) : 0;
    const currencyId = normalizeCurrencyId(unlock.currencyId || DEFAULT_CURRENCY_ID);
    return { type, cost, currencyId, label: unlock.label || `Cost: ${formatCurrencyAmount(cost, currencyId)}` };
  }
  if (type === "record") {
    return { type: "record", label: unlock.label || "Record holder" };
  }
  return { type: "free", label: unlock.label || "Free" };
}

export function normalizePlayerIcons(list, { allowEmpty = false } = {}) {
  const hasList = Array.isArray(list);
  const src = hasList ? list : [];
  const seen = new Set();
  const out = [];

  for (const icon of src) {
    if (!icon || typeof icon !== "object") continue;
    const id = typeof icon.id === "string" && icon.id.trim() ? icon.id.trim() : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const name = typeof icon.name === "string" && icon.name.trim() ? icon.name.trim() : id;
    const unlock = normalizeIconUnlock(icon.unlock);
    out.push({
      ...icon,
      id,
      name,
      unlock
    });
  }

  if (out.length) return out;
  if (allowEmpty && hasList) return [];
  return DEFAULT_PLAYER_ICONS.map((i) => ({ ...i, unlock: normalizeIconUnlock(i.unlock) }));
}

export function getUnlockedPlayerIcons(icons, {
  bestScore = 0,
  ownedIconIds = [],
  achievements,
  recordHolder = false
} = {}) {
  const defs = normalizePlayerIcons(icons);
  const owned = new Set(
    Array.isArray(ownedIconIds)
      ? ownedIconIds.map((id) => (typeof id === "string" ? id : null)).filter(Boolean)
      : []
  );
  const unlockedAchievements =
    achievements && typeof achievements === "object" && achievements.unlocked
      ? achievements.unlocked
      : {};

  const unlocked = [];
  for (const icon of defs) {
    const unlock = icon.unlock || { type: "free" };
    let ok = false;
    switch (unlock.type) {
      case "free":
        ok = true;
        break;
      case "score":
        ok = bestScore >= (unlock.minScore || 0);
        break;
      case "achievement":
        ok = Boolean(unlockedAchievements && unlockedAchievements[unlock.id]);
        break;
      case "purchase":
        ok = owned.has(icon.id) || owned.has(unlock.id || icon.id);
        break;
      case "record":
        ok = !!recordHolder;
        break;
      default:
        ok = false;
    }
    if (ok) unlocked.push(icon.id);
  }
  return unlocked;
}

export function normalizeIconSelection({
  currentId,
  userSelectedId,
  unlockedIds,
  fallbackId = DEFAULT_PLAYER_ICON_ID
}) {
  const unlocked = unlockedIds instanceof Set ? unlockedIds : new Set(unlockedIds || []);
  const current = currentId && unlocked.has(currentId) ? currentId : null;
  const userChoice = userSelectedId && unlocked.has(userSelectedId) ? userSelectedId : null;
  if (current) return current;
  if (userChoice) return userChoice;
  const [firstUnlocked] = unlocked;
  return firstUnlocked || fallbackId;
}

export function describeIconLock(icon, { unlocked }) {
  if (unlocked) return icon.unlock?.label || "Unlocked";
  const unlock = icon.unlock || { type: "free" };
  switch (unlock.type) {
    case "score":
      return `Locked: Reach score ${unlock.minScore}`;
    case "achievement":
      return `Locked: Earn the "${unlock.label || "Achievement"}" achievement`;
    case "purchase":
      return unlock.cost
        ? `Locked: Purchase for ${formatCurrencyAmount(unlock.cost, unlock.currencyId || DEFAULT_CURRENCY_ID)}`
        : "Locked: Purchase";
    case "record":
      return "Locked: Become the record holder";
    default:
      return "Locked";
  }
}

export const __testables = {
  normalizeIconUnlock
};
