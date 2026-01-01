import { clamp, lerp, hexToRgb, lerpC, rgb } from "./util.js";

const DEFAULT_BACKGROUND_CONFIG = Object.freeze({
  id: "default-loop",
  name: "Aurora Drift",
  loopSeconds: 180,
  global: {
    baseColor: "#07101a",
    gradient: {
      shape: "radial",
      colors: ["#0f172a", "#1e293b"],
      angleDeg: 160,
      center: { x: 0.5, y: 0.4 },
      radius: 0.9,
      opacity: 0.8
    },
    glow: {
      color: "#60a5fa",
      intensity: 0.35,
      radius: 0.55,
      position: { x: 0.5, y: 0.35 }
    }
  },
  timeline: []
});

const EVENT_TYPES = new Set(["baseColorChange", "particleBurst", "randomGlow"]);

function clamp01(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, 0, 1);
}

function normalizeNumber(value, fallback = 0, min = -Infinity, max = Infinity) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, min, max);
}

function normalizePosition(pos, fallback = { x: 0.5, y: 0.5 }) {
  const fx = fallback?.x ?? 0.5;
  const fy = fallback?.y ?? 0.5;
  return {
    x: clamp01(pos?.x, clamp01(fx, 0.5)),
    y: clamp01(pos?.y, clamp01(fy, 0.5))
  };
}

function normalizeColor(value, fallback) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function normalizeTimeline(rawTimeline, loopSeconds) {
  if (!Array.isArray(rawTimeline)) return [];
  return rawTimeline
    .filter((entry) => entry && EVENT_TYPES.has(entry.type))
    .map((entry, idx) => {
      const time = normalizeNumber(entry.time, 0, 0, loopSeconds);
      const id = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : `event-${idx}-${entry.type}`;
      if (entry.type === "baseColorChange") {
        return {
          id,
          type: "baseColorChange",
          time,
          color: normalizeColor(entry.color, "#07101a"),
          transition: normalizeNumber(entry.transition, 0, 0, loopSeconds)
        };
      }
      if (entry.type === "particleBurst") {
        return {
          id,
          type: "particleBurst",
          time,
          x: clamp01(entry.x, 0.5),
          y: clamp01(entry.y, 0.5),
          count: Math.max(1, Math.floor(normalizeNumber(entry.count, 18, 1, 200))),
          color: normalizeColor(entry.color, "#e2e8f0"),
          speed: normalizeNumber(entry.speed, 70, 0, 1000),
          spread: normalizeNumber(entry.spread, 180, 0, 360),
          life: normalizeNumber(entry.life, 1.2, 0.1, 6)
        };
      }
      return {
        id,
        type: "randomGlow",
        time,
        x: entry.x === undefined || entry.x === null ? null : clamp01(entry.x, 0.5),
        y: entry.y === undefined || entry.y === null ? null : clamp01(entry.y, 0.5),
        color: normalizeColor(entry.color, "#7dd3fc"),
        radius: normalizeNumber(entry.radius, 0.45, 0.05, 1.5),
        intensity: normalizeNumber(entry.intensity, 0.45, 0.05, 1.5),
        duration: normalizeNumber(entry.duration, 2, 0.2, loopSeconds),
        randomize: entry.randomize === true
      };
    })
    .sort((a, b) => a.time - b.time);
}

export function normalizeBackgroundConfig(raw = {}) {
  const base = DEFAULT_BACKGROUND_CONFIG;
  const loopSeconds = Math.max(1, normalizeNumber(raw.loopSeconds, base.loopSeconds, 1, 60 * 60));
  const global = raw.global || {};
  const gradient = global.gradient || {};
  const glow = global.glow || {};

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : base.id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : base.name,
    loopSeconds,
    global: {
      baseColor: normalizeColor(global.baseColor, base.global.baseColor),
      gradient: {
        shape: gradient.shape === "linear" ? "linear" : "radial",
        colors: Array.isArray(gradient.colors) && gradient.colors.length >= 2
          ? [normalizeColor(gradient.colors[0], base.global.gradient.colors[0]), normalizeColor(gradient.colors[1], base.global.gradient.colors[1])]
          : base.global.gradient.colors.slice(),
        angleDeg: normalizeNumber(gradient.angleDeg, base.global.gradient.angleDeg, 0, 360),
        center: normalizePosition(gradient.center, base.global.gradient.center),
        radius: normalizeNumber(gradient.radius, base.global.gradient.radius, 0.1, 2),
        opacity: clamp01(gradient.opacity, base.global.gradient.opacity)
      },
      glow: {
        color: normalizeColor(glow.color, base.global.glow.color),
        intensity: normalizeNumber(glow.intensity, base.global.glow.intensity, 0, 2),
        radius: normalizeNumber(glow.radius, base.global.glow.radius, 0.05, 2),
        position: normalizePosition(glow.position, base.global.glow.position)
      }
    },
    timeline: normalizeTimeline(raw.timeline, loopSeconds)
  };
}

