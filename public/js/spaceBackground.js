import { clamp, getRandSource, hsla } from "./util.js";

const SPACE_BACKGROUND_COLOR = "#050a12";
const MAX_STAR_ALPHA = 0.45;
const MIN_STAR_ALPHA = 0.15;
const TWINKLE_AMPLITUDE = 0.15;
const PLAYER_SHIFT_MAX = 15;

const LAYERS = [
  { key: "far", min: 0, max: 0.3, factor: 0.1, speed: 4 },
  { key: "mid", min: 0.3, max: 0.7, factor: 0.3, speed: 8 },
  { key: "near", min: 0.7, max: 1.0, factor: 0.6, speed: 12 }
];

const DEFAULT_SETTINGS = {
  simpleBackground: false,
  reducedEffects: false,
  extremeLowDetail: false,
  reduceMotion: false
};

const createCanvas = (width, height) => {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return null;
};

const wrapCoord = (value, max) => {
  if (!max) return 0;
  return ((value % max) + max) % max;
};

const normalizeSettings = (settings = {}) => ({
  simpleBackground: !!settings.simpleBackground,
  reducedEffects: !!settings.reducedEffects,
  extremeLowDetail: !!settings.extremeLowDetail,
  reduceMotion: !!settings.reduceMotion
});

const settingsEqual = (a, b) =>
  a.simpleBackground === b.simpleBackground &&
  a.reducedEffects === b.reducedEffects &&
  a.extremeLowDetail === b.extremeLowDetail &&
  a.reduceMotion === b.reduceMotion;

const randomRange = (rand, min, max) => min + (max - min) * rand();
const randomInt = (rand, min, max) => Math.floor(min + (max - min + 1) * rand());

const getStarConfig = (settings, rand) => {
  if (settings.extremeLowDetail) {
    return { count: 0, twinkleRate: 0 };
  }
  if (settings.reducedEffects) {
    return { count: randomInt(rand, 60, 80), twinkleRate: 0.05 };
  }
  if (settings.simpleBackground) {
    return { count: randomInt(rand, 80, 100), twinkleRate: 0.08 };
  }
  return { count: randomInt(rand, 150, 200), twinkleRate: 0.15 };
};

const getNebulaCount = (settings, rand) => {
  if (settings.extremeLowDetail || settings.reducedEffects) return 0;
  if (settings.simpleBackground) return randomInt(rand, 3, 5);
  return randomInt(rand, 5, 8);
};

const getLayerForZ = (z) => LAYERS.find((layer) => z >= layer.min && z < layer.max) || LAYERS[LAYERS.length - 1];

const buildStar = (w, h, z, rand, twinkleRate) => {
  const layer = getLayerForZ(z);
  const baseAlpha = clamp(MIN_STAR_ALPHA + randomRange(rand, 0, 0.3) + layer.factor * 0.05, MIN_STAR_ALPHA, MAX_STAR_ALPHA);
  const size = 0.6 + randomRange(rand, 0, 1.2) + layer.factor * 0.4;
  const twinkle = rand() < twinkleRate;
  return {
    x: randomRange(rand, 0, w),
    y: randomRange(rand, 0, h),
    z,
    layer: layer.key,
    baseAlpha,
    size,
    twinkle,
    twinklePhase: randomRange(rand, 0, Math.PI * 2),
    twinkleSpeed: randomRange(rand, 0.8, 2.0)
  };
};

const buildNebulaWisp = (w, h, rand) => {
  const size = randomRange(rand, 30, 80);
  return {
    x: randomRange(rand, 0, w),
    y: randomRange(rand, 0, h),
    vx: randomRange(rand, -4, 4),
    vy: randomRange(rand, 2, 8),
    size,
    alpha: randomRange(rand, 0.02, 0.06),
    hue: randomRange(rand, 220, 280),
    life: 0,
    maxLife: randomRange(rand, 18, 36)
  };
};

const rebuildNebula = (state, rand, settings) => {
  state.nebula = [];
  const count = getNebulaCount(settings, rand);
  for (let i = 0; i < count; i += 1) {
    state.nebula.push(buildNebulaWisp(state.width, state.height, rand));
  }
};

