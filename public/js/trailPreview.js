// =====================
// FILE: public/js/trailPreview.js
// =====================
import { DEFAULT_CONFIG } from "./config.js";
import { clamp, createSeededRand } from "./util.js";
import { Part } from "./entities.js";
import { trailStyleFor } from "./trailStyles.js";

const TRAIL_LIFE_SCALE = 1.45;
const TRAIL_DISTANCE_SCALE = 1.18;
const TRAIL_JITTER_SCALE = 0.55;
const TRAIL_AURA_RATE = 0.42;
const MAX_FRAME_DT = 1 / 12;
const DEFAULT_MARGIN_X = 0.16;
const DEFAULT_MARGIN_Y = 0.18;
const MIN_MARGIN_X = 0.04;
const MIN_MARGIN_Y = 0.05;
const DEFAULT_OBSTRUCTION_PADDING = { x: 0.04, y: 0.06 };

export class TrailPreview {
  constructor({
    canvas,
    playerImg,
    requestFrame = (typeof requestAnimationFrame === "function" ? requestAnimationFrame : null),
    cancelFrame = (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : null),
    now = () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
    mode = "orbit",
    anchor = { x: 0.5, y: 0.5 },
    drawBackground = true,
    staticDrift = null,
    renderPlayer = true,
    obstructionElement = null,
    obstructionPadding = DEFAULT_OBSTRUCTION_PADDING
  } = {}) {
    this.canvas = canvas || null;
    this.ctx = this.canvas?.getContext?.("2d") || null;
    this.playerImg = playerImg;
    this.mode = mode;
    this.anchor = anchor || { x: 0.5, y: 0.5 };
    this.drawBackground = drawBackground !== false;
    this.staticDrift = staticDrift;
    this.renderPlayer = renderPlayer !== false;
    this.obstructionElement = obstructionElement;
    this.obstructionPadding = obstructionPadding || DEFAULT_OBSTRUCTION_PADDING;
    this._obstruction = null;

    this.parts = [];
    this.trailId = "classic";
    this.trailHue = 0;
    this.trailAcc = 0;
    this.trailGlintAcc = 0;
    this.trailSparkAcc = 0;
    this.trailAuraAcc = 0;
    this.player = { x: 0, y: 0, vx: 0, vy: 0, prevX: 0, prevY: 0, r: 18, w: 0, h: 0, phase: 0 };

    this.W = 320;
    this.H = 180;
    this.DPR = Math.max(1, (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));

    const bindToGlobal = (fn) => (typeof fn === "function" ? fn.bind(globalThis) : null);

    this._raf = bindToGlobal(requestFrame);
    this._cancel = bindToGlobal(cancelFrame);
    this._now = now;
    this._frame = null;
    this._tick = this._tick.bind(this);
    this.running = false;
    this.lastTs = 0;
    this._rand = createSeededRand("trail-preview-classic");
    this._wanderTarget = { x: 0.5, y: 0.56 };
    this._wanderTimer = 0;

    this.resize();
  }

  setTrail(id) {
    const nextId = id || "classic";
    this.trailId = nextId;
    this.trailHue = 0;
    this.trailAcc = 1;
    this.trailGlintAcc = 1;
    this.trailSparkAcc = 1;
    this.trailAuraAcc = 1;
    this.player.phase = 0;
    this.parts.length = 0;
    this._rand = createSeededRand(`trail-preview-${nextId}`);
  }

  setPlayerImage(playerImg) {
    this.playerImg = playerImg;
    this._computePlayerSize();
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.max(1, (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));
    this.DPR = dpr;

    const logicalW = Math.max(240, this.canvas.clientWidth || this.canvas.width || 320);
    const logicalH = Math.max(140, this.canvas.clientHeight || this.canvas.height || 180);
    this.W = logicalW;
    this.H = logicalH;
    this.canvas.width = Math.round(logicalW * dpr);
    this.canvas.height = Math.round(logicalH * dpr);
    this.ctx.setTransform?.(dpr, 0, 0, dpr, 0, 0);
    this.ctx.lineJoin = "round";
    this.ctx.lineCap = "round";
    this._computePlayerSize();
    this._measureObstruction();
  }

