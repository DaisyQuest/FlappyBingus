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
const frostColor = ({ base = 190, spread = 18, sat = 70, light = 84, alpha = 0.86 } = {}) => ({ rand: r, i }) =>
  hsla((base + r(-spread, spread) + i * 1.4) % 360, sat, light + r(-4, 4), alpha);
const neonColor = ({ rand: r }) => hsla((280 + r(-40, 40)) % 360, 100, 72, 0.88);
const duskColor = ({ rand: r, i }) => hsla((335 + r(-12, 12) + i * 1.1) % 360, 62, 52, 0.78);
const haloColor = ({ hue, rand: r }) => hsla((hue + r(-12, 12)) % 360, 92, 76, 0.48);
const cometColor = ({ hue, rand: r }) => hsla((hue + r(-24, 24)) % 360, 100, 70, 0.9);
const prismColor = ({ hue, i }) => hsla((hue + i * 18) % 360, 100, 70, 0.88);
const nebulaSmoke = ({ hue, rand: r }) => hsla((hue + r(-30, 30)) % 360, 64, 64, 0.55);
const starGlow = ({ rand: r, i }) => hsla((52 + r(-18, 18) + i * 2) % 360, 96, 86, 0.9);
const honeyGlow = ({ rand: r }) => hsla(42 + r(-6, 6), 94, 66, 0.88);
const lemonGlow = ({ rand: r, i }) => hsla((54 + r(-8, 8) + i * 1.4) % 360, 96, 82, 0.88);

const sparkleDefaults = Object.freeze({
  rate: 40,
  life: [0.28, 0.46],
  size: [1.0, 2.4],
  speed: [20, 55],
  drag: 12.5,
  add: true,
  color: ({ hue, rand: r }) => hsla((hue * 0.65 + r(0, 120)) % 360, 100, 82, 0.86)
});

const glintDefaults = Object.freeze({
  rate: 34,
  life: [0.18, 0.32],
  size: [1.2, 3.0],
  speed: [55, 155],
  drag: 11.2,
  add: true,
  color: ({ hue, rand: r }) => hsla((hue + r(-18, 42)) % 360, 100, 74, 0.86)
});

const bandColor = ({ base, variance = 8, sat = 88, light = 62, alpha = 0.8 }) => ({ rand: r }) =>
  hsla((base + r(-variance, variance)) % 360, sat, light, alpha);
const emberColor = bandColor({ base: 12, variance: 10, sat: 90, light: 64, alpha: 0.84 });
const emberSpark = () => "rgba(255,124,92,.92)";
const lightningColor = ({ rand: r }) => hsla((205 + r(-12, 20)) % 360, 100, 82, 0.92);
const petalColor = ({ rand: r, i }) =>
  hsla((332 + r(-10, 10) + i * 1.8) % 360, 80, 86, 0.9);

