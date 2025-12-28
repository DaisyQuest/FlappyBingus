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
      fill: "#1e3a8a",
      core: "#38bdf8",
      rim: "#0b1224",
      glow: "#60a5fa",
      pattern: { type: "zigzag", stroke: "#0ea5e9", background: "#082f49" }
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
    id: "honeycomb",
    name: "Honeycomb",
    unlock: { type: "achievement", id: "pipes_broken_explosion_10", label: "Honeycomb Drift" },
    style: {
      fill: "#fbbf24",
      core: "#fde68a",
      rim: "#3b240a",
      glow: "#fff1b8",
      pattern: { type: "honeycomb", stroke: "#f59e0b", glow: "#ffe9a3" }
    }
  },
  {
    id: "fire_cape",
    name: "Fire Cape",
    unlock: { type: "achievement", id: "score_fire_cape_1000", label: "Fire Cape Trial" },
    style: {
      fill: "#260808",
      core: "#ffb14b",
      rim: "#0d0303",
      glow: "#ffd59a",
      animation: {
        type: "lava",
        palette: {
          base: "#1b0707",
          ember: "#a22b12",
          molten: "#f06a1d",
          flare: "#ffd27a"
        },
        speed: 0.045,
        layers: 4,
        smoothness: 0.75
      }
    }
  },
  {
    id: "inferno_cape",
    name: "Inferno Cape",
    unlock: { type: "achievement", id: "score_inferno_cape_2000", label: "Inferno Challenge" },
    style: {
      fill: "#140505",
      core: "#ff6b2b",
      rim: "#070404",
      glow: "#ffb068",
      animation: {
        type: "lava",
        palette: {
          base: "#100404",
          ember: "#6f150f",
          molten: "#e95a1a",
          flare: "#ffb15f"
        },
        speed: 0.055,
        layers: 5,
        smoothness: 0.7
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

export function normalizePlayerIcons(list) {
  const src = Array.isArray(list) ? list : [];
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

  return out.length
    ? out
    : DEFAULT_PLAYER_ICONS.map((i) => ({ ...i, unlock: normalizeIconUnlock(i.unlock) }));
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
      return `Locked: Score ${unlock.minScore}`;
    case "achievement":
      return "Locked: Achievement";
    case "purchase":
      return unlock.cost
        ? `Locked: Costs ${formatCurrencyAmount(unlock.cost, unlock.currencyId || DEFAULT_CURRENCY_ID)}`
        : "Locked: Purchase";
    case "record":
      return "Locked: Record holder";
    default:
      return "Locked";
  }
}

export const __testables = {
  normalizeIconUnlock
};