  start() {
    if (!this.ctx || !this.canvas || !this._raf) return;
    if (this.running) return;
    this.running = true;
    this.lastTs = 0;
    this._frame = this._raf(this._tick);
  }

  stop() {
    this.running = false;
    if (this._frame !== null && this._cancel) {
      this._cancel(this._frame);
    }
    this._frame = null;
  }

  _randRange(a, b) {
    return a + (b - a) * (this._rand ? this._rand() : Math.random());
  }

  _pickWanderTarget(marginX, marginY, currentX = 0.5, currentY = 0.5) {
    const rangeX = { min: marginX, max: 1 - marginX };
    const rangeY = { min: marginY, max: 1 - marginY };
    const radius = this._randRange(0.18, 0.48);
    const theta = this._randRange(0, Math.PI * 2);
    const offsetX = Math.cos(theta) * radius;
    const offsetY = Math.sin(theta) * radius;
    const centeredX = clamp(currentX + offsetX, rangeX.min, rangeX.max);
    const centeredY = clamp(currentY + offsetY, rangeY.min, rangeY.max);

    const wanderX = this._randRange(rangeX.min, rangeX.max);
    const wanderY = this._randRange(rangeY.min, rangeY.max);

    // Blend toward a random wander point to avoid stagnating around the same orbit.
    const mix = 0.35 + this._randRange(0, 0.35);
    const nextX = clamp(centeredX * (1 - mix) + wanderX * mix, rangeX.min, rangeX.max);
    const nextY = clamp(centeredY * (1 - mix) + wanderY * mix, rangeY.min, rangeY.max);
    return { x: nextX, y: nextY };
  }

