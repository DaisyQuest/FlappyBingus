"use strict";

const { DEFAULT_CURRENCY_ID, normalizeCurrencyId, getCurrencyDefinition } = require("./currency.cjs");

const DEFAULT_PLAYER_ICON_ID = "hi_vis_orange";

const PLAYER_ICONS = Object.freeze([
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
    id: "fire_cape",
    name: "Fire Cape",
    unlock: { type: "achievement", id: "score_fire_cape_1000", label: "Fire Cape Trial" },
    style: {
      fill: "#2c0b0b",
      core: "#ff7a1c",
      rim: "#0d0303",
      glow: "#ffb347",
      pattern: { type: "zigzag", stroke: "#ffb347", background: "#1f0a0a" },
      animation: {
        type: "lava",
        palette: { base: "#1a0a0a", ember: "#9b2c1c", molten: "#f0651c", flare: "#ffd166" },
        speed: 0.05,
        layers: 3
      }
    }
  },
  {
    id: "inferno_cape",
    name: "Inferno Cape",
    unlock: { type: "achievement", id: "score_inferno_cape_2000", label: "Inferno Challenge" },
    style: {
      fill: "#130606",
      core: "#e23f1d",
      rim: "#070404",
      glow: "#ff9f43",
      pattern: { type: "zigzag", stroke: "#ff9448", background: "#260909" },
      animation: {
        type: "lava",
        palette: { base: "#0f0505", ember: "#7c1b1b", molten: "#f05b1b", flare: "#ffd39a" },
        speed: 0.07,
        layers: 4
      }
    }
  }
]);

function normalizePlayerIcons(list) {
  const src = Array.isArray(list) ? list : [];
  const seen = new Set();
  const out = [];

  for (const icon of src) {
    if (!icon || typeof icon !== "object") continue;
    const id = typeof icon.id === "string" && icon.id.trim() ? icon.id.trim() : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const name = typeof icon.name === "string" && icon.name.trim() ? icon.name.trim() : id;
    const unlock = normalizeUnlock(icon.unlock);
    out.push({
      ...icon,
      id,
      name,
      unlock
    });
  }

  return out.length ? out : PLAYER_ICONS.map((i) => ({ ...i, unlock: normalizeUnlock(i.unlock) }));
}

function normalizeUnlock(unlock) {
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
    const meta = getCurrencyDefinition(currencyId);
    const label = unlock.label || `Cost: ${cost} ${meta.shortLabel || meta.name}`.trim();
    return { type, cost, currencyId, label };
  }
  if (type === "record") {
    return { type: "record", label: unlock.label || "Record holder" };
  }
  return { type: "free", label: unlock.label || "Free" };
}

function unlockedIcons(user, { icons = PLAYER_ICONS, recordHolder = false } = {}) {
  const defs = normalizePlayerIcons(icons);
  const bestScore = Number(user?.bestScore) || 0;
  const owned = new Set(
    Array.isArray(user?.ownedIcons)
      ? user.ownedIcons.map((id) => (typeof id === "string" ? id : null)).filter(Boolean)
      : []
  );
  const unlockedAchievements =
    user?.achievements && typeof user.achievements === "object" && user.achievements.unlocked
      ? user.achievements.unlocked
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
        ok = recordHolder;
        break;
      default:
        ok = false;
    }
    if (ok) unlocked.push(icon.id);
  }
  return unlocked;
}

module.exports = {
  DEFAULT_PLAYER_ICON_ID,
  PLAYER_ICONS,
  normalizePlayerIcons,
  normalizeUnlock,
  unlockedIcons
};
