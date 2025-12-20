// =====================
// FILE: public/js/game.js
// =====================
import {
  clamp, lerp, rand, norm2, approach,
  circleRectInfo, circleCircle,
  hexToRgb, lerpC, rgb, shade, hsla
} from "./util.js";
import { ACTIONS, humanizeBind } from "./keybinds.js";

// NEW: orb pickup SFX (pitch shifts by combo)
import { sfxOrbBoop, sfxPerfectNice, sfxDashBounce } from "./audio.js";

const BASE_DPR = Math.max(0.25, window.devicePixelRatio || 1);

const STATE = Object.freeze({ MENU: 0, PLAY: 1, OVER: 2 });

import { Pipe, Gate, Orb, Part, FloatText } from "./entities.js";
import { spawnBurst, spawnCrossfire, spawnOrb, spawnSinglePipe, spawnWall } from "./spawn.js";
import { dashBounceMax, orbPoints, tickCooldowns } from "./mechanics.js";

export { Pipe, Gate, Orb, Part, FloatText };

export class Game {
  constructor({ canvas, ctx, config, playerImg, input, getTrailId, getBinds, onGameOver }) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.cfg = config;
    this.playerImg = playerImg;
    this.input = input;
    this.getTrailId = getTrailId || (() => "classic");
    this.getBinds = getBinds || (() => ({}));
    this.onGameOver = onGameOver || (() => {});

    this.state = STATE.MENU;

    this.W = 1; this.H = 1; this.DPR = 1;

    // Offscreen background (dots + vignette) to avoid repainting thousands of primitives per frame
    this.bgCanvas = null;
    this.bgCtx = null;
    this.bgDirty = true;

    this.bgDots = [];

    this.player = {
      x: 0, y: 0, vx: 0, vy: 0,
      w: 48, h: 48, r: 18,
      lastX: 0, lastY: -1,
      invT: 0,
      dashT: 0, dashVX: 0, dashVY: 0,
      dashBounces: 0,
      dashImpactFlash: 0
    };

    this.pipes = [];
    this.gates = [];
    this.orbs = [];
    this.parts = [];
    this.floats = [];

    this.score = 0;
    this.timeAlive = 0;

    this.pipeT = 0;
    this.specialT = 1.6;
    this.orbT = 1.0;

    this.combo = 0;
    this.comboBreakFlash = 0;
    this.comboSparkAcc = 0;

    this.perfectT = 0;
    this.perfectMax = 0;
    this.perfectCombo = 0;

    this._gapMeta = new Map(); // gapId -> { perfected }
    this._nextGapId = 1;

    this.lastDashReflect = null;
    this.slowField = null; // {x,y,r,fac,t,tm}

    this.cds = { dash: 0, phase: 0, teleport: 0, slowField: 0 };

    // trail emission
    this.trailAcc = 0;
    this.trailHue = 0;

