// =====================
// FILE: public/js/trailPreview.js
// =====================
import { DEFAULT_CONFIG } from "./config.js";
import { clamp, createSeededRand, getRandSource } from "./util.js";
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

function lerp(a, b, t) { return a + (b - a) * t; }

function safeGetCanvasContext(canvas, type = "2d") {
  if (!canvas?.getContext) return null;
  try {
    return canvas.getContext(type) || null;
  } catch {
    return null;
  }
}

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
    this.ctx = safeGetCanvasContext(this.canvas);
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
    this._flightSegments = [];
    this._flightTime = 0;
    this._flightDirection = this._randRange(-Math.PI, Math.PI);
    this._flightSpin = this._randRange(0.6, 1.2) * (this._randRange(0, 1) > 0.5 ? 1 : -1);
    this._flightSway = this._randRange(0.06, 0.18);
    this._flightEase = this._randRange(0.25, 0.45);

    this._resetSimulationState();
    this.resize();
  }

  _resetSimulationState() {
    this._flightSegments.length = 0;
    this._flightTime = 0;
    this._flightDirection = this._randRange(-Math.PI, Math.PI);
    this._flightSpin = this._randRange(0.6, 1.2) * (this._randRange(0, 1) > 0.5 ? 1 : -1);
    this._flightSway = this._randRange(0.06, 0.18);
    this._flightEase = this._randRange(0.25, 0.45);
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
    this._resetSimulationState();
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
    const fallback = getRandSource();
    return a + (b - a) * (this._rand ? this._rand() : fallback());
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
    this._advanceFlightPath(dt, marginX, marginY);

    this.player.phase += dt * 1.04;
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

  _bezierPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
    return { x, y };
  }

  _bezierTangent(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const x = -3 * uu * p0.x + 3 * uu * p1.x - 6 * u * t * p1.x + 6 * u * t * p2.x - 3 * tt * p2.x + 3 * tt * p3.x;
    const y = -3 * uu * p0.y + 3 * uu * p1.y - 6 * u * t * p1.y + 6 * u * t * p2.y - 3 * tt * p2.y + 3 * tt * p3.y;
    return { x, y };
  }

  _blendTowardAnchor(point, marginX, marginY) {
    const anchorX = clamp(this.anchor?.x ?? 0.5, marginX, 1 - marginX);
    const anchorY = clamp(this.anchor?.y ?? 0.5, marginY, 1 - marginY);
    const bias = this._flightEase;
    return {
      x: clamp(lerp(point.x, anchorX, bias * 0.35), marginX, 1 - marginX),
      y: clamp(lerp(point.y, anchorY, bias * 0.28), marginY, 1 - marginY)
    };
  }

  _createFlightSegment(start, marginX, marginY) {
    const travel = this._randRange(0.16, 0.32);
    const heading = this._flightDirection + this._randRange(-0.38, 0.38);
    const arcDir = heading + Math.PI * 0.5 * this._flightSpin;
    const end = {
      x: clamp(start.x + Math.cos(heading) * travel, marginX, 1 - marginX),
      y: clamp(start.y + Math.sin(heading) * travel, marginY, 1 - marginY)
    };
    const bend = travel * (0.35 + this._flightEase * 0.65);
    const sway = this._flightSway * travel;
    const c1 = {
      x: clamp(start.x + Math.cos(heading) * bend + Math.cos(arcDir) * sway, marginX, 1 - marginX),
      y: clamp(start.y + Math.sin(heading) * bend + Math.sin(arcDir) * sway, marginY, 1 - marginY)
    };
    const c2 = {
      x: clamp(end.x - Math.cos(heading) * bend + Math.cos(arcDir) * sway, marginX, 1 - marginX),
      y: clamp(end.y - Math.sin(heading) * bend + Math.sin(arcDir) * sway, marginY, 1 - marginY)
    };
    const softenedEnd = this._blendTowardAnchor(end, marginX, marginY);
    const softenedC2 = this._blendTowardAnchor(c2, marginX, marginY);
    const duration = 1.05 + this._randRange(0.45, 0.95) + Math.hypot(softenedEnd.x - start.x, softenedEnd.y - start.y);
    this._flightDirection = Math.atan2(softenedEnd.y - start.y, softenedEnd.x - start.x) + this._flightSpin * 0.2;
    return {
      start,
      c1: this._blendTowardAnchor(c1, marginX, marginY),
      c2: softenedC2,
      end: softenedEnd,
      duration
    };
  }

  _ensureFlightSegments(marginX, marginY) {
    const origin = {
      x: clamp(this.anchor?.x ?? 0.5, marginX, 1 - marginX),
      y: clamp(this.anchor?.y ?? 0.56, marginY, 1 - marginY)
    };
    if (!this._flightSegments.length) {
      this._flightSegments.push(this._createFlightSegment(origin, marginX, marginY));
    }
    let cursor = this._flightSegments[this._flightSegments.length - 1].end;
    while (this._flightSegments.length < 3) {
      const next = this._createFlightSegment(cursor, marginX, marginY);
      this._flightSegments.push(next);
      cursor = next.end;
    }
  }

  _advanceFlightPath(dt, marginX, marginY) {
    this._ensureFlightSegments(marginX, marginY);
    let seg = this._flightSegments[0];
    const prevX = Number.isFinite(this.player.x) && this.player.x > 0 ? this.player.x : this.W * seg.start.x;
    const prevY = Number.isFinite(this.player.y) && this.player.y > 0 ? this.player.y : this.H * seg.start.y;
    this.player.prevX = prevX;
    this.player.prevY = prevY;

    this._flightTime += dt;
    while (seg && this._flightTime >= seg.duration && this._flightSegments.length > 1) {
      this._flightTime -= seg.duration;
      this._flightSegments.shift();
      this._ensureFlightSegments(marginX, marginY);
      seg = this._flightSegments[0];
    }
    let t = clamp(this._flightTime / Math.max(0.01, seg.duration), 0, 1);
    const ease = t * t * (3 - 2 * t);
    const pos = this._bezierPoint(ease, seg.start, seg.c1, seg.c2, seg.end);
    const tan = this._bezierTangent(ease, seg.start, seg.c1, seg.c2, seg.end);

    this.player.x = pos.x * this.W;
    this.player.y = pos.y * this.H;
    const tangentScale = 1 / Math.max(0.02, seg.duration);
    this.player.vx = tan.x * this.W * tangentScale;
    this.player.vy = tan.y * this.H * tangentScale;
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
    const applyShape = (prt, shape, sliceStyle, hexStyle) => {
      if (!shape) return;
      prt.shape = shape;
      if (shape === "lemon_slice") prt.slice = sliceStyle || null;
      if (shape === "hexagon") {
        prt.strokeColor = hexStyle?.stroke ?? prt.color;
        prt.fillColor = hexStyle?.fill ?? prt.color;
        prt.lineWidth = hexStyle?.lineWidth ?? prt.lineWidth;
      }
      prt.rotation = shape === "pixel" ? 0 : this._randRange(0, Math.PI * 2);
    };

    const flow = 0.8 + 0.4 * Math.sin(this.player.phase * 1.6);
    const glintFlow = glint.flowScale ?? flow;
    const sparkFlow = sparkle.flowScale ?? flow;
    const auraFlow = aura.flowScale ?? flow;
    this.trailHue = (this.trailHue + dt * (st.hueRate || 220)) % 360;
    this.trailAcc += dt * st.rate * flow;
    this.trailGlintAcc += dt * (glint.rate ?? st.rate * 0.55) * glintFlow;
    this.trailSparkAcc += dt * (sparkle.rate ?? 34) * sparkFlow;
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
    const banding = st.banding;
    const bandCount = banding?.count ?? 0;
    const bandSpread = banding ? p.r * (banding.spreadScale ?? 0.9) : 0;
    const bandJitter = banding ? p.r * (banding.jitterScale ?? 0.08) : 0;
    const perpX = -backY;
    const perpY = backX;

    for (let i = 0; i < n; i++) {
      let jx = 0;
      let jy = 0;
      let bandIndex = i;
      if (banding && bandCount > 0) {
        bandIndex = i % bandCount;
        const t = bandCount > 1 ? bandIndex / (bandCount - 1) : 0.5;
        const offset = (t - 0.5) * 2 * bandSpread;
        const wobble = this._randRange(-bandJitter, bandJitter);
        jx = perpX * (offset + wobble);
        jy = perpY * (offset + wobble);
      } else {
        const jitter = this._randRange(0, Math.PI * 2);
        jx = Math.cos(jitter) * this._randRange(0, p.r * jitterScale);
        jy = Math.sin(jitter) * this._randRange(0, p.r * jitterScale);
      }

      const sp = this._randRange(st.speed[0], st.speed[1]) * distanceScale;
      const a = this._randRange(0, Math.PI * 2);
      const vx = backX * sp + Math.cos(a) * sp * 0.55;
      const vy = backY * sp + Math.sin(a) * sp * 0.55;

      const life = this._randRange(st.life[0], st.life[1]) * baseLifeScale;
      const size = this._randRange(st.size[0], st.size[1]) * 1.08;

      const colorIndex = banding ? bandIndex : i;
      const color = st.color ? st.color({ i: colorIndex, hue: this.trailHue, rand: this._randRange.bind(this) }) : "rgba(140,220,255,.62)";

      const prt = new Part(bx + jx, by + jy, vx, vy, life, size, color, st.add);
      applyShape(prt, st.particleShape, st.sliceStyle, st.hexStyle);
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
      applyShape(prt, aura.particleShape, null, aura.hexStyle);
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
      applyShape(prt, glint.particleShape, null, glint.hexStyle);
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
      applyShape(prt, sparkle.particleShape, null, sparkle.hexStyle);
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

  _drawPathGuides(ctx) {
    if (!this._flightSegments.length) return;
    ctx.save?.();
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "rgba(160,210,255,0.35)";
    ctx.beginPath?.();
    const first = this._flightSegments[0];
    ctx.moveTo?.(first.start.x * this.W, first.start.y * this.H);
    for (const seg of this._flightSegments) {
      ctx.bezierCurveTo?.(
        seg.c1.x * this.W, seg.c1.y * this.H,
        seg.c2.x * this.W, seg.c2.y * this.H,
        seg.end.x * this.W, seg.end.y * this.H
      );
    }
    ctx.stroke?.();

    ctx.globalAlpha = 0.65;
    ctx.fillStyle = "rgba(200,230,255,0.35)";
    for (const seg of this._flightSegments) {
      const t = 0.4;
      const crest = this._bezierPoint(t, seg.start, seg.c1, seg.c2, seg.end);
      ctx.beginPath?.();
      ctx.arc?.(crest.x * this.W, crest.y * this.H, 4.5, 0, Math.PI * 2);
      ctx.fill?.();
    }
    ctx.restore?.();
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

    this._drawPathGuides(ctx);

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