  _measureObstruction() {
    const target = this.obstructionElement;
    if (!target?.getBoundingClientRect || !this.canvas?.getBoundingClientRect) {
      this._obstruction = null;
      return;
    }

    const canvasRect = this.canvas.getBoundingClientRect();
    const obstacleRect = target.getBoundingClientRect();
    const width = canvasRect.width || 0;
    const height = canvasRect.height || 0;
    if (width <= 0 || height <= 0) {
      this._obstruction = null;
      return;
    }

    const left = clamp((obstacleRect.left - canvasRect.left) / width, 0, 1);
    const right = clamp((obstacleRect.right - canvasRect.left) / width, 0, 1);
    const top = clamp((obstacleRect.top - canvasRect.top) / height, 0, 1);
    const bottom = clamp((obstacleRect.bottom - canvasRect.top) / height, 0, 1);

    if (right <= left || bottom <= top) {
      this._obstruction = null;
      return;
    }

    this._obstruction = {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }

  _computeMargins() {
    if (!this._obstruction) return { x: DEFAULT_MARGIN_X, y: DEFAULT_MARGIN_Y };

    const padX = this.obstructionPadding?.x ?? DEFAULT_OBSTRUCTION_PADDING.x;
    const padY = this.obstructionPadding?.y ?? DEFAULT_OBSTRUCTION_PADDING.y;
    const left = clamp(this._obstruction.left - padX, 0, 1);
    const right = clamp(this._obstruction.right + padX, 0, 1);
    const top = clamp(this._obstruction.top - padY, 0, 1);
    const bottom = clamp(this._obstruction.bottom + padY, 0, 1);

    const usableX = Math.min(left, 1 - right);
    const usableY = Math.min(top, 1 - bottom);
    const minMarginX = usableX > 0 ? Math.min(usableX, MIN_MARGIN_X * 0.5) : MIN_MARGIN_X * 0.5;
    const minMarginY = usableY > 0 ? Math.min(usableY, MIN_MARGIN_Y * 0.5) : MIN_MARGIN_Y * 0.5;

    const marginX = usableX > 0
      ? clamp(Math.min(DEFAULT_MARGIN_X, usableX * 0.9), minMarginX, usableX)
      : MIN_MARGIN_X;
    const marginY = usableY > 0
      ? clamp(Math.min(DEFAULT_MARGIN_Y, usableY * 0.9), minMarginY, usableY)
      : MIN_MARGIN_Y;

    return { x: marginX, y: marginY };
  }

  step(dt = null, now = null) {
    if (!this.ctx) return;
    const ts = (typeof now === "number" ? now : this._now());
    const prev = this.lastTs || ts;
    const frameDt = clamp(
      typeof dt === "number" ? dt : (this.lastTs ? (ts - prev) * 0.001 : 1 / 60),
      0,
      MAX_FRAME_DT
    );
    this.lastTs = ts;
    this._frameStep(frameDt);
  }

  _frameStep(dt) {
    this.resize();
    this._updatePlayer(dt);
    this._emitTrail(dt);
    this._updateParts(dt);
    this._draw();
  }

  _tick(ts) {
    if (!this.running) return;
    if (!this.ctx) {
      this.stop();
      return;
    }

    const now = (typeof ts === "number" ? ts : this._now());
    const prev = this.lastTs || now;
    const rawDt = (now - prev) * 0.001;
    const dt = clamp(this.lastTs ? rawDt : 1 / 60, 0, MAX_FRAME_DT);
    this.lastTs = now;

    this._frameStep(dt);

    this._frame = this._raf?.(this._tick) ?? null;
  }

  _updatePlayer(dt) {
    if (this.mode === "static") {
      this._updateStaticPlayer(dt);
      return;
    }
    this._computePlayerSize();
    const { x: marginX, y: marginY } = this._computeMargins();
    const phase = this.player.phase;
    const wobbleX = Math.sin(phase * 0.82) * 0.08;
    const wobbleY = Math.cos(phase * 0.7) * 0.07;
    const lift = Math.sin(phase * 0.2) * 0.05;

    const normalizedX = clamp((this.player.x || this.W * 0.5) / this.W, marginX, 1 - marginX);
    const normalizedY = clamp((this.player.y || this.H * 0.5) / this.H, marginY, 1 - marginY);

    this._wanderTimer -= dt;
    const wanderTarget = this._wanderTarget || { x: 0.5, y: 0.56 };
    const distToTarget = Math.hypot(wanderTarget.x - normalizedX, wanderTarget.y - normalizedY);
    if (this._wanderTimer <= 0 || distToTarget < 0.08) {
      this._wanderTarget = this._pickWanderTarget(marginX, marginY, normalizedX, normalizedY);
      this._wanderTimer = 0.8 + this._randRange(0.2, 1.2);
    }

    const pull = 0.16;
    let targetX = normalizedX + (this._wanderTarget.x - normalizedX) * pull + wobbleX;
    let targetY = normalizedY + (this._wanderTarget.y - normalizedY) * pull + wobbleY + lift;
    targetX = clamp(targetX, marginX, 1 - marginX);
    targetY = clamp(targetY, marginY, 1 - marginY);

    this.player.prevX = this.player.x || this.W * targetX;
    this.player.prevY = this.player.y || this.H * targetY;

    this.player.phase += dt * 1.04;
    this.player.x = this.W * targetX;
    this.player.y = this.H * targetY;
    const radiusScale = DEFAULT_CONFIG.player.radiusScale;
    const minRadius = Math.max(6, Math.min(this.player.w, this.player.h) * radiusScale);
    this.player.r = minRadius;

    const invDt = dt > 1e-4 ? 1 / dt : 0;
    this.player.vx = (this.player.x - this.player.prevX) * invDt;
    this.player.vy = (this.player.y - this.player.prevY) * invDt;
  }

  _updateStaticPlayer(dt) {
    this._computePlayerSize();
    const anchorX = clamp(this.anchor?.x ?? 0.5, 0.12, 0.88);
    const anchorY = clamp(this.anchor?.y ?? 0.5, 0.14, 0.86);
    const px = this.W * anchorX;
    const py = this.H * anchorY;

    this.player.prevX = this.player.x || px;
    this.player.prevY = this.player.y || py;
    this.player.x = px;
    this.player.y = py;

    const drift = this.staticDrift || {};
    const swing = drift.swing ?? 0.38;
    const wobble = drift.wobble ?? 0.28;
    const rate = drift.rate ?? 0.82;
    const heading = drift.heading ?? -Math.PI * 0.42;
    const speedBase = drift.speed ?? DEFAULT_CONFIG.player.maxSpeed * 0.42;

    const sway = Math.sin(this.player.phase * 0.9) * swing;
    const wobbleOffset = Math.sin(this.player.phase * 1.6) * wobble;
    const dir = heading + sway;
    this.player.vx = Math.cos(dir + wobbleOffset) * speedBase;
    this.player.vy = Math.sin(dir + wobbleOffset) * speedBase;
    this.player.phase += dt * rate;

    const radiusScale = DEFAULT_CONFIG.player.radiusScale;
    this.player.r = Math.max(6, Math.min(this.player.w, this.player.h) * radiusScale);
  }

  _computePlayerSize() {
    const cfg = DEFAULT_CONFIG.player;
    const base = Math.min(this.W, this.H);
    const target = clamp(base * cfg.sizeScale, cfg.sizeMin, cfg.sizeMax);
    const iw = this.playerImg?.naturalWidth || this.playerImg?.width || 1;
    const ih = this.playerImg?.naturalHeight || this.playerImg?.height || 1;
    this.player.w = target;
    this.player.h = target * (ih / iw);
    this.player.r = Math.min(this.player.w, this.player.h) * cfg.radiusScale;
  }

  _emitTrail(dt) {
    const st = trailStyleFor(this.trailId);
    const glint = st.glint || {};
    const sparkle = st.sparkle || {};
    const aura = st.aura || {};

    const baseLifeScale = st.lifeScale ?? TRAIL_LIFE_SCALE;
    const distanceScale = st.distanceScale ?? TRAIL_DISTANCE_SCALE;
    const auraRate = aura.rate ?? st.rate * TRAIL_AURA_RATE;
    const auraLifeScale = aura.lifeScale ?? baseLifeScale;
    const auraDistanceScale = aura.distanceScale ?? distanceScale;
    const auraSizeScale = aura.sizeScale ?? 1.08;
    const jitterScale = st.jitterScale ?? TRAIL_JITTER_SCALE;

    const flow = 0.8 + 0.4 * Math.sin(this.player.phase * 1.6);
    const glintFlow = glint.flowScale ?? flow;
    const sparkFlow = sparkle.flowScale ?? flow;
    const auraFlow = aura.flowScale ?? flow;
    this.trailHue = (this.trailHue + dt * (st.hueRate || 220)) % 360;
    this.trailAcc += dt * st.rate * flow;
    this.trailGlintAcc += dt * (glint.rate || st.rate * 0.55) * glintFlow;
    this.trailSparkAcc += dt * (sparkle.rate || 34) * sparkFlow;
    this.trailAuraAcc += dt * auraRate * auraFlow;

    const n = this.trailAcc | 0;
    this.trailAcc -= n;
    const g = this.trailGlintAcc | 0;
    this.trailGlintAcc -= g;
    const s = this.trailSparkAcc | 0;
    this.trailSparkAcc -= s;
    const a = this.trailAuraAcc | 0;
    this.trailAuraAcc -= a;

    const p = this.player;
    const vMag = Math.hypot(p.vx, p.vy) || 1;
    const backX = -p.vx / vMag;
    const backY = -p.vy / vMag;
    const bx = p.x + backX * p.r * 0.95;
    const by = p.y + backY * p.r * 0.95;
    const backA = Math.atan2(backY, backX);

    for (let i = 0; i < n; i++) {
      const jitter = this._randRange(0, Math.PI * 2);
      const jx = Math.cos(jitter) * this._randRange(0, p.r * jitterScale);
      const jy = Math.sin(jitter) * this._randRange(0, p.r * jitterScale);

      const sp = this._randRange(st.speed[0], st.speed[1]) * distanceScale;
      const a = this._randRange(0, Math.PI * 2);
      const vx = backX * sp + Math.cos(a) * sp * 0.55;
      const vy = backY * sp + Math.sin(a) * sp * 0.55;

      const life = this._randRange(st.life[0], st.life[1]) * baseLifeScale;
      const size = this._randRange(st.size[0], st.size[1]) * 1.08;

      const color = st.color ? st.color({ i, hue: this.trailHue, rand: this._randRange.bind(this) }) : "rgba(140,220,255,.62)";

      const prt = new Part(bx + jx, by + jy, vx, vy, life, size, color, st.add);
      prt.drag = st.drag;
      this.parts.push(prt);
    }

    for (let i = 0; i < a; i++) {
      const ang = this._randRange(0, Math.PI * 2);
      const wobble = this._randRange(-0.35, 0.35);
      const orbit = this._randRange(aura.orbit?.[0] ?? p.r * 0.65, aura.orbit?.[1] ?? p.r * 1.65);
      const px = p.x + Math.cos(ang) * orbit;
      const py = p.y + Math.sin(ang) * orbit;

      const sp = this._randRange(aura.speed?.[0] ?? st.speed[0] * 0.65, aura.speed?.[1] ?? st.speed[1] * 1.1) * auraDistanceScale;
      const vx = Math.cos(ang + wobble) * sp;
      const vy = Math.sin(ang + wobble) * sp;

      const life = this._randRange(aura.life?.[0] ?? st.life[0] * 0.9, aura.life?.[1] ?? st.life[1] * 1.15) * auraLifeScale;
      const size = this._randRange(aura.size?.[0] ?? st.size[0] * 0.9, aura.size?.[1] ?? st.size[1] * 1.25) * auraSizeScale;
      const color = aura.color
        ? aura.color({ i, hue: this.trailHue, rand: this._randRange.bind(this) })
        : (st.color ? st.color({ i, hue: this.trailHue, rand: this._randRange.bind(this) }) : "rgba(140,220,255,.62)");

      const prt = new Part(px, py, vx, vy, life, size, color, aura.add ?? st.add);
      prt.drag = aura.drag ?? st.drag ?? 10.5;
      prt.twinkle = aura.twinkle ?? true;
      this.parts.push(prt);
    }

    for (let i = 0; i < g; i++) {
      const spin = this._randRange(-0.9, 0.9);
      const off = this._randRange(p.r * 0.12, p.r * 0.58);
      const px = bx + Math.cos(backA + Math.PI + spin) * off;
      const py = by + Math.sin(backA + Math.PI + spin) * off;

      const sp = this._randRange(glint.speed?.[0] || 55, glint.speed?.[1] || 155) * distanceScale;
      const vx = backX * sp * 0.42 + Math.cos(backA + Math.PI + spin) * sp * 0.58;
      const vy = backY * sp * 0.42 + Math.sin(backA + Math.PI + spin) * sp * 0.58;

      const life = this._randRange(glint.life?.[0] || 0.18, glint.life?.[1] || 0.32) * baseLifeScale;
      const size = this._randRange(glint.size?.[0] || 1.2, glint.size?.[1] || 3.0);

      const color = glint.color
        ? glint.color({ i, hue: this.trailHue, rand: this._randRange.bind(this) })
        : "rgba(255,255,255,.9)";

      const prt = new Part(px, py, vx, vy, life, size, color, glint.add !== false);
      prt.drag = glint.drag ?? st.drag ?? 11.2;
      prt.twinkle = true;
      this.parts.push(prt);
    }

    for (let i = 0; i < s; i++) {
      const ang = this._randRange(0, Math.PI * 2);
      const orbit = this._randRange(p.r * 0.45, p.r * 1.05);
      const px = p.x + Math.cos(ang) * orbit;
      const py = p.y + Math.sin(ang) * orbit;

      const sp = this._randRange(sparkle.speed?.[0] || 20, sparkle.speed?.[1] || 55) * distanceScale;
      const wobble = this._randRange(-0.55, 0.55);
      const vx = Math.cos(ang + wobble) * sp * 0.65;
      const vy = Math.sin(ang + wobble) * sp * 0.65;

      const life = this._randRange(sparkle.life?.[0] || 0.28, sparkle.life?.[1] || 0.46) * baseLifeScale;
      const size = this._randRange(sparkle.size?.[0] || 1.0, sparkle.size?.[1] || 2.4) * 1.1;
      const color = sparkle.color
        ? sparkle.color({ i, hue: this.trailHue, rand: this._randRange.bind(this) })
        : "rgba(255,255,255,.88)";

      const prt = new Part(px, py, vx, vy, life, size, color, sparkle.add !== false);
      prt.drag = sparkle.drag ?? 12.5;
      prt.twinkle = true;
      this.parts.push(prt);
    }
  }

  _updateParts(dt) {
    const next = [];
    for (const part of this.parts) {
      part.update(dt);
      if (part.life > 0) next.push(part);
    }
    // Cap particles to keep the preview lightweight.
    const maxParts = 480;
    if (next.length > maxParts) next.splice(0, next.length - maxParts);
    this.parts = next;
  }

  _draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.save?.();
    ctx.clearRect?.(0, 0, this.W, this.H);

    if (this.drawBackground) {
      const bg = ctx.createLinearGradient?.(0, 0, this.W, this.H) || null;
      if (bg) {
        bg.addColorStop(0, "rgba(14,18,42,.92)");
        bg.addColorStop(1, "rgba(10,10,26,.86)");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, this.W, this.H);
      }

      const glow = ctx.createRadialGradient?.(this.W * 0.2, this.H * 0.4, 10, this.W * 0.25, this.H * 0.5, this.W * 0.8) || null;
      if (glow) {
        glow.addColorStop(0, "rgba(160,220,255,.22)");
        glow.addColorStop(1, "rgba(120,90,255,.06)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, this.W, this.H);
      }
    }

    for (const part of this.parts) {
      part.draw(ctx);
    }

    if (this.renderPlayer) {
      this._drawPlayer(ctx);
    }

    if (this.drawBackground) {
      const sheen = ctx.createLinearGradient?.(0, 0, 0, this.H) || null;
      if (sheen) {
        sheen.addColorStop(0, "rgba(255,255,255,.06)");
        sheen.addColorStop(1, "rgba(255,255,255,.01)");
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 0, this.W, this.H);
      }
    }