export function resolveBackgroundBaseColor(config, time) {
  const events = config.timeline.filter((entry) => entry.type === "baseColorChange");
  if (!events.length) return config.global.baseColor;

  const sorted = events.slice().sort((a, b) => a.time - b.time);
  if (time < sorted[0].time) return config.global.baseColor;
  let activeIndex = sorted.findIndex((entry) => entry.time > time) - 1;
  if (activeIndex < 0) activeIndex = sorted.length - 1;

  const current = sorted[activeIndex];
  const prev = sorted[(activeIndex - 1 + sorted.length) % sorted.length];
  const baseColor = activeIndex === 0 && time < sorted[0].time ? config.global.baseColor : prev?.color || config.global.baseColor;

  if (current.transition && current.transition > 0) {
    const windowStart = current.time;
    const windowEnd = current.time + current.transition;
    if (time >= windowStart && time <= windowEnd) {
      const t = clamp((time - windowStart) / current.transition, 0, 1);
      const from = hexToRgb(baseColor);
      const to = hexToRgb(current.color);
      return rgb(lerpC(from, to, t), 1);
    }
  }

  return current.color;
}

function spawnParticleBurst(state, event, scale) {
  const { rand } = state;
  const spreadRad = (event.spread / 360) * Math.PI * 2;
  for (let i = 0; i < event.count; i += 1) {
    const angle = rand() * spreadRad;
    const speed = event.speed * (0.7 + rand() * 0.6);
    const vx = (Math.cos(angle) * speed) / scale;
    const vy = (Math.sin(angle) * speed) / scale;
    state.particles.push({
      x: event.x,
      y: event.y,
      vx,
      vy,
      age: 0,
      life: event.life,
      size: 1 + rand() * 1.8,
      color: event.color
    });
  }
}

function spawnRandomGlow(state, event) {
  const { rand } = state;
  const x = event.randomize || event.x == null ? rand() : event.x;
  const y = event.randomize || event.y == null ? rand() : event.y;
  state.glows.push({
    x,
    y,
    age: 0,
    duration: event.duration,
    color: event.color,
    radius: event.radius,
    intensity: event.intensity
  });
}

function getEventsBetween(prevTime, nextTime, loopSeconds, events) {
  if (!events.length) return [];
  if (nextTime >= prevTime) {
    return events.filter((event) => event.time > prevTime && event.time <= nextTime);
  }
  return events.filter((event) => event.time > prevTime || event.time <= nextTime);
}