const buildBurst = (w, h, rand) => {
  const particleCount = randomInt(rand, 6, 12);
  const particles = [];
  for (let i = 0; i < particleCount; i += 1) {
    const angle = randomRange(rand, 0, Math.PI * 2);
    const speed = randomRange(rand, 10, 24);
    particles.push({
      x: 0,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: randomRange(rand, 0.6, 1.8)
    });
  }
  return {
    x: randomRange(rand, 0.1 * w, 0.9 * w),
    y: randomRange(rand, 0.1 * h, 0.9 * h),
    particles,
    age: 0,
    maxAge: randomRange(rand, 1.5, 2.5)
  };
};

const resetBurstTimer = (state, rand) => {
  state.burstCooldown = randomRange(rand, 8, 15);
};

const rebuildStarLayers = (state, rand, settings) => {
  state.stars = [];
  state.layers = {};
  for (const layer of LAYERS) {
    state.layers[layer.key] = {
      ...layer,
      staticStars: [],
      twinkleStars: [],
      canvas: null,
      ctx: null
    };
  }
  const { count, twinkleRate } = getStarConfig(settings, rand);
  for (let i = 0; i < count; i += 1) {
    const star = buildStar(state.width, state.height, rand(), rand, twinkleRate);
    state.stars.push(star);
    const layerState = state.layers[star.layer];
    if (star.twinkle) layerState.twinkleStars.push(star);
    else layerState.staticStars.push(star);
  }
  renderStaticStarCanvases(state);
};

