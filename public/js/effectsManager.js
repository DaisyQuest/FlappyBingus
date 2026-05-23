import { clamp } from "./util.js";
import { Part } from "./entities.js";
const TRAIL_LIFE_SCALE = 1.45;
const TRAIL_DISTANCE_SCALE = 1.18;
const TRAIL_JITTER_SCALE = 0.55;
const TRAIL_AURA_RATE = 0.42;

export function emitTrail(game, dt) {
  const id = game.getTrailId();
  const st = game._trailStyle(id);
  const vrand = (a, b) => game._visualRand(a, b);
  const glint = st.glint || {};
  const sparkle = st.sparkle || {};
  const aura = st.aura || {};
  const extras = Array.isArray(st.extras) ? st.extras : [];
  const particleScale = game._particleScale();
  const reducedEffects = Boolean(game.skillSettings?.reducedEffects);

  const baseLifeScale = st.lifeScale ?? TRAIL_LIFE_SCALE;
  const distanceScale = st.distanceScale ?? TRAIL_DISTANCE_SCALE;
  const auraRate = reducedEffects ? 0 : (aura.rate ?? st.rate * TRAIL_AURA_RATE);
  const auraLifeScale = aura.lifeScale ?? baseLifeScale;
  const auraDistanceScale = aura.distanceScale ?? distanceScale;
  const auraSizeScale = aura.sizeScale ?? 1.08;
  const jitterScale = st.jitterScale ?? TRAIL_JITTER_SCALE;
  const applyShape = (prt, shape, sliceStyle, hexStyle) => {
    if (!shape) return;
    prt.shape = shape;
    if (shape === "lemon_slice") prt.slice = sliceStyle || null;
    if (shape === "hexagon") {
      prt.strokeColor = hexStyle?.stroke ?? prt.color;
      prt.fillColor = hexStyle?.fill ?? prt.color;
      prt.lineWidth = hexStyle?.lineWidth ?? prt.lineWidth;
    }
    prt.rotation = shape === "pixel" ? 0 : vrand(0, Math.PI * 2);
  };
  const ensureExtraAcc = () => {
    if (game.trailExtraAcc.length !== extras.length) {
      game.trailExtraAcc = extras.map(() => 0);
    }
  };
  const resolveRange = (group, key, fallback) => {
    const range = group?.[key];
    return Array.isArray(range) && range.length === 2 ? range : fallback;
  };
  const p = game.player;
  const hasVelocity = Math.abs(p.vx) > 1e-5 || Math.abs(p.vy) > 1e-5;
  const dirX = hasVelocity ? p.vx : p.lastX;
  const dirY = hasVelocity ? p.vy : p.lastY;
  const back = Math.atan2(dirY, dirX) + Math.PI;
  const backX = Math.cos(back), backY = Math.sin(back);
  const bx = p.x - backX * p.r * 0.6;
  const by = p.y - backY * p.r * 0.6;
  const banding = st.banding || {};
  const emitTrailGroup = (count, group = {}) => {
    const groupBanding = group.banding ?? banding;
    const groupBandCount = groupBanding?.count ?? 0;
    const groupBandSpread = groupBanding ? p.r * (groupBanding.spreadScale ?? 0.9) : 0;
    const groupBandJitter = groupBanding ? p.r * (groupBanding.jitterScale ?? 0.08) : 0;
    const groupJitterScale = group.jitterScale ?? jitterScale;
    const groupSpeed = resolveRange(group, "speed", st.speed);
    const groupLife = resolveRange(group, "life", st.life);
    const groupSize = resolveRange(group, "size", st.size);
    const groupLifeScale = group.lifeScale ?? baseLifeScale;
    const groupDistanceScale = group.distanceScale ?? distanceScale;
    const groupSizeScale = group.sizeScale ?? 1.08;
    const groupColor = group.color || st.color;
    const groupAdd = group.add ?? st.add;
    const groupDrag = group.drag ?? st.drag;
    const groupShape = group.particleShape ?? st.particleShape;
    const groupSlice = group.sliceStyle ?? st.sliceStyle;
    const groupHex = group.hexStyle ?? st.hexStyle;
    const groupPerpX = -backY;
    const groupPerpY = backX;

    for (let i = 0; i < count; i++) {
      let jx = 0;
      let jy = 0;
      let bandIndex = i;
      if (groupBanding && groupBandCount > 0) {
        bandIndex = i % groupBandCount;
        const t = groupBandCount > 1 ? bandIndex / (groupBandCount - 1) : 0.5;
        const offset = (t - 0.5) * 2 * groupBandSpread;
        const wobble = vrand(-groupBandJitter, groupBandJitter);
        jx = groupPerpX * (offset + wobble);
        jy = groupPerpY * (offset + wobble);
      } else {
        const jitter = vrand(0, Math.PI * 2);
        jx = Math.cos(jitter) * vrand(0, p.r * groupJitterScale);
        jy = Math.sin(jitter) * vrand(0, p.r * groupJitterScale);
      }

      const sp = vrand(groupSpeed[0], groupSpeed[1]) * groupDistanceScale;
      const ang = vrand(0, Math.PI * 2);
      const vx = backX * sp + Math.cos(ang) * sp * 0.55;
      const vy = backY * sp + Math.sin(ang) * sp * 0.55;

      const life = vrand(groupLife[0], groupLife[1]) * groupLifeScale;
      const size = vrand(groupSize[0], groupSize[1]) * groupSizeScale;

      const colorIndex = groupBanding ? bandIndex : i;
      const color = groupColor ? groupColor({ i: colorIndex, hue: game.trailHue, rand: vrand }) : "rgba(140,220,255,.62)";

      const prt = new Part(bx + jx, by + jy, vx, vy, life, size, color, groupAdd);
      applyShape(prt, groupShape, groupSlice, groupHex);
      prt.drag = groupDrag;
      game.parts.push(prt);
    }
  };
  const emitAuraGroup = (count, group = {}) => {
    const groupOrbit = resolveRange(group, "orbit", aura.orbit ?? [p.r * 0.65, p.r * 1.65]);
    const groupSpeed = resolveRange(group, "speed", aura.speed ?? [st.speed[0] * 0.65, st.speed[1] * 1.1]);
    const groupLife = resolveRange(group, "life", aura.life ?? [st.life[0] * 0.9, st.life[1] * 1.15]);
    const groupSize = resolveRange(group, "size", aura.size ?? [st.size[0] * 0.9, st.size[1] * 1.25]);
    const groupLifeScale = group.lifeScale ?? auraLifeScale;
    const groupDistanceScale = group.distanceScale ?? auraDistanceScale;
    const groupSizeScale = group.sizeScale ?? auraSizeScale;
    const groupColor = group.color || aura.color || st.color;
    const groupAdd = group.add ?? aura.add ?? st.add;
    const groupDrag = group.drag ?? aura.drag ?? st.drag ?? 10.5;
    const groupShape = group.particleShape ?? aura.particleShape;
    const groupHex = group.hexStyle ?? aura.hexStyle;

    for (let i = 0; i < count; i++) {
      const orbit = vrand(groupOrbit[0], groupOrbit[1]);
      const ang = vrand(0, Math.PI * 2);
      const sp = vrand(groupSpeed[0], groupSpeed[1]) * groupDistanceScale;

      const ox = Math.cos(ang) * orbit;
      const oy = Math.sin(ang) * orbit;

      const vx = (Math.cos(ang) * sp) + backX * sp * 0.2;
      const vy = (Math.sin(ang) * sp) + backY * sp * 0.2;

      const life = vrand(groupLife[0], groupLife[1]) * groupLifeScale;
      const size = vrand(groupSize[0], groupSize[1]) * groupSizeScale;
      const color = groupColor ? groupColor({ i, hue: game.trailHue, rand: vrand }) : "rgba(140,220,255,.62)";

      const prt = new Part(bx + ox, by + oy, vx, vy, life, size, color, groupAdd);
      applyShape(prt, groupShape, null, groupHex);
      prt.drag = groupDrag;
      game.parts.push(prt);
    }
  };
  const emitGlintGroup = (count, group = {}) => {
    const groupSpeed = resolveRange(group, "speed", glint.speed ?? [st.speed[0] * 0.8, st.speed[1] * 1.4]);
    const groupLife = resolveRange(group, "life", glint.life ?? [st.life[0] * 0.9, st.life[1] * 1.4]);
    const groupSize = resolveRange(group, "size", glint.size ?? [st.size[0] * 0.75, st.size[1] * 1.1]);
    const groupLifeScale = group.lifeScale ?? baseLifeScale;
    const groupDistanceScale = group.distanceScale ?? distanceScale;
    const groupSizeScale = group.sizeScale ?? 1.08;
    const groupColor = group.color || glint.color || st.color;
    const groupAdd = group.add ?? glint.add ?? st.add;
    const groupDrag = group.drag ?? glint.drag ?? st.drag ?? 10.5;
    const groupShape = group.particleShape ?? glint.particleShape;
    const groupSlice = group.sliceStyle ?? glint.sliceStyle;
    const groupHex = group.hexStyle ?? glint.hexStyle;

    for (let i = 0; i < count; i++) {
      const sp = vrand(groupSpeed[0], groupSpeed[1]) * groupDistanceScale;
      const ang = vrand(0, Math.PI * 2);
      const vx = backX * sp + Math.cos(ang) * sp * 0.5;
      const vy = backY * sp + Math.sin(ang) * sp * 0.5;

      const life = vrand(groupLife[0], groupLife[1]) * groupLifeScale;
      const size = vrand(groupSize[0], groupSize[1]) * groupSizeScale;

      const color = groupColor ? groupColor({ i, hue: game.trailHue, rand: vrand }) : "rgba(140,220,255,.62)";

      const prt = new Part(bx, by, vx, vy, life, size, color, groupAdd);
      applyShape(prt, groupShape, groupSlice, groupHex);
      prt.drag = groupDrag;
      game.parts.push(prt);
    }
  };
  const emitSparkleGroup = (count, group = {}) => {
    const groupSpeed = resolveRange(group, "speed", sparkle.speed ?? [st.speed[0] * 0.65, st.speed[1] * 1.1]);
    const groupLife = resolveRange(group, "life", sparkle.life ?? [st.life[0] * 0.9, st.life[1] * 1.1]);
    const groupSize = resolveRange(group, "size", sparkle.size ?? [st.size[0] * 0.6, st.size[1] * 0.9]);
    const groupLifeScale = group.lifeScale ?? baseLifeScale;
    const groupDistanceScale = group.distanceScale ?? distanceScale;
    const groupSizeScale = group.sizeScale ?? 0.85;
    const groupColor = group.color || sparkle.color || st.color;
    const groupAdd = group.add ?? sparkle.add ?? st.add;
    const groupDrag = group.drag ?? sparkle.drag ?? st.drag ?? 11.2;
    const groupShape = group.particleShape ?? sparkle.particleShape;
    const groupSlice = group.sliceStyle ?? sparkle.sliceStyle;
    const groupHex = group.hexStyle ?? sparkle.hexStyle;

    for (let i = 0; i < count; i++) {
      const sp = vrand(groupSpeed[0], groupSpeed[1]) * groupDistanceScale;
      const ang = vrand(0, Math.PI * 2);
      const vx = backX * sp + Math.cos(ang) * sp * 0.35;
      const vy = backY * sp + Math.sin(ang) * sp * 0.35;

      const life = vrand(groupLife[0], groupLife[1]) * groupLifeScale;
      const size = vrand(groupSize[0], groupSize[1]) * groupSizeScale;

      const color = groupColor ? groupColor({ i, hue: game.trailHue, rand: vrand }) : "rgba(140,220,255,.62)";

      const prt = new Part(bx, by, vx, vy, life, size, color, groupAdd);
      applyShape(prt, groupShape, groupSlice, groupHex);
      prt.drag = groupDrag;
      game.parts.push(prt);
    }
  };

  game.trailHue = (game.trailHue + dt * (st.hueRate || 220)) % 360;
  game.trailAcc += dt * st.rate * particleScale;
  const glintRate = reducedEffects ? 0 : (glint.rate ?? st.rate * 0.18);
  const sparkleRate = reducedEffects ? 0 : (sparkle.rate ?? st.rate * 0.22);
  if (reducedEffects) {
    game.trailGlintAcc = 0;
    game.trailSparkAcc = 0;
    game.trailAuraAcc = 0;
  }
  game.trailGlintAcc += dt * glintRate * particleScale;
  game.trailSparkAcc += dt * sparkleRate * particleScale;
  game.trailAuraAcc += dt * auraRate * particleScale;

  const n = game.trailAcc | 0;
  game.trailAcc -= n;
  const g = game.trailGlintAcc | 0;
  game.trailGlintAcc -= g;
  const s = game.trailSparkAcc | 0;
  game.trailSparkAcc -= s;
  const a = game.trailAuraAcc | 0;
  game.trailAuraAcc -= a;

  emitTrailGroup(n, st);
  emitAuraGroup(a, aura);
  emitGlintGroup(g, glint);
  emitSparkleGroup(s, sparkle);

  if (extras.length > 0) {
    ensureExtraAcc();
    extras.forEach((group, idx) => {
      const rate = Math.max(0, Number(group.rate) || 0);
      const mode = group.mode || "trail";
      const disableForReduced = reducedEffects && mode !== "trail";
      if (disableForReduced) return;
      game.trailExtraAcc[idx] += dt * rate * particleScale;
      const count = game.trailExtraAcc[idx] | 0;
      game.trailExtraAcc[idx] -= count;
      if (!count) return;
      if (mode === "trail") emitTrailGroup(count, group);
      else if (mode === "aura") emitAuraGroup(count, group);
      else if (mode === "glint") emitGlintGroup(count, group);
      else emitSparkleGroup(count, group);
    });
  }
}

