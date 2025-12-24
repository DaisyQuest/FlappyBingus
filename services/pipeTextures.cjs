"use strict";

const { normalizeUnlock } = require("./unlockables.cjs");

const PIPE_TEXTURE_MODES = Object.freeze([
  "MONOCHROME",
  "MINIMAL",
  "NORMAL",
  "HIGH",
  "ULTRA"
]);

const DEFAULT_PIPE_TEXTURE_ID = "basic";
const DEFAULT_PIPE_TEXTURE_MODE = "NORMAL";

const PIPE_TEXTURES = Object.freeze([
  {
    id: "basic",
    name: "Basic",
    description: "Classic gradient pipe.",
    unlock: { type: "free", label: "Free" }
  },
  {
    id: "digital",
    name: "Digital",
    description: "Terminal-style hex flow.",
    unlock: { type: "score", minScore: 150, label: "Score 150+" }
  },
  {
    id: "tiger",
    name: "Tiger",
    description: "Tiger stripes on a bright pipe.",
    unlock: { type: "score", minScore: 300, label: "Score 300+" }
  },
  {
    id: "dark_tiger",
    name: "DarkTiger",
    description: "Tiger stripes with darker contrast.",
    unlock: { type: "score", minScore: 450, label: "Score 450+" }
  },
  {
    id: "rainbow",
    name: "Rainbow",
    description: "Animated rainbow gradient.",
    unlock: { type: "score", minScore: 600, label: "Score 600+" }
  },
  {
    id: "negarainbow",
    name: "Negarainbow",
    description: "Negative rainbow spectrum.",
    unlock: { type: "score", minScore: 800, label: "Score 800+" }
  },
  {
    id: "tv_static",
    name: "TV Static",
    description: "Noisy static flicker.",
    unlock: { type: "score", minScore: 1000, label: "Score 1000+" }
  },
  {
    id: "metal",
    name: "Metal",
    description: "Polished metallic sheen.",
    unlock: { type: "score", minScore: 1200, label: "Score 1200+" }
  },
  {
    id: "glass",
    name: "Glass",
    description: "Translucent glass tubing.",
    unlock: { type: "score", minScore: 1400, label: "Score 1400+" }
  },
  {
    id: "metal_glass",
    name: "MetalGlass",
    description: "Hybrid metal + glass reflections.",
    unlock: { type: "score", minScore: 1600, label: "Score 1600+" }
  },
  {
    id: "checkboard",
    name: "Checkboard",
    description: "Checkerboard with white tiles.",
    unlock: { type: "score", minScore: 1800, label: "Score 1800+" }
  },
  {
    id: "checkerboard2",
    name: "Checkerboard2",
    description: "Checkerboard with black tiles.",
    unlock: { type: "score", minScore: 2000, label: "Score 2000+" }
  },
  {
    id: "disco",
    name: "Disco!",
    description: "Flashing rainbow lights.",
    unlock: { type: "score", minScore: 2200, label: "Score 2200+" }
  },
  {
    id: "ultradisco",
    name: "UltraDisco!",
    description: "Like disco, but wilder.",
    unlock: { type: "purchase", cost: 45, label: "Cost: 45 BC" }
  },
  {
    id: "fire",
    name: "Fire!",
    description: "Fiery pipe glow.",
    unlock: { type: "score", minScore: 2600, label: "Score 2600+" }
  },
  {
    id: "bluefire",
    name: "BlueFire!",
    description: "Blue flames throughout.",
    unlock: { type: "purchase", cost: 60, label: "Cost: 60 BC" }
  },
  {
    id: "rocket_emojis",
    name: "RocketShipEmojis",
    description: "Rocket ship emojis flying throughout.",
    unlock: { type: "purchase", cost: 75, label: "Cost: 75 BC" }
  }
]);

function normalizePipeTextureMode(mode) {
  if (!mode || typeof mode !== "string") return DEFAULT_PIPE_TEXTURE_MODE;
  const upper = mode.toUpperCase();
  return PIPE_TEXTURE_MODES.includes(upper) ? upper : DEFAULT_PIPE_TEXTURE_MODE;
}

function normalizePipeTextures(list) {
  const src = Array.isArray(list) ? list : [];
  const seen = new Set();
  const out = [];

  for (const texture of src) {
    if (!texture || typeof texture !== "object") continue;
    const id = typeof texture.id === "string" && texture.id.trim() ? texture.id.trim() : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof texture.name === "string" && texture.name.trim() ? texture.name.trim() : id;
    out.push({
      ...texture,
      id,
      name,
      unlock: normalizeUnlock(texture.unlock)
    });
  }

  return out.length
    ? out
    : PIPE_TEXTURES.map((t) => ({ ...t, unlock: normalizeUnlock(t.unlock) }));
}

module.exports = {
  PIPE_TEXTURE_MODES,
  DEFAULT_PIPE_TEXTURE_ID,
  DEFAULT_PIPE_TEXTURE_MODE,
  PIPE_TEXTURES,
  normalizePipeTextureMode,
  normalizePipeTextures
};