function updateParticles(state, dt) {
  for (const particle of state.particles) {
    particle.age += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
  state.particles = state.particles.filter((particle) => particle.age <= particle.life);
}

function updateGlows(state, dt) {
  for (const glow of state.glows) {
    glow.age += dt;
  }
  state.glows = state.glows.filter((glow) => glow.age <= glow.duration);
}

export function createBackgroundStudioRenderer({ config = DEFAULT_BACKGROUND_CONFIG, rand = Math.random } = {}) {
  let normalized = normalizeBackgroundConfig(config);
  const state = {
    config: normalized,
    time: 0,
    lastTime: 0,
    particles: [],
    glows: [],
    rand
  };

  function setConfig(nextConfig) {
    normalized = normalizeBackgroundConfig(nextConfig);
    state.config = normalized;
    state.time = 0;
    state.lastTime = 0;
    state.particles = [];
    state.glows = [];
  }

  function seek(time, { width = 1, height = 1 } = {}) {
    const loopSeconds = normalized.loopSeconds;
    const targetTime = clamp(normalizeNumber(time, 0, 0, loopSeconds), 0, loopSeconds);
    state.time = targetTime;
    state.lastTime = targetTime;
    state.particles = [];
    state.glows = [];
    const scale = Math.max(1, Math.min(width, height));

    for (const event of normalized.timeline) {
      if (event.type === "baseColorChange") continue;
      if (event.time > targetTime) break;
      const age = targetTime - event.time;
      if (event.type === "particleBurst" && age <= event.life) {
        spawnParticleBurst(state, event, scale);
        for (const particle of state.particles.slice(-event.count)) {
          particle.age = age;
          particle.x += particle.vx * age;
          particle.y += particle.vy * age;
        }
      }
      if (event.type === "randomGlow" && age <= event.duration) {
        spawnRandomGlow(state, event);
        const glow = state.glows[state.glows.length - 1];
        glow.age = age;
      }
    }
  }

  function update(dt, { width = 1, height = 1 } = {}) {
    const loopSeconds = normalized.loopSeconds;
    if (!loopSeconds) return;
    const prevTime = state.time;
    const nextRaw = prevTime + dt;
    const nextTime = nextRaw >= loopSeconds ? nextRaw % loopSeconds : nextRaw;
    const scale = Math.max(1, Math.min(width, height));

    const eventsToTrigger = getEventsBetween(prevTime, nextTime, loopSeconds, normalized.timeline);
    for (const event of eventsToTrigger) {
      if (event.type === "particleBurst") {
        spawnParticleBurst(state, event, scale);
      } else if (event.type === "randomGlow") {
        spawnRandomGlow(state, event);
      }
    }

    updateParticles(state, dt);
    updateGlows(state, dt);

    state.lastTime = prevTime;
    state.time = nextTime;
  }

  function render(ctx, { width = 1, height = 1 } = {}) {
    if (!ctx) return;
    const baseColor = resolveBackgroundBaseColor(normalized, state.time);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    const gradient = normalized.global.gradient;
    if (gradient.opacity > 0) {
      let fill;
      if (gradient.shape === "linear") {
        const angle = (gradient.angleDeg * Math.PI) / 180;
        const cx = width * 0.5;
        const cy = height * 0.5;
        const dx = Math.cos(angle) * width * 0.5;
        const dy = Math.sin(angle) * height * 0.5;
        fill = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      } else {
        const center = gradient.center || { x: 0.5, y: 0.5 };
        const radius = Math.max(1, Math.min(width, height) * gradient.radius);
        fill = ctx.createRadialGradient(
          width * center.x,
          height * center.y,
          0,
          width * center.x,
          height * center.y,
          radius
        );
      }
      fill.addColorStop(0, gradient.colors[0]);
      fill.addColorStop(1, gradient.colors[1]);
      ctx.globalAlpha = gradient.opacity;
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }

    const glow = normalized.global.glow;
    if (glow.intensity > 0) {
      drawGlow(ctx, {
        x: glow.position.x,
        y: glow.position.y,
        radius: glow.radius,
        intensity: glow.intensity,
        color: glow.color
      }, { width, height });
    }

    for (const timedGlow of state.glows) {
      const t = clamp(1 - timedGlow.age / timedGlow.duration, 0, 1);
      drawGlow(ctx, {
        x: timedGlow.x,
        y: timedGlow.y,
        radius: timedGlow.radius,
        intensity: timedGlow.intensity * t,
        color: timedGlow.color
      }, { width, height });
    }

    for (const particle of state.particles) {
      const lifeT = clamp(1 - particle.age / particle.life, 0, 1);
      const px = particle.x * width;
      const py = particle.y * height;
      ctx.globalAlpha = 0.35 + 0.65 * lifeT;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(px, py, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function resize(width = 1, height = 1) {
    seek(state.time, { width, height });
  }

  return {
    setConfig,
    update,
    render,
    resize,
    seek,
    getConfig: () => normalized,
    getTime: () => state.time,
    getState: () => ({
      time: state.time,
      particles: state.particles.slice(),
      glows: state.glows.slice()
    })
  };
}

function drawGlow(ctx, glow, { width, height }) {
  const radius = Math.max(1, Math.min(width, height) * glow.radius);
  const x = width * glow.x;
  const y = height * glow.y;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, glow.color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = glow.intensity;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

export { DEFAULT_BACKGROUND_CONFIG };