    // NEW: allow main.js to disable SFX during replay/export if desired
    this.audioEnabled = true;
  }

  // NEW: toggle game SFX without touching music
  setAudioEnabled(on) {
    this.audioEnabled = !!on;
  }

  // NEW: orb pickup sound, pitched by combo
  _orbPickupSfx() {
    if (!this.audioEnabled) return;
    // combo already incremented by the time we call this
    sfxOrbBoop(this.combo | 0);
  }

  _perfectNiceSfx() {
    if (!this.audioEnabled) return;
    sfxPerfectNice();
  }


  resizeToWindow() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(1, Math.round(window.visualViewport?.width || window.innerWidth));
    const cssH = Math.max(1, Math.round(window.visualViewport?.height || window.innerHeight));
    const norm = Math.max(0.25, (window.devicePixelRatio || 1) / BASE_DPR);

    // Logical game space is normalized to the DPR at page load so browser zoom
    // does not change the effective playfield size.
    const logicalW = cssW * norm;
    const logicalH = cssH * norm;

    this.canvas.style.width = cssW + "px";
    this.canvas.style.height = cssH + "px";
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);

    this.ctx.setTransform(dpr / norm, 0, 0, dpr / norm, 0, 0);
    this.ctx.imageSmoothingEnabled = true;

    this.DPR = dpr / norm;
    this.W = logicalW;
    this.H = logicalH;

    // Expose logical size + zoom to input mapping.
    this.canvas._logicalW = logicalW;
    this.canvas._logicalH = logicalH;
    this.canvas._norm = norm;

    this._computePlayerSize();
    this._initBackground();
  }

  setStateMenu() {
    this.state = STATE.MENU;
    this._resetRun(false);
  }

  startRun() {
    this.state = STATE.PLAY;
    this._resetRun(true);
  }

  restartRun() {
    this.startRun();
  }

  handleAction(actionId) {
    if (this.state !== STATE.PLAY) return;
    this._useSkill(actionId);
  }

  _resetRun(clearScore) {
    this.pipes = [];
    this.gates = [];
    this.orbs = [];
    this.parts = [];
    this.floats = [];

    if (clearScore) this.score = 0;
    this.timeAlive = 0;

    this.pipeT = 0;
    this.specialT = 1.6;
    this.orbT = rand(this.cfg.catalysts.orbs.intervalMin, this.cfg.catalysts.orbs.intervalMax);

    this.combo = 0;
    this.comboBreakFlash = 0;
    this.comboSparkAcc = 0;

    this.perfectT = 0;
    this.perfectMax = 0;
    this.perfectCombo = 0;

    this._gapMeta.clear();
    this._nextGapId = 1;

    this.slowField = null;
    this.cds = { dash: 0, phase: 0, teleport: 0, slowField: 0 };

    this.trailAcc = 0;
    this.trailHue = 0;
    this.lastDashReflect = null;

    this._resetPlayer();
  }

  _resetPlayer() {
    const p = this.player;
    p.x = this.W * 0.5;
    p.y = this.H * 0.5;
    p.vx = 0; p.vy = 0;
    p.invT = 0;
    p.dashT = 0;
    p.dashBounces = 0;
    p.dashImpactFlash = 0;
    p.lastX = 0; p.lastY = -1;
  }

  _computePlayerSize() {
    const p = this.player;
    const base = Math.min(this.W, this.H);
    const target = clamp(base * this.cfg.player.sizeScale, this.cfg.player.sizeMin, this.cfg.player.sizeMax);
    const iw = this.playerImg.naturalWidth || 1;
    const ih = this.playerImg.naturalHeight || 1;
    p.w = target;
    p.h = target * (ih / iw);
    p.r = Math.min(p.w, p.h) * this.cfg.player.radiusScale;
  }

  _initBackground() {
    this.bgDots.length = 0;
    const n = Math.floor(clamp((this.W * this.H) / 11000, 80, 220));
    for (let i = 0; i < n; i++) {
      // IMPORTANT: visuals only -> do NOT use seeded rand()
      this.bgDots.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        r: 0.8 + Math.random() * (2.2 - 0.8),
        s: 4 + Math.random() * (22 - 4)
      });
    }

    this.bgDirty = true;
    this._refreshBackgroundLayer();
  }

  _refreshBackgroundLayer() {
    // Lazily allocate the offscreen buffer (supports both DOM and OffscreenCanvas)
    const canvasFactory = () => {
      if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(1, 1);
      if (typeof document !== "undefined") return document.createElement("canvas");
      return null;
    };

    if (!this.bgCanvas) this.bgCanvas = canvasFactory();
    if (!this.bgCanvas) return; // Fallback: will render directly to the main canvas

    const w = Math.max(1, Math.round(this.W));
    const h = Math.max(1, Math.round(this.H));

    // Resize invalidates the context state; reacquire each time we resize
    if (this.bgCanvas.width !== w || this.bgCanvas.height !== h) {
      this.bgCanvas.width = w;
      this.bgCanvas.height = h;
      this.bgCtx = null;
    }

    if (!this.bgCtx) this.bgCtx = this.bgCanvas.getContext("2d", { alpha: false });
    const bctx = this.bgCtx;
    if (!bctx) return;

    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, w, h);

    // background fill
    bctx.fillStyle = "#07101a";
    bctx.fillRect(0, 0, w, h);

    // vignette
    const vg = bctx.createRadialGradient(
      this.W * 0.5, this.H * 0.45, Math.min(this.W, this.H) * 0.12,
      this.W * 0.5, this.H * 0.5, Math.max(this.W, this.H) * 0.75
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,.44)");
    bctx.fillStyle = vg;
    bctx.fillRect(0, 0, w, h);

    // static dots
    bctx.save();
    bctx.globalAlpha = 0.75;
    bctx.fillStyle = "rgba(255,255,255,.20)";
    for (const p of this.bgDots) {
      bctx.beginPath();
      bctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      bctx.fill();
    }
    bctx.restore();

    this.bgDirty = false;
  }

  _margin() {
    return clamp(Math.min(this.W, this.H) * 0.25, 110, 240);
  }

  _isVisibleRect(x, y, w, h, margin = 0) {
    const m = Math.max(0, margin);
    return (x + w >= -m) && (x <= this.W + m) && (y + h >= -m) && (y <= this.H + m);
  }

  _difficulty01() {
    const t = this.timeAlive, s = this.score;
    const tc = Math.max(1e-3, Number(this.cfg.pipes.difficulty.timeToMax) || 38);
    const sc = Math.max(1e-3, Number(this.cfg.pipes.difficulty.scoreToMax) || 120);
    const ts = clamp(Number(this.cfg.pipes.difficulty.timeRampStart) || 0, 0, 1e6);
    const ss = clamp(Number(this.cfg.pipes.difficulty.scoreRampStart) || 0, 0, 1e9);
    const mt = clamp(Number(this.cfg.pipes.difficulty.mixTime) || 0.55, 0, 1);
    const ms = clamp(Number(this.cfg.pipes.difficulty.mixScore) || 0.45, 0, 1);
    const dT = 1 - Math.exp(-((Math.max(0, t - ts)) / tc));
    const dS = 1 - Math.exp(-((Math.max(0, s - ss)) / sc));
    const blended = clamp(mt * dT + ms * dS, 0, 1);
    const pow = Math.max(1, Number(this.cfg.pipes.difficulty.earlyCurvePower) || 1);
    return clamp(Math.pow(blended, pow), 0, 1);
  }

  _spawnInterval() {
    const d = this._difficulty01();
    const si = this.cfg.pipes.spawnInterval;
    return clamp(lerp(si.start, si.end, d), si.min, si.max);
  }

  _pipeSpeed() {
    const d = this._difficulty01();
    return lerp(this.cfg.pipes.speed.start, this.cfg.pipes.speed.end, d);
  }

  _thickness() {
    const base = Math.min(this.W, this.H), th = this.cfg.pipes.thickness;
    return clamp(base * th.scale, th.min, th.max);
  }

  _gapSize() {
    const d = this._difficulty01(), base = Math.min(this.W, this.H), g = this.cfg.pipes.gap;
    return clamp(lerp(base * g.startScale, base * g.endScale, d), g.min, g.max);
  }

  _pipeColor() {
    const d = this._difficulty01(), col = this.cfg.pipes.colors;
    const g = hexToRgb(col.green), b = hexToRgb(col.blue), y = hexToRgb(col.yellow), r = hexToRgb(col.red);
    if (d < 0.33) return lerpC(g, b, d / 0.33);
    if (d < 0.66) return lerpC(b, y, (d - 0.33) / 0.33);
    return lerpC(y, r, (d - 0.66) / 0.34);
  }

  _spawnSinglePipe(opts = {}) {
    spawnSinglePipe(this, opts);
  }

  _spawnWall(opts = {}) {
    spawnWall(this, opts);
  }

  _spawnBurst() {
    spawnBurst(this);
  }

  _spawnCrossfire() {
    spawnCrossfire(this);
  }

  _spawnOrb() {
    spawnOrb(this);
  }

  _orbPoints(comboNow) {
    return orbPoints(this.cfg, comboNow);
  }

  _breakCombo(x, y) {
    if (this.combo > 0) this.floats.push(new FloatText("COMBO BROKE", x, y, "rgba(255,90,90,.95)"));
    this.combo = 0;
    this.comboBreakFlash = 0.35;
  }

  _resetPerfectCombo() {
    this.perfectCombo = 0;
  }

  _onGapPipeRemoved(pipe) {
    if (!this._gapMeta) return;
    const gid = pipe?.gapId;
    if (!gid) return;
    const meta = this._gapMeta.get(gid);
    if (!meta) return;

    this._gapMeta.delete(gid);
    if (!meta.perfected) this._resetPerfectCombo();
  }

  _tickCooldowns(dt) {
    tickCooldowns(this.cds, dt);
  }

  _dashBounceMax() {
    return dashBounceMax(this.cfg);
  }

  _dashBounceSfx(speed = 0) {
    if (!this.audioEnabled) return;
    sfxDashBounce(speed);
  }

  _spawnDashReflectFx(x, y, nx, ny, power = 1) {
    const dir = Math.atan2(ny || 0, nx || 0);
    const sparkCount = 16;
    const strength = clamp(power, 0.4, 1.6);

    for (let i = 0; i < sparkCount; i++) {
      const spread = rand(-0.8, 0.8);
      const sp = rand(140, 320) * strength;
      const vx = Math.cos(dir + spread) * sp;
      const vy = Math.sin(dir + spread) * sp;
      const prt = new Part(x, y, vx, vy, rand(0.14, 0.30), rand(1.0, 2.1), "rgba(255,220,180,.90)", true);
      prt.drag = 11.5;
      this.parts.push(prt);
    }

    // Impact ring
    const ring = new Part(x, y, 0, 0, 0.22, rand(1.6, 2.4), "rgba(255,255,255,.55)", true);
    ring.drag = 0;
    this.parts.push(ring);
  }

  _applyDashReflect(hit) {
    const p = this.player;
    const nx = hit?.nx || 0, ny = hit?.ny || 0;
    const keep = clamp(Number(this.cfg?.skills?.dash?.bounceRetain) || 0.86, 0, 1);
    const baseSpeed = Math.max(Math.hypot(p.vx, p.vy), Number(this.cfg?.skills?.dash?.speed) || 0);
    const dot = p.vx * nx + p.vy * ny;
    let rx = p.vx - 2 * dot * nx;
    let ry = p.vy - 2 * dot * ny;

    const n = norm2(rx, ry);
    let dirX = n.x, dirY = n.y;
    if (n.len <= 1e-5) {
      const fallback = norm2((nx !== 0 || ny !== 0) ? -nx : p.dashVX, (nx !== 0 || ny !== 0) ? -ny : p.dashVY);
      dirX = fallback.x; dirY = fallback.y;
    }

    const speed = baseSpeed * keep;
    p.vx = dirX * speed;
    p.vy = dirY * speed;
    p.dashVX = dirX;
    p.dashVY = dirY;
    p.dashBounces = (p.dashBounces | 0) + 1;
    p.dashImpactFlash = Math.max(p.dashImpactFlash, 0.16);

    const push = (hit?.penetration || 0) + 0.6;
    p.x += (nx || 0) * push;
    p.y += (ny || 0) * push;

    const pad = p.r + 2;
    p.x = clamp(p.x, pad, this.W - pad);
    p.y = clamp(p.y, pad, this.H - pad);

    this.lastDashReflect = {
      t: this.timeAlive,
      x: (hit?.contactX != null) ? hit.contactX : p.x,
      y: (hit?.contactY != null) ? hit.contactY : p.y,
      count: p.dashBounces,
      serial: (this.lastDashReflect?.serial || 0) + 1
    };

    this._dashBounceSfx(speed);
    this._spawnDashReflectFx(
      (hit?.contactX != null) ? hit.contactX : p.x,
      (hit?.contactY != null) ? hit.contactY : p.y,
      nx, ny,
      speed / Math.max(1, Number(this.cfg?.skills?.dash?.speed) || 1)
    );
  }

  _useSkill(name) {
    if (!this.cfg.skills[name]) return;
    if (this.cds[name] > 0) return;

    const p = this.player;

    if (name === "dash") {
      const d = this.cfg.skills.dash;
      const dur = clamp(Number(d.duration) || 0, 0, 1.2);

      // dash direction = current move input or last direction
      const mv = this.input.getMove();
      const n = norm2(mv.dx, mv.dy);
      const dx = (n.len > 0) ? n.x : p.lastX;
      const dy = (n.len > 0) ? n.y : p.lastY;
      const nn = norm2(dx, dy);

      p.dashVX = (nn.len > 0) ? nn.x : 0;
      p.dashVY = (nn.len > 0) ? nn.y : -1;
      p.dashT = dur;
      p.dashBounces = 0;
      p.dashImpactFlash = 0;

      this.cds.dash = Math.max(0, Number(d.cooldown) || 0);

      for (let i = 0; i < 18; i++) {
        const a = rand(0, Math.PI * 2), sp = rand(40, 260);
        const vx = Math.cos(a) * sp - p.dashVX * 220;
        const vy = Math.sin(a) * sp - p.dashVY * 220;
        const prt = new Part(p.x, p.y, vx, vy, rand(0.18, 0.34), rand(1.0, 2.2), "rgba(255,255,255,.80)", true);
        prt.drag = 9.5;
        this.parts.push(prt);
      }
    }

    if (name === "phase") {
      const ph = this.cfg.skills.phase;
      const dur = clamp(Number(ph.duration) || 0, 0, 2.0);
      p.invT = Math.max(p.invT, dur);
      this.cds.phase = Math.max(0, Number(ph.cooldown) || 0);
      this.floats.push(new FloatText("PHASE", p.x, p.y - p.r * 1.6, "rgba(160,220,255,.95)"));
    }

    if (name === "teleport") {
      const t = this.cfg.skills.teleport;

      const ed = clamp(Number(t.effectDuration) || 0.35, 0.1, 1.2);
      const burst = Math.floor(clamp(Number(t.burstParticles) || 0, 0, 240));

      const cur = (this.input && this.input.cursor) ? this.input.cursor : this.cursor;
      if (!cur || !cur.has) return;

      const pad = p.r + 2;
      const ox = p.x, oy = p.y;

      // --- KEY FIX: map cursor -> world space ---
      const cw = this.canvas?.width || this.W;
      const ch = this.canvas?.height || this.H;

      const sx = (cw > 0) ? (this.W / cw) : 1;
      const sy = (ch > 0) ? (this.H / ch) : 1;

      const tx = cur.x * sx;
      const ty = cur.y * sy;

      const nx = clamp(tx, pad, this.W - pad);
      const ny = clamp(ty, pad, this.H - pad);
      // --- END FIX ---

      for (let i = 0; i < burst; i++) {
        const a0 = rand(0, Math.PI * 2), sp0 = rand(80, 420);
        const p0 = new Part(
          ox, oy,
          Math.cos(a0) * sp0, Math.sin(a0) * sp0,
          rand(0.22, 0.50), rand(1.0, 2.2),
          "rgba(210,170,255,.92)", true
        );
        p0.drag = 7.5;
        this.parts.push(p0);

        const a1 = rand(0, Math.PI * 2), sp1 = rand(80, 420);
        const p1 = new Part(
          nx, ny,
          Math.cos(a1) * sp1, Math.sin(a1) * sp1,
          rand(0.22, 0.55), rand(1.0, 2.4),
          "rgba(255,255,255,.82)", true
        );
        p1.drag = 7.0;
        this.parts.push(p1);
      }

      p.x = nx; p.y = ny;
      p.vx *= 0.25; p.vy *= 0.25;

      this.cds.teleport = Math.max(0, Number(t.cooldown) || 0);
      this.floats.push(new FloatText("TELEPORT", p.x, p.y - p.r * 1.7, "rgba(230,200,255,.95)"));

      for (let i = 0; i < 26; i++) {
        const a = rand(0, Math.PI * 2), sp = rand(40, 160);
        const prt = new Part(
          nx, ny,
          Math.cos(a) * sp, Math.sin(a) * sp,
          ed, rand(0.9, 1.7),
          "rgba(255,255,255,.45)", true
        );
        prt.drag = 10;
        this.parts.push(prt);
      }
    }

    if (name === "slowField") {
      const s = this.cfg.skills.slowField;

      const dur = clamp(Number(s.duration) || 0, 0, 8.0);
      const rad = clamp(Number(s.radius) || 0, 40, 900);
      const fac = clamp(Number(s.slowFactor) || 0.6, 0.10, 1.0);

      this.slowField = { x: p.x, y: p.y, r: rad, fac, t: dur, tm: dur };
      this.cds.slowField = Math.max(0, Number(s.cooldown) || 0);
      this.floats.push(new FloatText("SLOW FIELD", p.x, p.y - p.r * 1.8, "rgba(120,210,255,.95)"));
    }
  }

  _updatePlayer(dt) {
    const p = this.player;

    if (p.invT > 0) p.invT = Math.max(0, p.invT - dt);
    if (p.dashT > 0) p.dashT = Math.max(0, p.dashT - dt);
    if (p.dashImpactFlash > 0) p.dashImpactFlash = Math.max(0, p.dashImpactFlash - dt);

    const mv = this.input.getMove();
    const n = norm2(mv.dx, mv.dy);
    if (n.len > 0) { p.lastX = n.x; p.lastY = n.y; }

    if (p.dashT > 0) {
      const dashSpeed = Math.max(0, Number(this.cfg.skills.dash.speed) || 0);
      p.vx = p.dashVX * dashSpeed;
      p.vy = p.dashVY * dashSpeed;
    } else {
      const maxS = Number(this.cfg.player.maxSpeed) || 0;
      const accel = Number(this.cfg.player.accel) || 0;
      const fr = Number(this.cfg.player.friction) || 0;

      const tvx = n.x * maxS, tvy = n.y * maxS;
      p.vx = approach(p.vx, tvx, accel * dt);
      p.vy = approach(p.vy, tvy, accel * dt);

      if (n.len === 0) {
        const damp = Math.exp(-fr * dt);
        p.vx *= damp; p.vy *= damp;
      }
    }

    const pad = p.r + 2;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    let wallBounce = null;
    if (p.dashT > 0 && p.invT <= 0 && p.dashBounces < this._dashBounceMax()) {
      if (p.x < pad) wallBounce = { nx: 1, ny: 0, contactX: pad, contactY: p.y, penetration: pad - p.x };
      else if (p.x > this.W - pad) wallBounce = { nx: -1, ny: 0, contactX: this.W - pad, contactY: p.y, penetration: p.x - (this.W - pad) };
      else if (p.y < pad) wallBounce = { nx: 0, ny: 1, contactX: p.x, contactY: pad, penetration: pad - p.y };
      else if (p.y > this.H - pad) wallBounce = { nx: 0, ny: -1, contactX: p.x, contactY: this.H - pad, penetration: p.y - (this.H - pad) };
    }

    p.x = clamp(p.x, pad, this.W - pad);
    p.y = clamp(p.y, pad, this.H - pad);

    if (wallBounce) this._applyDashReflect(wallBounce);
  }

  _trailStyle(id) {
    const pick = (arr, rnd) => arr[Math.min(arr.length - 1, Math.floor(rnd(0, arr.length)))];
    const paletteColor = (palette) => ({ rand: r }) => pick(palette, r);
    const sweepColor = ({ base = 0, spread = 180, sat = 100, light = 70, alpha = 0.85 }) => ({ hue, i }) => {
      const h = (base + (hue * 0.4 + i * 9) % spread) % 360;
      return hsla(h, sat, light, alpha);
    };

    const styles = {
      classic: { rate: 55, life: [0.18, 0.32], size: [0.8, 2.0], speed: [25, 120], drag: 11.5, add: true, color: () => "rgba(140,220,255,.62)" },
      rainbow: { rate: 95, life: [0.18, 0.34], size: [7, 10], speed: [35, 170], drag: 10.5, add: true, color: ({ hue, i }) => hsla((hue + i * 11) % 360, 100, 70, 0.85), hueRate: 240 },
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

    return styles[id] || styles.classic;
  }

  _emitTrail(dt) {
    const id = this.getTrailId();
    const st = this._trailStyle(id);

    this.trailHue = (this.trailHue + dt * (st.hueRate || 220)) % 360;
    this.trailAcc += dt * st.rate;

    const n = this.trailAcc | 0;
    this.trailAcc -= n;

    const p = this.player;

    const v = norm2(p.vx, p.vy);
    const backX = (v.len > 12) ? -v.x : -p.lastX;
    const backY = (v.len > 12) ? -v.y : -p.lastY;
    const bx = p.x + backX * p.r * 0.95;
    const by = p.y + backY * p.r * 0.95;

    for (let i = 0; i < n; i++) {
      const jitter = rand(0, Math.PI * 2);
      const jx = Math.cos(jitter) * rand(0, p.r * 0.35);
      const jy = Math.sin(jitter) * rand(0, p.r * 0.35);

      const sp = rand(st.speed[0], st.speed[1]);
      const a = rand(0, Math.PI * 2);
      const vx = backX * sp + Math.cos(a) * sp * 0.55;
      const vy = backY * sp + Math.sin(a) * sp * 0.55;

      const life = rand(st.life[0], st.life[1]);
      const size = rand(st.size[0], st.size[1]);

      const color = st.color ? st.color({ i, hue: this.trailHue, rand }) : "rgba(140,220,255,.62)";

      const prt = new Part(bx + jx, by + jy, vx, vy, life, size, color, st.add);
      prt.drag = st.drag;
      this.parts.push(prt);
    }
  }

  update(dt) {
    // MENU can have subtle background drift; OVER freezes everything.
    if (this.state === STATE.OVER) return;

    // background drift
    for (const p of this.bgDots) {
      p.y += p.s * dt;
      if (p.y > this.H + 10) {
        p.y = -10;
        p.x = Math.random() * this.W; // visuals only -> not seeded
      }
    }

    if (this.state !== STATE.PLAY) return;

    this.timeAlive += dt;
    this._tickCooldowns(dt);

    if (this.comboBreakFlash > 0) this.comboBreakFlash = Math.max(0, this.comboBreakFlash - dt);
    if (this.perfectT > 0) this.perfectT = Math.max(0, this.perfectT - dt);

    if (this.slowField) {
      this.slowField.t = Math.max(0, this.slowField.t - dt);
      if (this.slowField.t <= 0) this.slowField = null;
    }

    const prevPlayerX = this.player.x;
    const prevPlayerY = this.player.y;

    this._updatePlayer(dt);
    this._emitTrail(dt);

    // combo sparkles
    const sparkleAt = Number(this.cfg.ui.comboBar.sparkleAt) || 9999;
    if (this.combo >= sparkleAt) {
      const rate = Math.max(0, Number(this.cfg.ui.comboBar.sparkleRate) || 0);
      this.comboSparkAcc += dt * rate;
      const n = this.comboSparkAcc | 0;
      this.comboSparkAcc -= n;

      const ui = this._skillUI();
      for (let i = 0; i < n; i++) {
        const px = rand(ui.barX, ui.barX + ui.barW);
        const py = rand(ui.barY - 8, ui.barY + ui.barH + 8);
        const a = rand(0, Math.PI * 2), sp = rand(20, 90);
        const prt = new Part(px, py, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.18, 0.35), rand(0.9, 1.7), "rgba(255,255,255,.7)", true);
        prt.drag = 10.5;
        this.parts.push(prt);
      }
    } else {
      this.comboSparkAcc = 0;
    }

    // spawn pipes
    this.pipeT -= dt;
    while (this.pipeT <= 0) {
      this.pipeT += this._spawnInterval();

      const d = this._difficulty01();
      const r = rand(0, 1);
      const wall = this.cfg.pipes.patternWeights.wall;
      const aimed = this.cfg.pipes.patternWeights.aimed;
      const wallChance = lerp(wall[0], wall[1], d);
      const aimedChance = lerp(aimed[0], aimed[1], d);

      if (r < wallChance) this._spawnWall({ side: (rand(0, 4)) | 0, gap: this._gapSize(), speed: this._pipeSpeed() * 0.95 });
      else if (r < wallChance + aimedChance) this._spawnSinglePipe({ side: (rand(0, 4)) | 0, aimAtPlayer: true, speed: this._pipeSpeed() });
      else this._spawnSinglePipe({ side: (rand(0, 4)) | 0, aimAtPlayer: false, speed: this._pipeSpeed() });
    }

    // special patterns
    this.specialT -= dt;
    if (this.specialT <= 0) {
      const r = rand(0, 1);
      if (r < 0.48) this._spawnBurst();
      else if (r < 0.78) this._spawnCrossfire();
      else this._spawnWall({ side: (rand(0, 4)) | 0, gap: this._gapSize(), speed: this._pipeSpeed() * 1.05 });

      const d = this._difficulty01();
      const sp = this.cfg.pipes.special;
      this.specialT = lerp(sp.startCadence, sp.endCadence, d) + rand(sp.jitterMin, sp.jitterMax);
    }

    // spawn orbs
    const o = this.cfg.catalysts.orbs;
    if (o.enabled) {
      this.orbT -= dt;
      if (this.orbT <= 0) {
        this._spawnOrb();
        const a = Math.min(o.intervalMin, o.intervalMax), b = Math.max(o.intervalMin, o.intervalMax);
        this.orbT = rand(a, b);
      }
    }

    // update gates + PERFECT
    for (const g of this.gates) g.update(dt, this.W, this.H);
    if (this.cfg.scoring.perfect.enabled) {
      const bonus = Math.max(0, Number(this.cfg.scoring.perfect.bonus) || 0);
      const wS = clamp(Number(this.cfg.scoring.perfect.windowScale) || 0.075, 0, 1);

      for (const g of this.gates) {
        if (g.cleared) continue;
        const pAxis = (g.axis === "x") ? this.player.x : this.player.y;
        if (g.crossed(pAxis)) {
          g.cleared = true;
          const perpPrev = (g.axis === "x") ? prevPlayerY : prevPlayerX;
          const perpCurr = (g.axis === "x") ? this.player.y : this.player.x;
          const denom = g.pos - g.prev;
          const alpha = denom === 0 ? 0 : clamp((pAxis - g.prev) / denom, 0, 1);
          const perp = lerp(perpPrev, perpCurr, alpha);
          const dist = Math.abs(perp - g.gapCenter);
          const thresh = Math.max(3, g.gapHalf * wS) * 1.10; // NEW: 5% leniency
          if (dist <= thresh) {
            this._perfectNiceSfx();
            const streak = (this.perfectCombo | 0) + 1;
            const pts = bonus * streak;
            this.perfectCombo = streak;
            if (g.gapId && this._gapMeta) {
              const meta = this._gapMeta.get(g.gapId);
              if (meta) meta.perfected = true;
            }
            this.score += pts;
            const fd = clamp(Number(this.cfg.scoring.perfect.flashDuration) || 0.55, 0.15, 2.0);
            this.perfectT = fd; this.perfectMax = fd;
            this.floats.push(new FloatText(`+${pts}`, this.player.x, this.player.y - this.player.r * 2.0, "rgba(255,255,255,.95)"));

            for (let k = 0; k < 28; k++) {
              const a = rand(0, Math.PI * 2), sp = rand(60, 320);
              const prt = new Part(this.player.x, this.player.y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.20, 0.45), rand(1.0, 2.2), "rgba(255,255,255,.85)", true);
              prt.drag = 8.5;
              this.parts.push(prt);
            }
          }
        }
      }
    }

    // update pipes
    for (const p of this.pipes) {
      let mul = 1;
      if (this.slowField) {
        const dx = p.cx() - this.slowField.x, dy = p.cy() - this.slowField.y;
        if ((dx * dx + dy * dy) <= this.slowField.r * this.slowField.r) mul = this.slowField.fac;
      }
      p.update(dt, mul, this.W, this.H);
    }

    // orbs + despawn breaks combo
    let expired = false;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      this.orbs[i].update(dt, this.W, this.H);
      if (this.orbs[i].dead()) { this.orbs.splice(i, 1); expired = true; }
    }
    if (expired) {
      const ui = this._skillUI();
      this._breakCombo(ui.barX + ui.barW * 0.5, ui.barY - 10);
    }

    // orb pickup
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const ob = this.orbs[i];
      if (circleCircle(this.player.x, this.player.y, this.player.r, ob.x, ob.y, ob.r)) {
        this.orbs.splice(i, 1);

        const maxC = Math.max(1, Number(this.cfg.scoring.orbComboMax) || 30);
        this.combo = Math.min(maxC, this.combo + 1);

        // NEW: play boop AFTER combo increments (so pitch rises with combo)
        this._orbPickupSfx();

        const pts = this._orbPoints(this.combo);
        this.score += pts;

        const col = (this.combo >= (Number(this.cfg.ui.comboBar.glowAt) || 9999))
          ? "rgba(255,255,255,.98)"
          : "rgba(120,210,255,.95)";
        this.floats.push(new FloatText(`+${pts}`, ob.x, ob.y, col));

        for (let k = 0; k < 18; k++) {
          const a = rand(0, Math.PI * 2), sp = rand(40, 240);
          const prt = new Part(ob.x, ob.y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.18, 0.38), rand(1.0, 2.0), "rgba(255,255,255,.7)", true);
          prt.drag = 10;
          this.parts.push(prt);
        }
      }
    }

    // collision (phase = invuln)
    if (this.player.invT <= 0) {
      const bounceCap = this._dashBounceMax();
      for (const p of this.pipes) {
        const hit = circleRectInfo(this.player.x, this.player.y, this.player.r, p.x, p.y, p.w, p.h);
        if (!hit) continue;

        if (this.player.dashT > 0) {
          if (this.player.dashBounces < bounceCap) {
            this._applyDashReflect(hit);
            // Only process one reflection per frame to avoid ping-pong chaos.
            break;
          } else {
            this.state = STATE.OVER; // exceeded reflect cap -> normal collision
            this.onGameOver(this.score | 0);
            return;
          }
        } else {
          this.state = STATE.OVER; // freeze
          this.onGameOver(this.score | 0);
          return;
        }
      }
    }

    // pipe removal + base score
    const m = this._margin();
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      if (p.off(this.W, this.H, m)) {
        if (!p.scored) {
          p.scored = true;
          this.score += Math.max(0, Number(this.cfg.scoring.pipeDodge) || 0);
        }
        this._onGapPipeRemoved(p);
        this.pipes.splice(i, 1);
      }
    }
    for (let i = this.gates.length - 1; i >= 0; i--) if (this.gates[i].off(this.W, this.H, m)) this.gates.splice(i, 1);

    // fx update/cleanup
    for (const p of this.parts) p.update(dt);
    for (const t of this.floats) t.update(dt);
    for (let i = this.parts.length - 1; i >= 0; i--) if (this.parts[i].life <= 0) this.parts.splice(i, 1);
    for (let i = this.floats.length - 1; i >= 0; i--) if (this.floats[i].life <= 0) this.floats.splice(i, 1);

    // caps
    if (this.pipes.length > 280) this.pipes.splice(0, this.pipes.length - 280);
    if (this.parts.length > 1100) this.parts.splice(0, this.parts.length - 1100);
    if (this.floats.length > 80) this.floats.splice(0, this.floats.length - 80);
  }

  render() {
    const ctx = this.ctx;

    // background (cached offscreen)
    if (this.bgDirty) this._refreshBackgroundLayer();
    if (this.bgCanvas) {
      ctx.drawImage(this.bgCanvas, 0, 0, this.W, this.H);
    } else {
      ctx.fillStyle = "#07101a";
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // world
    const pc = this._pipeColor();
    const visPad = Math.max(32, Math.min(this.W, this.H) * 0.12);
    for (const p of this.pipes) {
      if (!this._isVisibleRect(p.x, p.y, p.w, p.h, visPad)) continue;
      this._drawPipe(p, pc);
    }

    for (const o of this.orbs) {
      if (!this._isVisibleRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2, 28)) continue;
      this._drawOrb(o);
    }

    for (const p of this.parts) {
      const s = Math.max(1, p.size || 1);
      if (!this._isVisibleRect(p.x - s * 2, p.y - s * 2, s * 4, s * 4, visPad)) continue;
      p.draw(ctx);
    }

    for (const t of this.floats) {
      const fh = Math.max(8, t.size || 18);
      if (!this._isVisibleRect(t.x - fh, t.y - fh, fh * 2, fh * 2, visPad)) continue;
      t.draw(ctx);
    }

    this._drawPlayer();

    if (this.state === STATE.PLAY) {
      this._drawHUD();
      this._drawPerfectFlash();
    }
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    const rr = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  _drawPipe(p, base) {
    const ctx = this.ctx;
    const edge = shade(base, 0.72), hi = shade(base, 1.12);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;

    const g = (p.w >= p.h)
      ? ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y)
      : ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, rgb(edge, 0.95));
    g.addColorStop(0.45, rgb(base, 0.92));
    g.addColorStop(1, rgb(hi, 0.95));

    ctx.fillStyle = g;
    ctx.fillRect(p.x, p.y, p.w, p.h);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x + 0.75, p.y + 0.75, p.w - 1.5, p.h - 1.5);

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "rgba(255,255,255,.9)";
    const step = 10;
    if (p.w >= p.h) {
      for (let sx = p.x + 6; sx < p.x + p.w; sx += step) ctx.fillRect(sx, p.y + 2, 2, p.h - 4);
    } else {
      for (let sy = p.y + 6; sy < p.y + p.h; sy += step) ctx.fillRect(p.x + 2, sy, p.w - 4, 2);
    }

    ctx.restore();
  }

