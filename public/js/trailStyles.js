// =====================
// FILE: public/js/trailStyles.js
// =====================
import { hsla } from "./util.js";

const pick = (arr, rnd) => arr[Math.min(arr.length - 1, Math.floor(rnd(0, arr.length)))];
const paletteColor = (palette) => ({ rand: r }) => pick(palette, r);
const sweepColor = ({ base = 0, spread = 180, sat = 100, light = 70, alpha = 0.85 }) => ({ hue, i }) => {
  const h = (base + (hue * 0.4 + i * 9) % spread) % 360;
  return hsla(h, sat, light, alpha);
};
const flameColor = ({ base = 18, spread = 22, sat = 98, light = 68, alpha = 0.9 } = {}) => ({ rand: r, i }) => {
  const h = (base + r(-spread, spread) + i * 2.2) % 360;
  return hsla(h, sat, light + r(-6, 6), alpha);
};

const sparkleDefaults = Object.freeze({
  rate: 40,
  life: [0.28, 0.46],
  size: [1.0, 2.4],
  speed: [20, 55],
  drag: 12.5,
  add: true,
  color: ({ hue, rand: r }) => hsla((hue * 0.65 + r(0, 120)) % 360, 100, 86, 0.9)
});

const glintDefaults = Object.freeze({
  rate: 34,
  life: [0.18, 0.32],
  size: [1.2, 3.0],
  speed: [55, 155],
  drag: 11.2,
  add: true,
  color: ({ hue, rand: r }) => hsla((hue + r(-18, 42)) % 360, 100, 78, 0.9)
});

const bandColor = ({ base, variance = 8, sat = 88, light = 62, alpha = 0.8 }) => ({ rand: r }) =>
  hsla((base + r(-variance, variance)) % 360, sat, light, alpha);
const emberColor = bandColor({ base: 10, variance: 6, sat: 92, light: 66, alpha: 0.82 });
const emberSpark = () => "rgba(255,104,82,.92)";
const lightningColor = ({ rand: r }) => hsla((200 + r(-10, 16)) % 360, 100, 80, 0.9);
const petalColor = ({ rand: r, i }) =>
  hsla((330 + r(-8, 8) + i * 1.6) % 360, 78, 86, 0.9);

