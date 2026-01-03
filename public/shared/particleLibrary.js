export const ROUND_TABLE_AGENTS = Object.freeze([
  {
    id: "agent_1",
    name: "Nova",
    focus: "Dreamy overlays",
    suggestions: ["Hearts", "Petals", "Soft Glow Orbs"]
  },
  {
    id: "agent_2",
    name: "Quill",
    focus: "Retro arcade",
    suggestions: ["Pixel Sparks", "8-bit Stars", "Scanline Dust"]
  },
  {
    id: "agent_3",
    name: "Ember",
    focus: "Fire + smoke",
    suggestions: ["Embers", "Cartoon Smoke", "Heat Haze"]
  },
  {
    id: "agent_4",
    name: "Ripple",
    focus: "Water + air",
    suggestions: ["Bubbles", "Ripples", "Mist"]
  },
  {
    id: "agent_5",
    name: "Bolt",
    focus: "Electric",
    suggestions: ["Lightning Arcs", "Ion Sparks", "Electric Dashes"]
  },
  {
    id: "agent_6",
    name: "Flora",
    focus: "Nature",
    suggestions: ["Leaf Swirls", "Pollen", "Clover Bits"]
  },
  {
    id: "agent_7",
    name: "Prism",
    focus: "Prismatic",
    suggestions: ["Prism Shards", "Rainbow Ribbons", "Iridescent Dust"]
  },
  {
    id: "agent_8",
    name: "Orbit",
    focus: "Cosmic",
    suggestions: ["Comet Tails", "Starbursts", "Nebula Clouds"]
  },
  {
    id: "agent_9",
    name: "Charm",
    focus: "Whimsical",
    suggestions: ["Sparkles", "Stars", "Confetti"]
  },
  {
    id: "agent_10",
    name: "Glitch",
    focus: "Digital",
    suggestions: ["Glitch Fragments", "Data Squares", "Static Specks"]
  }
]);

export const BEST_PARTICLE_EFFECTS = Object.freeze([
  "Hearts",
  "Stars",
  "Straight Line",
  "Sparkle",
  "Circle",
  "Cartoon Smoke",
  "Embers",
  "Lightning Arcs",
  "Bubbles",
  "Petals",
  "Confetti",
  "Pixel Sparks",
  "Comet Tails",
  "Prism Shards",
  "Leaf Swirls",
  "Iridescent Dust",
  "Nebula Clouds",
  "Starbursts",
  "Glitch Fragments",
  "Ripples"
]);

export function getRoundTableAgents() {
  return ROUND_TABLE_AGENTS.map((agent) => ({
    ...agent,
    suggestions: [...agent.suggestions]
  }));
}

export function getBestParticleEffects() {
  return [...BEST_PARTICLE_EFFECTS];
}

export function normalizeParticleMix(mix = []) {
  if (!Array.isArray(mix)) return [];
  const entries = mix
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const id = typeof entry.id === "string" ? entry.id.trim() : "";
      const weight = Number(entry.weight);
      if (!id || !Number.isFinite(weight) || weight <= 0) return null;
      return { id, weight };
    })
    .filter(Boolean);

  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return [];

  return entries.map((entry) => ({
    id: entry.id,
    weight: Number(((entry.weight / total) * 100).toFixed(2))
  }));
}