_drawOrb(o) {
  const ctx = this.ctx;

  // t: 1 = just spawned, 0 = expiring
  const t = clamp(o.life / o.max, 0, 1);

  // p: 0 = just spawned, 1 = expiring
  const p = 1 - t;

  // Optional curve for a more "extreme" ramp (hits yellow sooner, then red harder)
  const pr = Math.pow(p, 0.75);

  const pulse = 0.88 + 0.12 * Math.sin(o.ph);
  const r = o.r * pulse;

  // Green -> Yellow -> Red (piecewise lerp)
  const cGreen = hexToRgb("#57FF6A");
  const cYellow = hexToRgb("#FFE45C");
  const cRed = hexToRgb("#FF4B4B");

  let core;
  if (pr < 0.5) {
    core = lerpC(cGreen, cYellow, pr / 0.5);
  } else {
    core = lerpC(cYellow, cRed, (pr - 0.5) / 0.5);
  }

  ctx.save();

  // Glow matches the core color
  ctx.shadowColor = `rgba(${core.r|0},${core.g|0},${core.b|0},.50)`;
  ctx.shadowBlur = 18;

  // Outer shell
  ctx.fillStyle = "rgba(255,255,255,.88)";
  ctx.beginPath();
  ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner core (traffic-light color)
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = rgb(core, 0.85);
  ctx.beginPath();
  ctx.arc(o.x, o.y, r * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring fades as life runs out
  ctx.globalAlpha = 0.38 * t;
  ctx.strokeStyle = "rgba(255,255,255,.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(o.x, o.y, r * 1.35, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}




  _drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = (p.invT > 0) ? "rgba(160,220,255,.35)" : "rgba(120,210,255,.22)";

    if (this.playerImg && this.playerImg.naturalWidth > 0) {
      ctx.drawImage(this.playerImg, p.x - p.w * 0.5, p.y - p.h * 0.5, p.w, p.h);
    } else {
      ctx.fillStyle = "rgba(120,210,255,.92)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, p.r * 0.18), 0, Math.PI * 2); ctx.fill();
    }

    if (p.dashImpactFlash > 0) {
      const a = clamp(p.dashImpactFlash / 0.16, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = "rgba(255,200,120,.90)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Phase i-frame indicator: ring (no blink)
    if (p.invT > 0) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "rgba(160,220,255,.95)";
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.28, 0, Math.PI * 2); ctx.stroke();

      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.06, -Math.PI * 0.15, Math.PI * 0.15); ctx.stroke();
    }

    ctx.restore();
  }

  _drawPerfectFlash() {
    if (this.perfectT <= 0) return;
    const ctx = this.ctx;

    const t = clamp(this.perfectT / Math.max(1e-3, this.perfectMax), 0, 1);
    const a = (1 - t) * (1 - t);

    ctx.save();
    ctx.globalAlpha = clamp(a * 0.95, 0, 1);
    ctx.font = "900 56px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0,0,0,.60)";
    ctx.shadowBlur = 22; ctx.shadowOffsetY = 4;
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.fillText("PERFECT", this.W * 0.5, 18);

    ctx.globalAlpha = clamp(a * 0.25, 0, 1);
    ctx.fillStyle = "rgba(120,210,255,.95)";
    ctx.fillText("PERFECT", this.W * 0.5 + 2, 18);
    ctx.restore();
  }

  _skillUI() {
    const base = Math.min(this.W, this.H);
    const size = clamp(base * 0.070, 46, 64);
    const gap = Math.round(size * 0.14);
    const pad = 16;
    const x0 = pad;
    const y0 = this.H - pad - size;
    const totalW = 4 * size + 3 * gap;
    const barH = 10;
    const barX = x0;
    const barY = y0 - 16 - barH;
    return { x0, y0, size, gap, totalW, barX, barY, barW: totalW, barH };
  }

  _drawHUD() {
    const ctx = this.ctx;

    // score (top-left)
    ctx.save();
    ctx.font = "900 18px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 2;
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.fillText(`Score: ${this.score | 0}`, 14, 14);

    // intensity (top-right)
    ctx.textAlign = "right";
    ctx.globalAlpha = 0.70;
    ctx.font = "800 13px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
    ctx.fillText(`Intensity: ${Math.round(this._difficulty01() * 100)}%`, this.W - 14, 14);
    ctx.restore();

    // slow field ring
    if (this.slowField) {
      const t = clamp(this.slowField.t / Math.max(1e-3, this.slowField.tm), 0, 1);
      const a = 0.22 + 0.18 * (1 - t);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = "rgba(120,210,255,.75)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.slowField.x, this.slowField.y, this.slowField.r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = a * 0.35;
      ctx.strokeStyle = "rgba(255,255,255,.60)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(this.slowField.x, this.slowField.y, this.slowField.r * 0.75, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    this._drawSkillBar();
  }

  _drawSkillIcon(skill, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    if (skill === "dash") {
      ctx.moveTo(-r * 0.8, -r * 0.25);
      ctx.lineTo(r * 0.35, -r * 0.25);
      ctx.lineTo(r * 0.35, -r * 0.6);
      ctx.lineTo(r * 0.9, 0);
      ctx.lineTo(r * 0.35, r * 0.6);
      ctx.lineTo(r * 0.35, r * 0.25);
      ctx.lineTo(-r * 0.8, r * 0.25);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (skill === "phase") {
      ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.stroke();
    } else if (skill === "teleport") {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 1.2, 0); ctx.lineTo(-r * 0.6, 0);
      ctx.moveTo(r * 0.6, 0); ctx.lineTo(r * 1.2, 0);
      ctx.moveTo(0, -r * 1.2); ctx.lineTo(0, -r * 0.6);
      ctx.moveTo(0, r * 0.6); ctx.lineTo(0, r * 1.2);
      ctx.stroke();
    } else if (skill === "slowField") {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.55, -Math.PI * 0.25, Math.PI * 0.25); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.55, Math.PI * 0.75, Math.PI * 1.25); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    }
  }

  _drawSkillBar() {
    const ctx = this.ctx;
    const ui = this._skillUI();

    const comboMax = Math.max(1, Number(this.cfg.scoring.orbComboMax) || 30);
    const fill = clamp(this.combo / comboMax, 0, 1);

    // combo bar
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.50)";
    ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;

    ctx.fillStyle = "rgba(255,255,255,.08)";
    this._roundRect(ui.barX, ui.barY, ui.barW, ui.barH, 999); ctx.fill();

    const fillW = ui.barW * fill;
    if (fillW > 0.5) {
      const glowAt = Number(this.cfg.ui.comboBar.glowAt) || 9999;
      const sparkleAt = Number(this.cfg.ui.comboBar.sparkleAt) || 9999;
      ctx.shadowBlur = (this.combo >= glowAt) ? 18 : 8;
      ctx.shadowColor = (this.combo >= glowAt) ? "rgba(255,255,255,.25)" : "rgba(120,210,255,.20)";
      const g = ctx.createLinearGradient(ui.barX, ui.barY, ui.barX + ui.barW, ui.barY);
      g.addColorStop(0, "rgba(120,210,255,.70)");
      g.addColorStop(0.6, (this.combo >= sparkleAt) ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.45)");
      g.addColorStop(1, "rgba(255,255,255,.22)");
      ctx.fillStyle = g;
      this._roundRect(ui.barX, ui.barY, fillW, ui.barH, 999); ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.85;
    ctx.font = "800 12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(255,255,255,.70)";
    ctx.fillText(`COMBO ${this.combo}`, ui.barX, ui.barY - 2);

    if (this.comboBreakFlash > 0) {
      const a = clamp(this.comboBreakFlash / 0.35, 0, 1);
      ctx.globalAlpha = a * 0.55;
      ctx.strokeStyle = "rgba(255,90,90,.85)";
      ctx.lineWidth = 2;
      this._roundRect(ui.barX - 2, ui.barY - 2, ui.barW + 4, ui.barH + 4, 999); ctx.stroke();
    }

    // skill slots (fixed order per ACTIONS)
    const binds = this.getBinds();
    for (let i = 0; i < ACTIONS.length; i++) {
      const action = ACTIONS[i].id;
      const x = ui.x0 + i * (ui.size + ui.gap);
      const y = ui.y0;

      ctx.globalAlpha = 1;
      ctx.shadowColor = "rgba(0,0,0,.50)";
      ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
      ctx.fillStyle = "rgba(255,255,255,.08)";
      this._roundRect(x, y, ui.size, ui.size, 12); ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,.16)";
      ctx.lineWidth = 1.5;
      this._roundRect(x, y, ui.size, ui.size, 12); ctx.stroke();

      // key label (humanized bind)
      const keyLabel = humanizeBind(binds[action]);
      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.font = "900 11px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(keyLabel, x + 8, y + 7);

      const rem = Math.max(0, this.cds[action] || 0);
      const max = Math.max(0, Number(this.cfg.skills[action]?.cooldown) || 0);
      const ready = rem <= 1e-6;

      // icon
      ctx.save();
      ctx.translate(x + ui.size * 0.55, y + ui.size * 0.60);
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = ready ? "rgba(255,255,255,.78)" : "rgba(255,255,255,.35)";
      ctx.fillStyle = ready ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.06)";
      this._drawSkillIcon(action, ui.size * 0.22);
      ctx.restore();

      // cooldown overlay
      if (max > 1e-6 && rem > 0) {
        const frac = clamp(rem / max, 0, 1);
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = "rgba(0,0,0,.55)";
        this._roundRect(x, y + ui.size * (1 - frac), ui.size, ui.size * frac, 12); ctx.fill();

        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.font = "900 12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(rem.toFixed(1), x + ui.size * 0.5, y + ui.size * 0.58);
      }
    }

    ctx.restore();
  }
}