const TRAIL_STYLES = Object.freeze({
  classic: { rate: 52, life: [0.18, 0.30], size: [0.9, 2.0], speed: [24, 105], drag: 11.5, add: true, color: () => "rgba(140,220,255,.62)" },
  ember: { rate: 54, life: [0.18, 0.32], size: [1.2, 2.4], speed: [26, 110], drag: 11.0, add: true, color: emberColor, sparkle: { ...sparkleDefaults, rate: 32, size: [0.9, 1.8], color: emberSpark } },
  sunset: { rate: 64, life: [0.20, 0.34], size: [2.4, 5.0], speed: [28, 120], drag: 10.4, add: true, color: bandColor({ base: 16, variance: 22, sat: 90, light: 68, alpha: 0.82 }) },
  gothic: { rate: 66, life: [0.22, 0.36], size: [3, 6], speed: [28, 125], drag: 10.1, add: true, color: bandColor({ base: 355, variance: 10, sat: 60, light: 50, alpha: 0.78 }) },
  glacier: { rate: 70, life: [0.24, 0.42], size: [3, 6], speed: [30, 135], drag: 10.8, add: true, color: bandColor({ base: 190, variance: 8, sat: 70, light: 82, alpha: 0.82 }), sparkle: { ...sparkleDefaults, size: [1.2, 2.2], color: () => "rgba(220,245,255,.9)" } },
  ocean: { rate: 76, life: [0.22, 0.40], size: [4, 8], speed: [32, 140], drag: 10.4, add: true, color: paletteColor(["rgba(0,182,204,.82)", "rgba(0,146,255,.8)", "rgba(56,226,210,.82)"]), glint: { ...glintDefaults, color: () => "rgba(220,255,255,.9)" } },
  miami: { rate: 82, life: [0.22, 0.40], size: [5, 9], speed: [35, 150], drag: 10.0, add: true, color: paletteColor(["rgba(0,255,190,.84)", "rgba(255,94,255,.84)", "rgba(0,180,255,.84)"]) },
  aurora: { rate: 88, life: [0.24, 0.44], size: [6, 11], speed: [36, 160], drag: 10.2, add: true, color: sweepColor({ base: 120, spread: 120, sat: 96, light: 74, alpha: 0.84 }), hueRate: 190 },
  rainbow: { rate: 95, life: [0.20, 0.38], size: [6, 12], speed: [38, 165], drag: 10.0, add: true, color: ({ hue, i }) => hsla((hue + i * 10) % 360, 100, 72, 0.86), hueRate: 240 },
  solar: { rate: 98, life: [0.20, 0.38], size: [7, 13], speed: [42, 175], drag: 9.8, add: true, color: flameColor({ base: 25, spread: 24, alpha: 0.9 }), sparkle: { ...sparkleDefaults, size: [2.2, 4.6], color: ({ rand: r }) => hsla((28 + r(-10, 16)) % 360, 96, 76, 0.94) } },
  storm: { rate: 105, life: [0.20, 0.34], size: [7, 13], speed: [60, 200], drag: 9.4, add: true, color: lightningColor, hueRate: 150, glint: { ...glintDefaults, rate: 46, size: [2.0, 5.0], speed: [80, 190], color: ({ rand: r }) => hsla((210 + r(-6, 12)) % 360, 100, 92, 0.95) }, sparkle: { ...sparkleDefaults, color: ({ rand: r }) => hsla((200 + r(-14, 18)) % 360, 100, 86, 0.92) } },
  magma: { rate: 110, life: [0.18, 0.34], size: [8, 14], speed: [55, 190], drag: 9.1, add: true, color: flameColor({ base: 14, spread: 30, alpha: 0.92 }), sparkle: { ...sparkleDefaults, rate: 44, size: [3.0, 6.5], color: ({ rand: r }) => hsla((18 + r(-12, 20)) % 360, 98, 72, 0.96) } },
  plasma: { rate: 112, life: [0.18, 0.34], size: [9, 15], speed: [56, 195], drag: 9.3, add: true, color: paletteColor(["rgba(0,255,234,.9)", "rgba(202,0,255,.9)", "rgba(112,0,255,.9)"]), hueRate: 210, sparkle: { ...sparkleDefaults, color: ({ rand: r }) => hsla((r(0, 1) > 0.5 ? 190 : 305) + r(-10, 10), 100, 80, 0.94) } },
  nebula: { rate: 114, life: [0.22, 0.42], size: [9, 15], speed: [50, 185], drag: 9.5, add: true, color: paletteColor(["rgba(138,43,226,.88)", "rgba(72,61,139,.86)", "rgba(46,139,187,.86)", "rgba(199,21,133,.86)"]), glint: { ...glintDefaults, color: ({ rand: r }) => hsla((300 + r(-20, 20)) % 360, 92, 84, 0.9) } },
  dragonfire: { rate: 120, life: [0.20, 0.36], size: [11, 16], speed: [62, 205], drag: 8.9, add: true, color: paletteColor(["rgba(255,80,0,.94)", "rgba(255,0,66,.94)", "rgba(255,180,0,.9)"]), sparkle: { ...sparkleDefaults, rate: 52, size: [3.5, 7.5], color: ({ rand: r }) => hsla((12 + r(-18, 18)) % 360, 98, 70, 0.96) } },
  ultraviolet: { rate: 102, life: [0.20, 0.36], size: [8, 14], speed: [52, 185], drag: 9.6, add: true, color: paletteColor(["rgba(111,0,255,.9)", "rgba(64,0,128,.9)", "rgba(180,0,255,.9)"]), hueRate: 190, glint: { ...glintDefaults, color: ({ rand: r }) => hsla((280 + r(-16, 16)) % 360, 100, 88, 0.9) } },
  world_record: {
    rate: 126,
    life: [0.28, 0.52],
    size: [10, 17],
    speed: [42, 150],
    drag: 10.4,
    add: true,
    color: petalColor,
    sparkle: {
      rate: 54,
      life: [0.48, 0.82],
      size: [6, 12],
      speed: [22, 84],
      drag: 9.8,
      add: true,
      color: ({ rand: r }) => (r(0, 1) > 0.5 ? "rgba(255,240,252,.94)" : "rgba(241,182,211,.92)")
    },
    glint: {
      rate: 46,
      life: [0.32, 0.52],
      size: [8, 14],
      speed: [32, 110],
      drag: 8.8,
      add: true,
      color: ({ rand: r }) => hsla((325 + r(-10, 10)) % 360, 82, 90, 0.92)
    },
    hueRate: 120
  }
});

export const TRAIL_STYLE_IDS = Object.freeze(Object.keys(TRAIL_STYLES));

export function trailStyleFor(id) {
  const st = TRAIL_STYLES[id] || TRAIL_STYLES.classic;
  const sparkle = st.sparkle || sparkleDefaults;
  const glint = st.glint || glintDefaults;
  return {
    ...st,
    sparkle: { ...sparkle },
    glint: { ...glint }
  };
}