const renderStaticStarCanvases = (state) => {
  for (const layer of Object.values(state.layers)) {
    const canvas = createCanvas(state.width, state.height);
    if (!canvas) {
      layer.canvas = null;
      layer.ctx = null;
      continue;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      layer.canvas = null;
      layer.ctx = null;
      continue;
    }
    layer.canvas = canvas;
    layer.ctx = ctx;
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#ffffff";
    for (const star of layer.staticStars) {
      ctx.globalAlpha = star.baseAlpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
};

const drawTiledCanvas = (ctx, canvas, offsetX, offsetY, w, h) => {
  const ox = wrapCoord(offsetX, w);
  const oy = wrapCoord(offsetY, h);
  for (const dx of [0, -w, w]) {
    for (const dy of [0, -h, h]) {
      ctx.drawImage(canvas, ox + dx, oy + dy);
    }
  }
};

const computePlayerShift = (playerY, height, settings) => {
  if (!Number.isFinite(playerY) || height <= 0) return 0;
  if (settings.reduceMotion || settings.simpleBackground) return 0;
  const ratio = clamp((playerY - height * 0.5) / (height * 0.5), -1, 1);
  return ratio * PLAYER_SHIFT_MAX;
};

export function createSpaceBackground({ width, height, rand = getRandSource(), settings } = {}) {
  const w = Math.max(1, width || 0);
  const h = Math.max(1, height || 0);
  const normalized = normalizeSettings(settings);
  const state = {
    type: "space",
    width: w,
    height: h,
    color: SPACE_BACKGROUND_COLOR,
    vignetteStrength: 0.5,
    time: 0,
    stars: [],
    layers: {},
    layerOffsets: {
      far: { x: 0, y: 0 },
      mid: { x: 0, y: 0 },
      near: { x: 0, y: 0 }
    },
    nebula: [],
    bursts: [],
    burstCooldown: 0,
    settings: normalized,
    playerShift: 0
  };

  rebuildStarLayers(state, rand, normalized);
  rebuildNebula(state, rand, normalized);
  resetBurstTimer(state, rand);

  return state;
}

export function updateSpaceBackground(state, { width, height, dt, rand = getRandSource(), settings, playerY } = {}) {
  if (!state?.type) throw new Error("Space background state required.");
  const w = Math.max(1, width || state.width || 0);
  const h = Math.max(1, height || state.height || 0);
  const delta = Number(dt) || 0;
  const normalized = normalizeSettings(settings || state.settings);
  let dirty = false;

  if (!settingsEqual(normalized, state.settings) || w !== state.width || h !== state.height) {
    state.width = w;
    state.height = h;
    state.settings = normalized;
    rebuildStarLayers(state, rand, normalized);
    rebuildNebula(state, rand, normalized);
    state.bursts = [];
    resetBurstTimer(state, rand);
    dirty = true;
  }

  const nextShift = computePlayerShift(playerY, state.height, state.settings);
  if (nextShift !== state.playerShift) {
    state.playerShift = nextShift;
    dirty = true;
  }

  if (state.settings.extremeLowDetail) return dirty;

  if (delta > 0) {
    state.time += delta;
  }

  if (state.settings.reduceMotion) {
    return dirty;
  }

  if (!state.settings.simpleBackground) {
    for (const layer of Object.values(state.layers)) {
      const offset = state.layerOffsets[layer.key];
      const speedX = layer.speed * 0.2;
      const speedY = layer.speed;
      offset.x = wrapCoord(offset.x + speedX * delta, state.width);
      offset.y = wrapCoord(offset.y + speedY * delta, state.height);
      dirty = dirty || delta > 0;
    }
  }

  if (!state.settings.reducedEffects) {
    for (const wisp of state.nebula) {
      wisp.x += wisp.vx * delta;
      wisp.y += wisp.vy * delta;
      wisp.life += delta;
      if (wisp.life >= wisp.maxLife || wisp.x < -wisp.size || wisp.x > state.width + wisp.size || wisp.y > state.height + wisp.size) {
        Object.assign(wisp, buildNebulaWisp(state.width, state.height, rand));
      }
    }

    for (let i = state.bursts.length - 1; i >= 0; i -= 1) {
      const burst = state.bursts[i];
      burst.age += delta;
      for (const particle of burst.particles) {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
      }
      if (burst.age >= burst.maxAge) {
        state.bursts.splice(i, 1);
      }
    }

    state.burstCooldown -= delta;
    if (state.burstCooldown <= 0) {
      state.bursts.push(buildBurst(state.width, state.height, rand));
      resetBurstTimer(state, rand);
    }
    dirty = true;
  }

  return dirty;
}

export function renderSpaceBackground(ctx, state, { width, height } = {}) {
  if (!ctx || !state?.type) return;
  if (state.settings.extremeLowDetail) return;
  const w = Math.max(1, width || state.width || 0);
  const h = Math.max(1, height || state.height || 0);
  const playerShift = state.playerShift || 0;

  for (const layer of Object.values(state.layers)) {
    const offset = state.layerOffsets[layer.key];
    const layerShift = playerShift * (layer.factor / 0.6);
    if (layer.canvas) {
      drawTiledCanvas(ctx, layer.canvas, offset.x, offset.y + layerShift, w, h);
    } else {
      ctx.fillStyle = "#ffffff";
      for (const star of layer.staticStars) {
        ctx.globalAlpha = star.baseAlpha;
        ctx.beginPath();
        ctx.arc(wrapCoord(star.x + offset.x, w), wrapCoord(star.y + offset.y + layerShift, h), star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (layer.twinkleStars.length) {
      const animateTwinkle = !state.settings.simpleBackground && !state.settings.reduceMotion;
      ctx.fillStyle = "#ffffff";
      for (const star of layer.twinkleStars) {
        const twinkle = animateTwinkle
          ? 1 + TWINKLE_AMPLITUDE * Math.sin(state.time * star.twinkleSpeed + star.twinklePhase)
          : 1;
        const alpha = clamp(star.baseAlpha * twinkle, MIN_STAR_ALPHA, MAX_STAR_ALPHA);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(wrapCoord(star.x + offset.x, w), wrapCoord(star.y + offset.y + layerShift, h), star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  if (!state.settings.reducedEffects) {
    const midShift = playerShift * (0.3 / 0.6);
    for (const wisp of state.nebula) {
      const gradient = ctx.createRadialGradient(wisp.x, wisp.y + midShift, 0, wisp.x, wisp.y + midShift, wisp.size);
      gradient.addColorStop(0, hsla(wisp.hue, 60, 60, wisp.alpha));
      gradient.addColorStop(1, hsla(wisp.hue, 60, 60, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y + midShift, wisp.size, 0, Math.PI * 2);
      ctx.fill();
    }

    const nearShift = playerShift;
    for (const burst of state.bursts) {
      const ageRatio = clamp(1 - burst.age / burst.maxAge, 0, 1);
      ctx.fillStyle = "#ffffff";
      for (const particle of burst.particles) {
        ctx.globalAlpha = clamp(0.18 * ageRatio, 0, 0.2);
        ctx.beginPath();
        ctx.arc(burst.x + particle.x, burst.y + particle.y + nearShift, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

export const __testables = {
  normalizeSettings,
  settingsEqual,
  wrapCoord,
  getStarConfig,
  getNebulaCount,
  getLayerForZ,
  buildStar,
  buildNebulaWisp,
  buildBurst,
  computePlayerShift,
  renderStaticStarCanvases,
  rebuildStarLayers
};