export function updateComboSparkles(game, dt) {
  const sparkleAt = Number(game.cfg.ui.comboBar.sparkleAt) || 9999;
  if (game.combo >= sparkleAt) {
    const vrand = (a, b) => game._visualRand(a, b);
    const rate = Math.max(0, Number(game.cfg.ui.comboBar.sparkleRate) || 0) * game._particleScale();
    game.comboSparkAcc += dt * rate;
    const n = game.comboSparkAcc | 0;
    game.comboSparkAcc -= n;

    const { scoreX, scoreY, arcRadius, arcWidth } = game._scoreHudLayout();
    for (let i = 0; i < n; i++) {
      const a = vrand(Math.PI, Math.PI * 2);
      const r = arcRadius + vrand(-arcWidth * 0.4, arcWidth * 0.4);
      const px = scoreX + Math.cos(a) * r;
      const py = scoreY + Math.sin(a) * r;
      const sp = vrand(20, 90);
      const prt = new Part(px, py, Math.cos(a) * sp, Math.sin(a) * sp, vrand(0.18, 0.35), vrand(0.9, 1.7), "rgba(255,255,255,.7)", true);
      prt.drag = 10.5;
      game.parts.push(prt);
    }
  } else {
    game.comboSparkAcc = 0;
  }
}

export function updateEffects(game, dt) {
  for (const p of game.parts) p.update(dt);
  for (const t of game.floats) t.update(dt);
  for (let i = game.parts.length - 1; i >= 0; i--) if (game.parts[i].life <= 0) game.parts.splice(i, 1);
  for (let i = game.floats.length - 1; i >= 0; i--) if (game.floats[i].life <= 0) game.floats.splice(i, 1);
}
