import { mergeIconStylePatch } from "../../js/iconStyleV2.js";

const ICON_PRESETS = [
  {
    id: "classic-amber",
    name: "Classic Amber",
    tags: ["Classic Readable"],
    stylePatch: {
      palette: { fill: "#f59e0b", core: "#fde68a", rim: "#1f2937", glow: "#fde68a" },
      pattern: { type: "centerline", stroke: "#1f2937", accent: "#f59e0b" }
    }
  },
  {
    id: "classic-sky",
    name: "Classic Sky",
    tags: ["Classic Readable"],
    stylePatch: {
      palette: { fill: "#38bdf8", core: "#bae6fd", rim: "#0f172a", glow: "#e0f2fe" },
      pattern: { type: "waves", scale: 1.1 }
    }
  },
  {
    id: "classic-forest",
    name: "Classic Forest",
    tags: ["Classic Readable"],
    stylePatch: {
      palette: { fill: "#22c55e", core: "#86efac", rim: "#064e3b", glow: "#bbf7d0" },
      pattern: { type: "checker", scale: 0.9 }
    }
  },
  {
    id: "classic-slate",
    name: "Classic Slate",
    tags: ["Classic Readable"],
    stylePatch: {
      palette: { fill: "#94a3b8", core: "#e2e8f0", rim: "#0f172a", glow: "#cbd5f5" }
    }
  },
  {
    id: "classic-sunset",
    name: "Classic Sunset",
    tags: ["Classic Readable"],
    stylePatch: {
      palette: { fill: "#fb923c", core: "#fed7aa", rim: "#7c2d12", glow: "#ffedd5" },
      pattern: { type: "radialStripes", stripes: 12 }
    }
  },
  {
    id: "hi-vis-yellow",
    name: "Hi-Vis Yellow",
    tags: ["High-Vis / Accessibility"],
    stylePatch: {
      palette: { fill: "#fde047", core: "#fff7a8", rim: "#111827", glow: "#fef9c3" },
      effects: [{ type: "outline", enabled: true, params: { width: 6, color: "#111827", alpha: 1 } }]
    }
  },
  {
    id: "hi-vis-pink",
    name: "Hi-Vis Pink",
    tags: ["High-Vis / Accessibility"],
    stylePatch: {
      palette: { fill: "#fb7185", core: "#fecdd3", rim: "#111827", glow: "#ffe4e6" },
      effects: [{ type: "outline", enabled: true, params: { width: 6, color: "#111827", alpha: 1 } }]
    }
  },
  {
    id: "hi-vis-cyan",
    name: "Hi-Vis Cyan",
    tags: ["High-Vis / Accessibility"],
    stylePatch: {
      palette: { fill: "#22d3ee", core: "#cffafe", rim: "#0f172a", glow: "#a5f3fc" },
      effects: [{ type: "outline", enabled: true, params: { width: 6, color: "#0f172a" } }]
    }
  },
  {
    id: "hi-vis-purple",
    name: "Hi-Vis Purple",
    tags: ["High-Vis / Accessibility"],
    stylePatch: {
      palette: { fill: "#c084fc", core: "#f5d0fe", rim: "#111827", glow: "#e9d5ff" },
      effects: [{ type: "outline", enabled: true, params: { width: 6, color: "#111827" } }]
    }
  },
  {
    id: "hi-vis-lime",
    name: "Hi-Vis Lime",
    tags: ["High-Vis / Accessibility"],
    stylePatch: {
      palette: { fill: "#bef264", core: "#ecfccb", rim: "#1f2937", glow: "#f7fee7" },
      effects: [{ type: "outline", enabled: true, params: { width: 6, color: "#1f2937" } }]
    }
  },
  {
    id: "arcade-neon-blue",
    name: "Arcade Neon Blue",
    tags: ["Arcade Neon"],
    stylePatch: {
      palette: { fill: "#1e3a8a", core: "#38bdf8", rim: "#0f172a", glow: "#67e8f9", accent: "#22d3ee" },
      effects: [{ type: "innerGlow", enabled: true, params: { color: "#67e8f9", alpha: 0.8 } }],
      pattern: { type: "radialBurst", rays: 14 }
    }
  },
  {
    id: "arcade-neon-magenta",
    name: "Arcade Neon Magenta",
    tags: ["Arcade Neon"],
    stylePatch: {
      palette: { fill: "#7e22ce", core: "#f472b6", rim: "#0f172a", glow: "#f9a8d4", accent: "#f472b6" },
      effects: [{ type: "innerGlow", enabled: true, params: { color: "#f9a8d4", alpha: 0.8 } }],
      pattern: { type: "radialChevrons", count: 12 }
    }
  },
  {
    id: "arcade-neon-green",
    name: "Arcade Neon Green",
    tags: ["Arcade Neon"],
    stylePatch: {
      palette: { fill: "#064e3b", core: "#34d399", rim: "#0f172a", glow: "#a7f3d0", accent: "#22c55e" },
      effects: [{ type: "innerGlow", enabled: true, params: { color: "#a7f3d0", alpha: 0.75 } }],
      pattern: { type: "radialStripes", stripes: 18 }
    }
  },
  {
    id: "arcade-neon-orange",
    name: "Arcade Neon Orange",
    tags: ["Arcade Neon"],
    stylePatch: {
      palette: { fill: "#7c2d12", core: "#fb923c", rim: "#0f172a", glow: "#fed7aa", accent: "#fb923c" },
      effects: [{ type: "innerGlow", enabled: true, params: { color: "#fed7aa", alpha: 0.7 } }],
      pattern: { type: "sunburst", rays: 16 }
    }
  },
  {
    id: "arcade-neon-purple",
    name: "Arcade Neon Purple",
    tags: ["Arcade Neon"],
    stylePatch: {
      palette: { fill: "#312e81", core: "#a5b4fc", rim: "#0f172a", glow: "#c7d2fe" },
      pattern: { type: "spiral", scale: 1.1 }
    }
  },
  {
    id: "hud-grid",
    name: "HUD Grid",
    tags: ["Sci-Fi HUD / Tech"],
    stylePatch: {
      palette: { fill: "#0f172a", core: "#38bdf8", rim: "#22d3ee", glow: "#67e8f9" },
      pattern: { type: "circuit", scale: 1 },
      texture: { type: "scanlines", intensity: 0.4, scale: 1.2 }
    }
  },
  {
    id: "hud-satellite",
    name: "HUD Satellite",
    tags: ["Sci-Fi HUD / Tech"],
    stylePatch: {
      palette: { fill: "#111827", core: "#38bdf8", rim: "#64748b", glow: "#94a3b8" },
      pattern: { type: "concentricRings", rings: 7 }
    }
  },
  {
    id: "hud-radar",
    name: "HUD Radar",
    tags: ["Sci-Fi HUD / Tech"],
    stylePatch: {
      palette: { fill: "#052e16", core: "#34d399", rim: "#10b981", glow: "#86efac" },
      pattern: { type: "radialBurst", rays: 10 }
    }
  },
  {
    id: "hud-ice",
    name: "HUD Ice",
    tags: ["Sci-Fi HUD / Tech"],
    stylePatch: {
      palette: { fill: "#0f172a", core: "#bae6fd", rim: "#38bdf8", glow: "#e0f2fe" },
      pattern: { type: "fracture" }
    }
  },
  {
    id: "hud-galaxy",
    name: "HUD Galaxy",
    tags: ["Sci-Fi HUD / Tech"],
    stylePatch: {
      palette: { fill: "#1f2937", core: "#a78bfa", rim: "#312e81", glow: "#c4b5fd" },
      pattern: { type: "stars", count: 14 }
    }
  },
  {
    id: "earthy-moss",
    name: "Earthy Moss",
    tags: ["Organic / Earthy"],
    stylePatch: {
      palette: { fill: "#14532d", core: "#4ade80", rim: "#052e16", glow: "#bbf7d0" },
      pattern: { type: "topographic", rings: 7 }
    }
  },
  {
    id: "earthy-clay",
    name: "Earthy Clay",
    tags: ["Organic / Earthy"],
    stylePatch: {
      palette: { fill: "#b45309", core: "#fdba74", rim: "#7c2d12", glow: "#fed7aa" },
      texture: { type: "paper", intensity: 0.4, scale: 1.4 }
    }
  },
  {
    id: "earthy-ocean",
    name: "Earthy Ocean",
    tags: ["Organic / Earthy"],
    stylePatch: {
      palette: { fill: "#0e7490", core: "#67e8f9", rim: "#164e63", glow: "#a5f3fc" },
      pattern: { type: "waves", lines: 7 }
    }
  },
  {
    id: "earthy-sand",
    name: "Earthy Sand",
    tags: ["Organic / Earthy"],
    stylePatch: {
      palette: { fill: "#fcd34d", core: "#fef3c7", rim: "#92400e", glow: "#fde68a" },
      pattern: { type: "polkaDots", scale: 0.9 }
    }
  },
  {
    id: "earthy-stone",
    name: "Earthy Stone",
    tags: ["Organic / Earthy"],
    stylePatch: {
      palette: { fill: "#475569", core: "#cbd5f5", rim: "#0f172a", glow: "#94a3b8" },
      pattern: { type: "cellular", cells: 12 }
    }
  },
  {
    id: "candy-pop",
    name: "Candy Pop",
    tags: ["Candy / Pop"],
    stylePatch: {
      palette: { fill: "#f472b6", core: "#fbcfe8", rim: "#831843", glow: "#fce7f3" },
      pattern: { type: "polkaDots", scale: 1.2 }
    }
  },
  {
    id: "candy-sour",
    name: "Candy Sour",
    tags: ["Candy / Pop"],
    stylePatch: {
      palette: { fill: "#84cc16", core: "#ecfccb", rim: "#365314", glow: "#d9f99d" },
      pattern: { type: "checker", scale: 1.1 }
    }
  },
  {
    id: "candy-gum",
    name: "Bubblegum",
    tags: ["Candy / Pop"],
    stylePatch: {
      palette: { fill: "#fb7185", core: "#fecdd3", rim: "#9f1239", glow: "#ffe4e6" },
      pattern: { type: "chevrons", scale: 1 }
    }
  },
  {
    id: "candy-spark",
    name: "Candy Spark",
    tags: ["Candy / Pop"],
    stylePatch: {
      palette: { fill: "#60a5fa", core: "#dbeafe", rim: "#1e3a8a", glow: "#bfdbfe" },
      pattern: { type: "stars", count: 10 }
    }
  },
  {
    id: "candy-latte",
    name: "Candy Latte",
    tags: ["Candy / Pop"],
    stylePatch: {
      palette: { fill: "#f97316", core: "#fed7aa", rim: "#7c2d12", glow: "#ffe4b5" },
      pattern: { type: "sunburst", rays: 14 }
    }
  },
  {
    id: "mono-slate",
    name: "Mono Slate",
    tags: ["Monochrome / Minimal"],
    stylePatch: {
      palette: { fill: "#334155", core: "#cbd5f5", rim: "#0f172a", glow: "#94a3b8" },
      pattern: { type: "diagonalHatch", scale: 0.8 }
    }
  },
  {
    id: "mono-ink",
    name: "Mono Ink",
    tags: ["Monochrome / Minimal"],
    stylePatch: {
      palette: { fill: "#0f172a", core: "#64748b", rim: "#e2e8f0", glow: "#94a3b8" }
    }
  },
  {
    id: "mono-alabaster",
    name: "Mono Alabaster",
    tags: ["Monochrome / Minimal"],
    stylePatch: {
      palette: { fill: "#e2e8f0", core: "#f8fafc", rim: "#475569", glow: "#cbd5f5" },
      pattern: { type: "concentricRings", rings: 5 }
    }
  },
  {
    id: "mono-graphite",
    name: "Mono Graphite",
    tags: ["Monochrome / Minimal"],
    stylePatch: {
      palette: { fill: "#1f2937", core: "#9ca3af", rim: "#111827", glow: "#6b7280" },
      pattern: { type: "radialStripes", stripes: 12 }
    }
  },
  {
    id: "mono-mist",
    name: "Mono Mist",
    tags: ["Monochrome / Minimal"],
    stylePatch: {
      palette: { fill: "#cbd5f5", core: "#e2e8f0", rim: "#475569", glow: "#f1f5f9" }
    }
  },
  {
    id: "streamer-hype",
    name: "Streamer Hype",
    tags: ["Streamer / Flashy"],
    stylePatch: {
      palette: { fill: "#7c3aed", core: "#f472b6", rim: "#0f172a", glow: "#f9a8d4", accent: "#f472b6" },
      pattern: { type: "radialChevrons", count: 14 },
      effects: [{ type: "innerGlow", enabled: true, params: { color: "#f9a8d4", alpha: 0.8 } }]
    }
  },
  {
    id: "streamer-sparkle",
    name: "Streamer Sparkle",
    tags: ["Streamer / Flashy"],
    stylePatch: {
      palette: { fill: "#2563eb", core: "#a855f7", rim: "#0f172a", glow: "#c4b5fd" },
      pattern: { type: "stars", count: 16 }
    }
  },
  {
    id: "streamer-fire",
    name: "Streamer Fire",
    tags: ["Streamer / Flashy"],
    stylePatch: {
      palette: { fill: "#b91c1c", core: "#fb923c", rim: "#0f172a", glow: "#fed7aa" },
      pattern: { type: "flames" }
    }
  },
  {
    id: "streamer-glitch",
    name: "Streamer Glitch",
    tags: ["Streamer / Flashy"],
    stylePatch: {
      palette: { fill: "#0f172a", core: "#38bdf8", rim: "#f472b6", glow: "#a855f7" },
      texture: { type: "scanlines", intensity: 0.5, scale: 1.4 }
    }
  },
  {
    id: "streamer-zap",
    name: "Streamer Zap",
    tags: ["Streamer / Flashy"],
    stylePatch: {
      palette: { fill: "#0f172a", core: "#facc15", rim: "#22d3ee", glow: "#fef08a" },
      pattern: { type: "radialBurst", rays: 20 }
    }
  }
];

function applyPresetPatch(style, preset) {
  return mergeIconStylePatch(style, preset?.stylePatch || {});
}

export { ICON_PRESETS, applyPresetPatch };