const TRAIL_STYLES = Object.freeze({
  classic: {
    rate: 48,
    life: [0.18, 0.32],
    size: [0.8, 1.9],
    speed: [22, 96],
    drag: 12.2,
    add: true,
    color: () => "rgba(120,210,255,.58)",
    sparkle: { ...sparkleDefaults, rate: 18, size: [0.6, 1.4], color: ({ rand: r }) => hsla(195 + r(-12, 12), 90, 84, 0.7) }
  },
  ember: {
    rate: 62,
    life: [0.16, 0.28],
    size: [1.4, 2.6],
    speed: [32, 122],
    drag: 10.8,
    add: true,
    color: emberColor,
    sparkle: { ...sparkleDefaults, rate: 38, size: [1.0, 2.2], speed: [25, 65], color: emberSpark },
    aura: { rate: 18, size: [1.8, 3.2], life: [0.4, 0.6], color: ({ rand: r }) => hsla(22 + r(-8, 8), 90, 66, 0.35) }
  },
  sunset: {
    rate: 58,
    life: [0.22, 0.38],
    size: [2.8, 5.2],
    speed: [24, 108],
    drag: 10.4,
    add: true,
    color: sweepColor({ base: 12, spread: 90, sat: 90, light: 68, alpha: 0.8 }),
    aura: { rate: 24, size: [3.2, 6.0], life: [0.5, 0.8], color: ({ hue, rand: r }) => hsla((hue + 10 + r(-10, 10)) % 360, 86, 72, 0.4) }
  },
  gothic: {
    rate: 68,
    life: [0.2, 0.36],
    size: [2.6, 5.4],
    speed: [26, 118],
    drag: 10.6,
    add: false,
    color: duskColor,
    glint: { ...glintDefaults, rate: 22, size: [1.2, 2.6], speed: [30, 90], color: ({ rand: r }) => hsla((300 + r(-18, 18)) % 360, 60, 72, 0.7) },
    aura: { rate: 12, size: [2.6, 4.2], life: [0.5, 0.7], color: ({ rand: r }) => hsla((330 + r(-10, 10)) % 360, 48, 38, 0.35), add: false }
  },
  glacier: {
    rate: 64,
    life: [0.28, 0.48],
    size: [2.8, 6.2],
    speed: [26, 118],
    drag: 11.6,
    add: true,
    color: frostColor(),
    sparkle: { ...sparkleDefaults, rate: 22, size: [1.1, 2.4], color: () => "rgba(215,245,255,.9)" },
    aura: { rate: 20, size: [3.4, 6.0], life: [0.6, 0.9], color: ({ rand: r }) => hsla(200 + r(-10, 10), 70, 88, 0.42) }
  },
  ocean: {
    rate: 72,
    life: [0.24, 0.42],
    size: [3.8, 7.6],
    speed: [30, 140],
    drag: 10.5,
    add: true,
    color: paletteColor(["rgba(0,164,214,.82)", "rgba(0,118,255,.8)", "rgba(40,226,214,.82)"]),
    glint: { ...glintDefaults, rate: 40, size: [1.8, 3.6], speed: [55, 140], color: () => "rgba(200,245,255,.9)" },
    aura: { rate: 16, size: [3.0, 5.4], life: [0.5, 0.8], color: ({ rand: r }) => hsla(190 + r(-12, 12), 80, 76, 0.35) }
  },
  miami: {
    rate: 92,
    life: [0.18, 0.34],
    size: [4.8, 9.2],
    speed: [36, 164],
    drag: 9.6,
    add: true,
    color: paletteColor(["rgba(0,255,204,.84)", "rgba(255,82,255,.84)", "rgba(0,164,255,.84)"]),
    glint: { ...glintDefaults, rate: 38, size: [2.2, 4.8], speed: [70, 170], color: neonColor },
    sparkle: { ...sparkleDefaults, rate: 46, size: [1.4, 2.8], color: ({ rand: r }) => hsla((300 + r(-60, 60)) % 360, 100, 78, 0.86) }
  },
  aurora: {
    rate: 84,
    life: [0.26, 0.46],
    size: [5.4, 10.5],
    speed: [34, 156],
    drag: 10.2,
    add: true,
    color: sweepColor({ base: 110, spread: 140, sat: 94, light: 74, alpha: 0.84 }),
    hueRate: 210,
    aura: { rate: 30, size: [4.6, 9.2], life: [0.6, 0.9], color: haloColor }
  },
  rainbow: {
    rate: 104,
    life: [0.2, 0.36],
    size: [5.6, 11.8],
    speed: [36, 170],
    drag: 9.6,
    add: true,
    color: prismColor,
    hueRate: 280,
    sparkle: { ...sparkleDefaults, rate: 52, size: [1.8, 3.6], color: cometColor }
  },
  solar: {
    rate: 96,
    life: [0.18, 0.34],
    size: [6.8, 12.8],
    speed: [44, 182],
    drag: 9.2,
    add: true,
    color: flameColor({ base: 32, spread: 26, alpha: 0.92 }),
    sparkle: { ...sparkleDefaults, rate: 58, size: [2.4, 4.8], color: ({ rand: r }) => hsla((36 + r(-8, 18)) % 360, 96, 76, 0.96) },
    aura: { rate: 26, size: [5.6, 9.4], life: [0.5, 0.7], color: ({ rand: r }) => hsla(34 + r(-6, 6), 92, 70, 0.38) }
  },
  storm: {
    rate: 112,
    life: [0.16, 0.3],
    size: [6.2, 12.6],
    speed: [68, 210],
    drag: 9.0,
    add: true,
    color: lightningColor,
    hueRate: 160,
    glint: { ...glintDefaults, rate: 52, size: [2.2, 5.4], speed: [90, 220], color: ({ rand: r }) => hsla((210 + r(-8, 10)) % 360, 100, 94, 0.96) },
    sparkle: { ...sparkleDefaults, rate: 30, add: false, color: ({ rand: r }) => hsla((200 + r(-10, 14)) % 360, 90, 82, 0.7) },
    aura: { rate: 12, size: [4.0, 6.2], life: [0.4, 0.6], color: ({ rand: r }) => hsla(220 + r(-8, 8), 70, 66, 0.32) }
  },
  magma: {
    rate: 88,
    life: [0.22, 0.4],
    size: [7.8, 14.6],
    speed: [42, 166],
    drag: 9.4,
    add: true,
    color: flameColor({ base: 8, spread: 34, alpha: 0.92 }),
    sparkle: { ...sparkleDefaults, rate: 28, size: [2.6, 5.8], color: ({ rand: r }) => hsla((16 + r(-14, 22)) % 360, 98, 72, 0.94) },
    aura: { rate: 22, size: [6.2, 10.8], life: [0.7, 1.0], color: ({ rand: r }) => hsla(10 + r(-8, 8), 90, 62, 0.42) }
  },
  plasma: {
    rate: 118,
    life: [0.18, 0.32],
    size: [8.2, 14.8],
    speed: [58, 208],
    drag: 8.8,
    add: true,
    color: paletteColor(["rgba(0,246,255,.9)", "rgba(202,0,255,.92)", "rgba(120,0,255,.9)"]),
    hueRate: 230,
    sparkle: { ...sparkleDefaults, rate: 60, size: [2.2, 4.8], color: ({ rand: r }) => hsla((r(0, 1) > 0.5 ? 190 : 305) + r(-14, 14), 100, 80, 0.94) },
    glint: { ...glintDefaults, rate: 48, size: [2.4, 5.0], speed: [70, 180], color: neonColor }
  },
  nebula: {
    rate: 92,
    life: [0.2, 0.38],
    size: [6.8, 12.4],
    speed: [38, 165],
    drag: 10.4,
    add: true,
    color: paletteColor(["rgba(255,244,214,.9)", "rgba(200,228,255,.88)", "rgba(170,200,255,.86)"]),
    sparkle: { ...sparkleDefaults, rate: 46, size: [1.6, 3.2], color: starGlow },
    glint: { ...glintDefaults, rate: 36, size: [2.4, 4.6], speed: [40, 130], color: ({ rand: r }) => hsla((210 + r(-22, 22)) % 360, 88, 86, 0.9) },
    aura: { rate: 18, size: [6.4, 10.8], life: [0.45, 0.7], color: ({ rand: r }) => hsla((210 + r(-18, 18)) % 360, 70, 76, 0.35), add: true }
  },
  honeycomb: {
    rate: 82,
    life: [0.22, 0.4],
    size: [4.6, 9.4],
    speed: [32, 142],
    drag: 10.6,
    add: true,
    color: paletteColor(["rgba(255,193,7,.9)", "rgba(255,166,0,.88)", "rgba(255,224,130,.9)"]),
    sparkle: { ...sparkleDefaults, rate: 28, size: [1.1, 2.6], color: honeyGlow },
    glint: { ...glintDefaults, rate: 24, size: [2.0, 3.6], speed: [40, 120], color: ({ rand: r }) => hsla(40 + r(-10, 8), 92, 72, 0.86) },
    aura: { rate: 14, size: [4.6, 8.2], life: [0.5, 0.75], color: ({ rand: r }) => hsla(46 + r(-8, 8), 86, 62, 0.32) }
  },
  lemon_slice: {
    rate: 90,
    life: [0.2, 0.36],
    size: [4.2, 8.8],
    speed: [36, 150],
    drag: 10.2,
    add: true,
    color: paletteColor(["rgba(255,235,59,.92)", "rgba(255,249,196,.94)", "rgba(255,213,79,.9)"]),
    sparkle: { ...sparkleDefaults, rate: 38, size: [1.4, 3.0], color: lemonGlow },
    glint: { ...glintDefaults, rate: 30, size: [2.0, 3.8], speed: [48, 140], color: ({ rand: r }) => hsla(52 + r(-10, 10), 90, 80, 0.88) },
    aura: { rate: 16, size: [4.8, 8.6], life: [0.5, 0.8], color: ({ rand: r }) => hsla(56 + r(-8, 8), 88, 74, 0.34) }
  },
  dragonfire: {
    rate: 122,
    life: [0.18, 0.32],
    size: [9.4, 15.8],
    speed: [66, 220],
    drag: 8.6,
    add: true,
    color: paletteColor(["rgba(255,96,0,.94)", "rgba(255,0,82,.94)", "rgba(255,196,0,.9)"]),
    sparkle: { ...sparkleDefaults, rate: 68, size: [3.2, 6.4], color: ({ rand: r }) => hsla((18 + r(-20, 20)) % 360, 98, 70, 0.96) },
    glint: { ...glintDefaults, rate: 38, size: [2.0, 4.6], speed: [70, 170], color: ({ rand: r }) => hsla((12 + r(-16, 16)) % 360, 100, 78, 0.88) }
  },
  ultraviolet: {
    rate: 90,
    life: [0.22, 0.38],
    size: [7.4, 13.6],
    speed: [44, 182],
    drag: 9.8,
    add: true,
    color: paletteColor(["rgba(120,0,255,.9)", "rgba(70,0,140,.9)", "rgba(200,0,255,.9)"]),
    hueRate: 200,
    glint: { ...glintDefaults, rate: 34, size: [2.2, 4.2], speed: [60, 150], color: ({ rand: r }) => hsla((282 + r(-18, 18)) % 360, 100, 88, 0.9) },
    aura: { rate: 20, size: [4.8, 8.2], life: [0.6, 0.9], color: ({ rand: r }) => hsla((275 + r(-10, 10)) % 360, 80, 66, 0.4) }
  },
  world_record: {
    rate: 126,
    life: [0.28, 0.52],
    size: [10, 17],
    speed: [42, 150],
    drag: 10.4,
    add: true,
    color: petalColor,
    sparkle: {
      rate: 46,
      life: [0.50, 0.86],
      size: [5, 11],
      speed: [22, 82],
      drag: 9.8,
      add: false,
      color: ({ rand: r }) => hsla((332 + r(-12, 12)) % 360, 86, 86, 0.9)
    },
    glint: {
      rate: 38,
      life: [0.34, 0.54],
      size: [7, 12],
      speed: [32, 118],
      drag: 8.9,
      add: false,
      color: ({ rand: r }) => hsla((328 + r(-10, 12)) % 360, 84, 88, 0.9)
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
