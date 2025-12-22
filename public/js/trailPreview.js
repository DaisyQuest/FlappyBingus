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

const ORB_TIMER_RANGE = [0.65, 1.45];
const PIPE_TIMER_RANGE = [0.95, 1.55];
const WALL_TIMER_RANGE = [4.4, 7.8];
const SKILL_SEQUENCE = ["dash", "phase", "teleport", "dashDestroy", "slowField", "slowExplosion"];

function lerp(a, b, t) { return a + (b - a) * t; }

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

    this._resetSimulationState();
    this.resize();
  }

  _resetSimulationState() {
    this.orbs = [];
    this.pipes = [];
    this._orbTimer = 0.2;
    this._pipeTimer = 0.35;
    this._wallTimer = 2.4;
    this._skillTimer = 0.5;
    this._activeTarget = { x: 0.5, y: 0.56 };
    this._skillState = {
      active: null,
      cooldowns: {},
      queue: SKILL_SEQUENCE.slice(),
      queueIndex: 0,
      history: [],
      slowField: null,
      pendingTeleport: null
    };
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
    this._updateSimulation(dt, marginX, marginY);

    const phase = this.player.phase;
    const wobbleX = Math.sin(phase * 0.82) * 0.08;
    const wobbleY = Math.cos(phase * 0.7) * 0.07;
    const lift = Math.sin(phase * 0.2) * 0.05;

    const normalizedX = clamp((this.player.x || this.W * 0.5) / this.W, marginX, 1 - marginX);
    const normalizedY = clamp((this.player.y || this.H * 0.5) / this.H, marginY, 1 - marginY);

    const target = this._selectTarget(normalizedX, normalizedY, marginX, marginY);
    this._wanderTimer -= dt;

    if (this._wanderTimer <= 0 || Math.hypot(target.x - normalizedX, target.y - normalizedY) > 0.22) {
      const mix = 0.45 + this._randRange(0, 0.22);
      this._wanderTarget = {
        x: clamp(lerp(normalizedX, target.x, mix), marginX, 1 - marginX),
        y: clamp(lerp(normalizedY, target.y, mix), marginY, 1 - marginY)
      };
      this._wanderTimer = 0.6 + this._randRange(0.15, 0.65);
    }

    const skill = this._skillState.active;
    const speedBoost = (skill?.name === "dash" || skill?.name === "dashDestroy") ? 1.9 : 1;
    const pull = (skill ? 0.22 : 0.16) * (speedBoost > 1 ? 1.12 : 1);

    let targetX = normalizedX + (this._wanderTarget.x - normalizedX) * pull + wobbleX;
    let targetY = normalizedY + (this._wanderTarget.y - normalizedY) * pull + wobbleY + lift;

    if (skill?.name === "phase") {
      targetX = lerp(targetX, this._wanderTarget.x, 0.65);
      targetY = lerp(targetY, this._wanderTarget.y, 0.65);
    }

    targetX = clamp(targetX, marginX, 1 - marginX);
    targetY = clamp(targetY, marginY, 1 - marginY);

    const pendingTeleport = this._skillState.pendingTeleport;
    if (skill?.name === "teleport" && pendingTeleport && !pendingTeleport.done) {
      const destX = clamp(pendingTeleport.x ?? targetX, marginX, 1 - marginX);
      const destY = clamp(pendingTeleport.y ?? targetY, marginY, 1 - marginY);
      this.player.prevX = this.player.x || this.W * destX;
      this.player.prevY = this.player.y || this.H * destY;
      this.player.x = this.W * destX;
      this.player.y = this.H * destY;
      pendingTeleport.done = true;
    } else {
      this.player.prevX = this.player.x || this.W * targetX;
      this.player.prevY = this.player.y || this.H * targetY;
      const drift = 1 + (speedBoost - 1) * 0.45;
      this.player.x = this.W * lerp(normalizedX, targetX, drift);
      this.player.y = this.H * lerp(normalizedY, targetY, drift);
    }

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

  _spawnOrb(marginX, marginY) {
    const x = this._randRange(marginX, 1 - marginX) * this.W;
    const y = this._randRange(marginY, 1 - marginY) * this.H;
    const driftAng = this._randRange(0, Math.PI * 2);
    const driftSpd = this._randRange(10, 36);
    const r = this._randRange(9, 14);
    const life = this._randRange(6, 11);
    this.orbs.push({ x, y, vx: Math.cos(driftAng) * driftSpd, vy: Math.sin(driftAng) * driftSpd, r, life, pulse: this._randRange(0, Math.PI * 2) });
    this._orbTimer = this._randRange(ORB_TIMER_RANGE[0], ORB_TIMER_RANGE[1]);
  }

  _spawnPipe(marginX, marginY, wall = false) {
    const width = clamp(this.W * 0.08, 28, 72) * (wall ? 1.15 : 1);
    const gap = wall ? this.H * 0.22 : this._randRange(this.H * 0.28, this.H * 0.44);
    const center = clamp(this._randRange(marginY, 1 - marginY) * this.H, gap * 0.65, this.H - gap * 0.65);
    const speed = this._randRange(140, 220) * (wall ? 1.08 : 1);
    const wobble = wall ? 0 : this._randRange(-0.35, 0.35);
    const hue = this._randRange(180, 340);
    this.pipes.push({
      x: this.W + width,
      w: width,
      gapY: center,
      gapH: gap,
      speed,
      wobble,
      hue,
      solved: false,
      type: wall ? "wall" : "pipe"
    });
  }

  _nearestPipeAhead(normalizedX) {
    const px = normalizedX * this.W;
    return this.pipes
      .filter((p) => p.x + p.w > px)
      .sort((a, b) => a.x - b.x)[0] || null;
  }

  _nearestOrbAhead(nx, ny) {
    const px = nx * this.W;
    const py = ny * this.H;
    const best = this.orbs
      .filter((o) => o.x >= px - 24)
      .map((o) => ({ o, d: Math.hypot(o.x - px, o.y - py) }))
      .sort((a, b) => a.d - b.d)[0];
    return best?.o || null;
  }

  _collectOrbs() {
    const remaining = [];
    for (const orb of this.orbs) {
      const dx = orb.x - this.player.x;
      const dy = orb.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= orb.r + this.player.r * 0.7) {
        const pop = new Part(orb.x, orb.y, 0, 0, 0.8, orb.r * 0.8, "rgba(255,240,180,.88)", true);
        pop.twinkle = true;
        this.parts.push(pop);
        this._skillTimer = Math.max(this._skillTimer - 0.3, 0.4);
        continue;
      }
      remaining.push(orb);
    }
    this.orbs = remaining;
  }

  _updateOrbs(dt, marginX, marginY) {
    const padX = marginX * this.W;
    const padY = marginY * this.H;
    const next = [];
    for (const orb of this.orbs) {
      orb.life -= dt;
      if (orb.life <= 0) continue;
      orb.pulse += dt * 2.6;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      const pad = orb.r + 4;
      if (orb.x < padX + pad) { orb.x = padX + pad; orb.vx = Math.abs(orb.vx); }
      if (orb.x > this.W - padX - pad) { orb.x = this.W - padX - pad; orb.vx = -Math.abs(orb.vx); }
      if (orb.y < padY + pad) { orb.y = padY + pad; orb.vy = Math.abs(orb.vy); }
      if (orb.y > this.H - padY - pad) { orb.y = this.H - padY - pad; orb.vy = -Math.abs(orb.vy); }
      next.push(orb);
    }
    this.orbs = next;
  }

  _updatePipes(dt) {
    const next = [];
    const slowField = this._skillState.slowField;
    for (const pipe of this.pipes) {
      const cx = pipe.x + pipe.w * 0.5;
      const cy = pipe.gapY;
      let speedMul = 1;
      if (slowField) {
        const d = Math.hypot(cx - slowField.x, cy - slowField.y);
        if (d < slowField.radius) {
          const factor = clamp(1 - (slowField.radius - d) / slowField.radius, 0.25, 1);
          speedMul = 0.45 + factor * 0.35;
        }
      }

      pipe.x -= pipe.speed * dt * speedMul;
      pipe.gapY += Math.sin(pipe.wobble + pipe.x * 0.003) * 10 * dt;
      if (pipe.x + pipe.w > -this.W * 0.2) next.push(pipe);
    }
    this.pipes = next;
  }

  _selectSkillFromQueue() {
    for (let i = 0; i < this._skillState.queue.length; i++) {
      const idx = (this._skillState.queueIndex + i) % this._skillState.queue.length;
      const name = this._skillState.queue[idx];
      if ((this._skillState.cooldowns[name] || 0) <= 0) {
        this._skillState.queueIndex = (idx + 1) % this._skillState.queue.length;
        return name;
      }
    }
    return null;
  }

  _activateSkill(name, context = {}, marginX = 0.16, marginY = 0.18) {
    if (!name) return;
    const meta = DEFAULT_CONFIG.skills?.[name] || {};
    const duration = meta.duration || 0.35;
    const cooldown = meta.cooldown || 1.5;
    this._skillState.active = { name, timer: duration, duration, context };
    this._skillState.cooldowns[name] = cooldown;
    this._skillState.history.push(name);

    if (name === "teleport") {
      const tx = clamp(context.targetX ?? this._activeTarget.x, marginX, 1 - marginX);
      const ty = clamp(context.targetY ?? this._activeTarget.y, marginY, 1 - marginY);
      this._skillState.pendingTeleport = { x: tx, y: ty, done: false };
    }

    if (name === "dashDestroy" && context.wall) {
      context.wall.solved = true;
      context.wall.gapH = Math.max(context.wall.gapH, this.H * 0.48);
    }

    if (name === "slowField" || name === "slowExplosion") {
      const radius = (name === "slowExplosion")
        ? (DEFAULT_CONFIG.skills.slowExplosion?.radius ?? 140)
        : (DEFAULT_CONFIG.skills.slowField?.radius ?? 210);
      const life = meta.duration || 0.6;
      this._skillState.slowField = {
        x: this.player.x || this.W * 0.55,
        y: this.player.y || this.H * 0.55,
        radius,
        life,
        max: life
      };
    }

    this._skillTimer = this._randRange(0.9, 1.7);
  }

  _updateSkillTimers(dt) {
    if (this._skillState.active) {
      this._skillState.active.timer -= dt;
      if (this._skillState.active.timer <= 0) {
        this._skillState.active = null;
        this._skillState.pendingTeleport = null;
      }
    }

    for (const k of Object.keys(this._skillState.cooldowns)) {
      this._skillState.cooldowns[k] = Math.max(0, this._skillState.cooldowns[k] - dt);
    }

    const slow = this._skillState.slowField;
    if (slow) {
      slow.life -= dt;
      if (slow.life <= 0) this._skillState.slowField = null;
    }
  }

  _findIncomingWall() {
    const px = this.player.x || this.W * 0.5;
    return this.pipes
      .filter((p) => p.type === "wall" && !p.solved && p.x + p.w > px)
      .sort((a, b) => a.x - b.x)[0] || null;
  }

  _ensureSkillForWall(wall, marginX, marginY) {
    const dist = wall.x - (this.player.x || this.W * 0.5);
    if (dist > this.W * 0.38) return;
    if (this._skillState.active?.name === "dashDestroy" && this._skillState.active.context?.wall === wall) return;
    const priority = this._selectSkillFromQueue() || "dashDestroy";
    const targetY = clamp(wall.gapY / this.H, marginY, 1 - marginY);
    this._activateSkill(priority, { wall, targetX: clamp(wall.x / this.W, marginX, 1 - marginX), targetY }, marginX, marginY);
  }

  _updateSimulation(dt, marginX, marginY) {
    this._updateSkillTimers(dt);

    this._orbTimer -= dt;
    this._pipeTimer -= dt;
    this._wallTimer -= dt;
    this._skillTimer -= dt;

    if (this._orbTimer <= 0 && this.orbs.length < 6) {
      this._spawnOrb(marginX, marginY);
    }

    if (this._pipeTimer <= 0) {
      this._spawnPipe(marginX, marginY, false);
      this._pipeTimer = this._randRange(PIPE_TIMER_RANGE[0], PIPE_TIMER_RANGE[1]);
    }

    if (this._wallTimer <= 0) {
      this._spawnPipe(marginX, marginY, true);
      this._wallTimer = this._randRange(WALL_TIMER_RANGE[0], WALL_TIMER_RANGE[1]);
    }

    this._updateOrbs(dt, marginX, marginY);
    this._updatePipes(dt);
    const missingSkill = SKILL_SEQUENCE.find((s) => !this._skillState.history.includes(s));
    if (missingSkill && this._skillTimer <= 0.2) {
      this._activateSkill(missingSkill, {}, marginX, marginY);
      this._skillTimer = this._randRange(1, 1.6);
    }
    const wall = this._findIncomingWall();
    if (wall) {
      this._ensureSkillForWall(wall, marginX, marginY);
    } else if (this._skillTimer <= 0) {
      const freestyleSkill = this._selectSkillFromQueue();
      this._activateSkill(freestyleSkill, {}, marginX, marginY);
      this._skillTimer = this._randRange(1.2, 2.2);
    }

    this._collectOrbs();
  }

  _selectTarget(nx, ny, marginX, marginY) {
    const pipe = this._nearestPipeAhead(nx);
    let targetX = clamp(nx + 0.12, marginX, 1 - marginX);
    let targetY = clamp(0.56, marginY, 1 - marginY);

    if (pipe) {
      targetX = clamp(pipe.x / this.W - 0.05, marginX, 1 - marginX * 0.5);
      targetY = clamp(pipe.gapY / this.H, marginY, 1 - marginY);
      if (pipe.type === "wall" && pipe.solved) targetY = clamp(targetY + 0.08, marginY, 1 - marginY);
    }

    const orb = this._nearestOrbAhead(nx, ny);
    if (orb) {
      const ox = clamp(orb.x / this.W, marginX, 1 - marginX);
      const oy = clamp(orb.y / this.H, marginY, 1 - marginY);
      targetX = targetX * 0.55 + ox * 0.45;
      targetY = targetY * 0.35 + oy * 0.65;
    }

    this._activeTarget = { x: targetX, y: targetY };
    return this._activeTarget;
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

  _drawOrbs(ctx) {
    for (const orb of this.orbs) {
      ctx.save?.();
      const grad = ctx.createRadialGradient?.(orb.x, orb.y, orb.r * 0.35, orb.x, orb.y, orb.r * 1.25) || null;
      if (grad) {
        grad.addColorStop(0, "rgba(255,255,255,.95)");
        grad.addColorStop(0.7, "rgba(255,230,160,.55)");
        grad.addColorStop(1, "rgba(255,180,120,.18)");
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = "rgba(255,230,170,.75)";
      }
      ctx.beginPath?.();
      const wob = Math.sin(orb.pulse * 1.4) * orb.r * 0.15;
      ctx.arc?.(orb.x, orb.y, orb.r + wob, 0, Math.PI * 2);
      ctx.fill?.();
      ctx.restore?.();
    }
  }

  _drawPipes(ctx) {
    for (const pipe of this.pipes) {
      ctx.save?.();
      const x = pipe.x;
      const w = pipe.w;
      const gapTop = clamp(pipe.gapY - pipe.gapH * 0.5, 0, this.H);
      const gapBot = clamp(pipe.gapY + pipe.gapH * 0.5, 0, this.H);
      const color = ctx.createLinearGradient?.(x, 0, x + w, 0) || null;
      if (color) {
        color.addColorStop(0, `hsla(${pipe.hue},68%,72%,0.85)`);
        color.addColorStop(1, `hsla(${pipe.hue},62%,62%,0.85)`);
      }
      ctx.fillStyle = color || "rgba(160,220,180,.7)";
      ctx.strokeStyle = "rgba(255,255,255,.18)";
      ctx.lineWidth = 2.2;

      ctx.beginPath?.();
      ctx.rect?.(x, 0, w, gapTop);
      ctx.rect?.(x, gapBot, w, this.H - gapBot);
      ctx.fill?.();
      ctx.stroke?.();

      if (pipe.type === "wall") {
        ctx.globalAlpha = pipe.solved ? 0.35 : 0.65;
        ctx.fillStyle = "rgba(140,190,255,.22)";
        ctx.fillRect?.(x - 4, 0, 4, this.H);
      }
      ctx.restore?.();
    }
  }

  _drawSlowField(ctx) {
    const slow = this._skillState.slowField;
    if (!slow || !ctx.createRadialGradient) return;
    const g = ctx.createRadialGradient(slow.x, slow.y, slow.radius * 0.25, slow.x, slow.y, slow.radius);
    g.addColorStop(0, "rgba(160,200,255,0.28)");
    g.addColorStop(1, "rgba(120,160,255,0.02)");
    ctx.save?.();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = clamp(slow.life / Math.max(0.01, slow.max), 0, 1);
    ctx.fillStyle = g;
    ctx.beginPath?.();
    ctx.arc?.(slow.x, slow.y, slow.radius, 0, Math.PI * 2);
    ctx.fill?.();
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

    this._drawPipes(ctx);
    this._drawOrbs(ctx);
    this._drawSlowField(ctx);

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
