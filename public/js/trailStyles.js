// Shared trail style definitions between the game and UI preview.
// Styles mirror the in-game trails so both contexts stay consistent.

const paletteColor = (palette) => ({ rand: r }) => palette[Math.min(palette.length - 1, Math.floor(r(0, palette.length)))];
const sweepColor = ({ base = 0, spread = 180, sat = 100, light = 70, alpha = 0.85 }) => ({ hue, i }) => {
  const h = (base + (hue * 0.4 + i * 9) % spread) % 360;
  return `hsla(${h.toFixed(2)},${sat}%,${light}%,${alpha})`;
};

const TRAIL_STYLES = {
  classic: { rate: 55, life: [0.18, 0.32], size: [0.8, 2.0], speed: [25, 120], drag: 11.5, add: true, color: () => "rgba(140,220,255,.62)" },
  rainbow: { rate: 95, life: [0.18, 0.34], size: [7, 10], speed: [35, 170], drag: 10.5, add: true, color: ({ hue, i }) => `hsla(${(hue + i * 11) % 360},100%,70%,0.85)`, hueRate: 240 },
  gothic: { rate: 78, life: [0.20, 0.40], size: [7, 10], speed: [30, 150], drag: 9.5, add: true, color: ({ rand: r }) => (r(0, 1) < 0.16 ? "rgba(0,0,0,.55)" : "rgba(170,90,255,.72)") },

  sunset: { rate: 72, life: [0.22, 0.38], size: [6, 10], speed: [30, 150], drag: 9.8, add: true, color: paletteColor(["rgba(255,140,82,.82)", "rgba(255,89,146,.82)", "rgba(255,211,94,.82)"]) },
  miami: { rate: 90, life: [0.20, 0.36], size: [7, 11], speed: [40, 175], drag: 9.8, add: true, color: paletteColor(["rgba(0,255,190,.82)", "rgba(255,94,255,.82)", "rgba(0,180,255,.82)"]) },
  aurora: { rate: 84, life: [0.24, 0.42], size: [7, 12], speed: [35, 160], drag: 10.2, add: true, color: sweepColor({ base: 120, spread: 140, sat: 96, light: 72, alpha: 0.82 }), hueRate: 180 },
  ocean: { rate: 68, life: [0.22, 0.38], size: [6, 9], speed: [30, 140], drag: 10.8, add: true, color: paletteColor(["rgba(0,180,200,.82)", "rgba(0,135,255,.8)", "rgba(60,230,220,.8)"]) },
  ember: { rate: 80, life: [0.18, 0.34], size: [8, 12], speed: [42, 170], drag: 9.4, add: true, color: paletteColor(["rgba(255,96,64,.86)", "rgba(255,177,66,.86)", "rgba(255,56,0,.78)"]) },
  cyber: { rate: 96, life: [0.18, 0.32], size: [7, 11], speed: [45, 180], drag: 10.0, add: true, color: paletteColor(["rgba(0,255,255,.86)", "rgba(255,0,255,.86)", "rgba(64,160,255,.86)"]) },
  pastel: { rate: 70, life: [0.24, 0.44], size: [6, 10], speed: [28, 120], drag: 10.6, add: true, color: paletteColor(["rgba(255,203,164,.8)", "rgba(191,213,255,.8)", "rgba(204,255,221,.8)", "rgba(255,186,222,.8)"]) },
  vapor: { rate: 86, life: [0.22, 0.40], size: [8, 12], speed: [35, 150], drag: 10.0, add: true, color: paletteColor(["rgba(255,105,180,.82)", "rgba(0,255,195,.82)", "rgba(120,118,255,.82)"]) },
  glacier: { rate: 72, life: [0.26, 0.46], size: [7, 11], speed: [30, 140], drag: 10.9, add: true, color: paletteColor(["rgba(180,235,255,.8)", "rgba(130,210,255,.82)", "rgba(220,255,255,.82)"]) },
  forest: { rate: 68, life: [0.22, 0.38], size: [7, 11], speed: [30, 140], drag: 10.6, add: true, color: paletteColor(["rgba(46,204,113,.82)", "rgba(80,180,90,.82)", "rgba(183,219,105,.82)"]) },
  solar: { rate: 95, life: [0.20, 0.36], size: [8, 13], speed: [40, 180], drag: 9.6, add: true, color: paletteColor(["rgba(255,196,61,.9)", "rgba(255,126,20,.88)", "rgba(255,246,140,.9)"]) },
  toxic: { rate: 88, life: [0.18, 0.32], size: [7, 12], speed: [42, 170], drag: 10.0, add: true, color: paletteColor(["rgba(57,255,20,.86)", "rgba(191,64,255,.86)", "rgba(120,255,120,.82)"]) },
  bubblegum: { rate: 76, life: [0.22, 0.40], size: [7, 11], speed: [30, 140], drag: 10.0, add: true, color: paletteColor(["rgba(255,182,193,.82)", "rgba(176,224,230,.82)", "rgba(255,105,180,.82)"]) },
  midnight: { rate: 70, life: [0.20, 0.36], size: [7, 11], speed: [32, 140], drag: 10.7, add: true, color: paletteColor(["rgba(44,62,80,.8)", "rgba(52,152,219,.84)", "rgba(155,89,182,.82)"]) },
  obsidian: { rate: 74, life: [0.18, 0.34], size: [7, 12], speed: [35, 150], drag: 10.4, add: true, color: paletteColor(["rgba(30,30,35,.72)", "rgba(80,80,90,.78)", "rgba(160,160,175,.78)"]) },
  golden: { rate: 90, life: [0.22, 0.38], size: [8, 12], speed: [40, 160], drag: 10.0, add: true, color: paletteColor(["rgba(255,215,0,.9)", "rgba(255,193,94,.9)", "rgba(255,240,190,.9)"]) },
  silver: { rate: 86, life: [0.22, 0.38], size: [8, 12], speed: [40, 160], drag: 10.5, add: true, color: paletteColor(["rgba(210,214,220,.86)", "rgba(160,180,200,.86)", "rgba(230,240,245,.86)"]) },
  storm: { rate: 92, life: [0.20, 0.36], size: [8, 12], speed: [45, 180], drag: 9.8, add: true, color: paletteColor(["rgba(0,191,255,.88)", "rgba(135,206,250,.88)", "rgba(255,255,255,.78)"]) },
  magma: { rate: 100, life: [0.18, 0.34], size: [9, 14], speed: [50, 185], drag: 9.0, add: true, color: paletteColor(["rgba(255,69,0,.9)", "rgba(255,140,0,.9)", "rgba(255,215,128,.88)"]) },
  celestial: { rate: 88, life: [0.26, 0.46], size: [8, 13], speed: [38, 160], drag: 10.4, add: true, color: sweepColor({ base: 200, spread: 200, sat: 92, light: 78, alpha: 0.84 }), hueRate: 170 },
  nebula: { rate: 94, life: [0.22, 0.40], size: [9, 14], speed: [45, 180], drag: 9.8, add: true, color: paletteColor(["rgba(138,43,226,.86)", "rgba(72,61,139,.84)", "rgba(46,139,187,.84)", "rgba(199,21,133,.84)"]) },
  citrus: { rate: 80, life: [0.20, 0.36], size: [7, 12], speed: [35, 150], drag: 10.2, add: true, color: paletteColor(["rgba(255,195,0,.86)", "rgba(144,238,144,.82)", "rgba(255,165,0,.86)"]) },
  cotton: { rate: 82, life: [0.24, 0.44], size: [8, 12], speed: [34, 150], drag: 10.3, add: true, color: paletteColor(["rgba(255,183,197,.82)", "rgba(179,206,255,.82)", "rgba(255,240,255,.82)"]) },
  plasma: { rate: 102, life: [0.18, 0.32], size: [9, 14], speed: [55, 190], drag: 9.4, add: true, color: paletteColor(["rgba(0,255,234,.9)", "rgba(202,0,255,.9)", "rgba(112,0,255,.9)"]) },
  royal: { rate: 90, life: [0.22, 0.40], size: [8, 13], speed: [38, 160], drag: 10.1, add: true, color: paletteColor(["rgba(102,51,153,.88)", "rgba(186,85,211,.88)", "rgba(255,223,186,.86)"]) },
  ultraviolet: { rate: 96, life: [0.20, 0.36], size: [8, 14], speed: [50, 180], drag: 9.7, add: true, color: paletteColor(["rgba(111,0,255,.9)", "rgba(64,0,128,.88)", "rgba(180,0,255,.9)"]) },
  dragonfire: { rate: 115, life: [0.20, 0.36], size: [11, 16], speed: [60, 200], drag: 8.8, add: true, color: paletteColor(["rgba(255,80,0,.94)", "rgba(255,0,66,.94)", "rgba(255,180,0,.9)"]) }
};

export function getTrailStyle(id) {
  return TRAIL_STYLES[id] || TRAIL_STYLES.classic;
}

export function listTrailIds() {
  return Object.keys(TRAIL_STYLES);
}