    ctx.restore?.();
  }

  _drawPlayer(ctx) {
    const p = this.player;
    ctx.save?.();
    ctx.translate?.(p.x, p.y);
    const defaultScale = DEFAULT_CONFIG.player.radiusScale || 1;
    const sizeX = p.w || (p.r / defaultScale);
    const sizeY = p.h || (p.r / defaultScale);
    const ang = Math.atan2(p.vy, p.vx) * 0.18;
    if (ctx.rotate) ctx.rotate(ang);

    const iw = this.playerImg?.naturalWidth || this.playerImg?.width || 0;
    const ih = this.playerImg?.naturalHeight || this.playerImg?.height || 0;
    const ready = this.playerImg?.complete !== false;
    if (ready && iw > 0 && ih > 0) {
      ctx.drawImage?.(this.playerImg, -sizeX * 0.5, -sizeY * 0.5, sizeX, sizeY);
    } else {
      const body = ctx.createRadialGradient?.(0, 0, p.r * 0.35, 0, 0, p.r * 1.4) || null;
      if (body) {
        body.addColorStop(0, "rgba(255,255,255,.95)");
        body.addColorStop(1, "rgba(190,210,255,.78)");
        ctx.fillStyle = body;
      } else {
        ctx.fillStyle = "rgba(220,230,255,.9)";
      }
      ctx.beginPath?.();
      ctx.arc?.(0, 0, p.r * 1.05, 0, Math.PI * 2);
      ctx.fill?.();

      ctx.strokeStyle = "rgba(255,255,255,.8)";
      ctx.lineWidth = Math.max(1.8, p.r * 0.25);
      ctx.beginPath?.();
      ctx.arc?.(0, 0, p.r * 1.25, 0, Math.PI * 2);
      ctx.stroke?.();
    }

    ctx.restore?.();
  }
}
