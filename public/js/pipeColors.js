import { clamp, hexToRgb, lerpC } from "./util.js";

const DEFAULT_COLORS = Object.freeze({
  green: "#b7efb2", // pastel green (starting difficulty)
  blue: "#b3ebf2", // pastel blue (mid-low difficulty)
  wisteria: "#c9a0dc", // wisteria (mid-high difficulty)
  red: "#ff746c" // pastel red (maximum difficulty)
});

function paletteColor(colors, key, fallbacks = []) {
  const palette = colors || {};
  for (const k of [key, ...fallbacks]) {
    if (palette[k]) return palette[k];
  }
  return DEFAULT_COLORS[key];
}

export function computePipeColor(difficulty01, colors = DEFAULT_COLORS) {
  const d = clamp(Number.isFinite(difficulty01) ? difficulty01 : 0, 0, 1);
  const g = hexToRgb(paletteColor(colors, "green"));
  const b = hexToRgb(paletteColor(colors, "blue"));
  const w = hexToRgb(paletteColor(colors, "wisteria", ["purple", "yellow"]));
  const r = hexToRgb(paletteColor(colors, "red"));

  const t1 = 1 / 3;
  const t2 = 2 / 3;

  if (d <= 0) return g;
  if (d < t1) return lerpC(g, b, d / t1);
  if (d < t2) return lerpC(b, w, (d - t1) / (t2 - t1));
  return lerpC(w, r, (d - t2) / (1 - t2));
}

export function pipePaletteDefaults() {
  return { ...DEFAULT_COLORS };
}

