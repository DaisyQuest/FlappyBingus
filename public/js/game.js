// =====================
// FILE: public/js/game.js
// =====================
import {
  clamp, lerp, rand, norm2, approach,
  circleRect, circleRectInfo, circleCircle,
  hexToRgb, lerpC, rgb, shade, hsla
} from "./util.js";
import { ACTIONS, humanizeBind } from "./keybinds.js";
import { resolveGapPerfect, resolvePerfectGapAlignment } from "./perfectGaps.js";

// NEW: orb pickup SFX (pitch shifts by combo)
import {
  sfxOrbBoop,
  sfxPerfectNice,
  sfxDashStart,
  sfxDashBounce,
  sfxDashDestroy,
  sfxSlowField,
  sfxSlowExplosion,
  sfxDashBreak,
  sfxTeleport,
  sfxPhase,
  sfxExplosion,
  sfxGameOver
} from "./audio.js";
import { DEFAULT_SKILL_SETTINGS, normalizeSkillSettings } from "./settings.js";

const BASE_DPR = Math.max(0.25, window.devicePixelRatio || 1);

const STATE = Object.freeze({ MENU: 0, PLAY: 1, OVER: 2 });

import { Pipe, Gate, Orb, Part, FloatText } from "./entities.js";
import { spawnBurst, spawnCrossfire, spawnOrb, spawnSinglePipe, spawnWall } from "./spawn.js";
import { dashBounceMax, orbPoints, tickCooldowns } from "./mechanics.js";
import { buildScorePopupStyle } from "./uiStyles.js";
import { computePipeColor } from "./pipeColors.js";
import {
  DEFAULT_PIPE_TEXTURE_ID,
  DEFAULT_PIPE_TEXTURE_MODE,
  drawPipeTexture,
  normalizePipeTextureMode
} from "./pipeTextures.js";
import { trailStyleFor } from "./trailStyles.js";

const TRAIL_LIFE_SCALE = 1.45;
const TRAIL_DISTANCE_SCALE = 1.18;
const TRAIL_JITTER_SCALE = 0.55;
const TRAIL_AURA_RATE = 0.42;
const COMBO_WINDOW_BASE = 10;
const COMBO_WINDOW_MIN = 4;
const COMBO_WINDOW_DECAY = 0.35;

export { Pipe, Gate, Orb, Part, FloatText };

export class Game {
  constructor({ canvas, ctx, config, playerImg, input, getTrailId, getBinds, getPipeTexture, onGameOver }) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.cfg = config;
    this.playerImg = playerImg;
    this.input = input;
    this.getTrailId = getTrailId || (() => "classic");
    this.getPipeTexture = getPipeTexture || (() => ({ id: DEFAULT_PIPE_TEXTURE_ID, mode: DEFAULT_PIPE_TEXTURE_MODE }));
    this.getBinds = getBinds || (() => ({}));
    this.onGameOver = onGameOver || config?.onGameOver || (() => {});

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
      dashImpactFlash: 0,
      dashMode: null,
      dashDestroyed: false
    };

    this.pipes = [];
    this.gates = [];
    this.orbs = [];
    this.parts = [];
    this.floats = [];

    this.score = 0;
    this.timeAlive = 0;
    this.bustercoinsEarned = 0;

    this.pipeT = 0;
    this.specialT = 1.6;
    this.orbT = 1.0;

    this.combo = 0;
    this.comboBreakFlash = 0;
    this.comboSparkAcc = 0;
    this.comboTimer = 0;

    this.perfectT = 0;
    this.perfectMax = 0;
    this.perfectCombo = 0;

    this._gapMeta = new Map(); // gapId -> { perfected, broken, pipesRemaining }
    this._nextGapId = 1;

    this.lastDashReflect = null;
    this.slowField = null; // {x,y,r,fac,t,tm}
    this.slowExplosion = null; // {x,y,r,t,tm}
    this.lastPipeShatter = null;
    this.lastSlowBlast = null;

    this.cds = { dash: 0, phase: 0, teleport: 0, slowField: 0 };
    this.skillSettings = normalizeSkillSettings(DEFAULT_SKILL_SETTINGS);

    // trail emission
    this.trailAcc = 0;
    this.trailHue = 0;
    this.trailGlintAcc = 0;
    this.trailSparkAcc = 0;
    this.trailAuraAcc = 0;

    // NEW: allow main.js to disable SFX during replay/export if desired
    this.audioEnabled = true;

    this._resetRunStats();
  }

  // NEW: toggle game SFX without touching music
  setAudioEnabled(on) {
    this.audioEnabled = !!on;
  }

  setSkillSettings(settings) {
    this.skillSettings = normalizeSkillSettings(settings || DEFAULT_SKILL_SETTINGS);
  }

  setPlayerImage(playerImg) {
    this.playerImg = playerImg || {};
    if (this.cfg?.player) this._computePlayerSize();
  }

  getRunStats() {
    const toInt = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return 0;
      return Math.floor(n);
    };
    const skills = {};
    const rawSkills = this.runStats?.skillUsage || {};
    for (const id of ["dash", "phase", "teleport", "slowField"]) {
      skills[id] = toInt(rawSkills[id]);
    }
    const bucket = (b = {}) => ({
      points: toInt(b.points),
      count: toInt(b.count)
    });
    const breakdown = this.runStats?.scoreBreakdown || {};
    return {
      orbsCollected: toInt(this.runStats?.orbsCollected),
      abilitiesUsed: toInt(this.runStats?.abilitiesUsed),
      perfects: toInt(this.runStats?.perfects),
      pipesDodged: toInt(this.runStats?.pipesDodged),
      maxOrbCombo: toInt(this.runStats?.maxOrbCombo),
      maxPerfectCombo: toInt(this.runStats?.maxPerfectCombo),
      brokenPipes: toInt(this.runStats?.brokenPipes),
      maxBrokenPipesInExplosion: toInt(this.runStats?.maxBrokenPipesInExplosion),
      totalScore: toInt(this.score),
      skillUsage: skills,
      scoreBreakdown: {
        orbs: bucket(breakdown.orbs),
        perfects: bucket(breakdown.perfects),
        pipes: bucket(breakdown.pipes),
        other: bucket(breakdown.other)
      }
    };
  }

  _resetRunStats() {
    this.runStats = {
      orbsCollected: 0,
      abilitiesUsed: 0,
      perfects: 0,
      pipesDodged: 0,
      maxOrbCombo: 0,
      maxPerfectCombo: 0,
      brokenPipes: 0,
      maxBrokenPipesInExplosion: 0,
      skillUsage: {
        dash: 0,
        phase: 0,
        teleport: 0,
        slowField: 0
      },
      scoreBreakdown: {
        orbs: { points: 0, count: 0 },
        perfects: { points: 0, count: 0 },
        pipes: { points: 0, count: 0 },
        other: { points: 0, count: 0 }
      }
    };
  }

  _scoreBucket(id = "other") {
    if (!this.runStats?.scoreBreakdown) this._resetRunStats();
    const bucket = this.runStats.scoreBreakdown[id];
    return bucket || this.runStats.scoreBreakdown.other;
  }

  _addScore(points, { bucket = "other", count = 0 } = {}) {
    const safePoints = Math.max(0, Math.floor(Number(points) || 0));
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    const target = this._scoreBucket(bucket);
    target.points = (target.points || 0) + safePoints;
    if (safeCount > 0) target.count = (target.count || 0) + safeCount;
    this.score = (this.score || 0) + safePoints;
  }

  _recordOrbScore(points) {
    this.runStats.orbsCollected = (this.runStats.orbsCollected || 0) + 1;
    this._addScore(points, { bucket: "orbs", count: 1 });
  }

  _recordPerfectScore(points) {
    this.runStats.perfects = (this.runStats.perfects || 0) + 1;
    this._addScore(points, { bucket: "perfects", count: 1 });
  }

  _recordPipeScore(points) {
    this.runStats.pipesDodged = (this.runStats.pipesDodged || 0) + 1;
    this._addScore(points, { bucket: "pipes", count: 1 });
  }

  _recordOrbCombo(combo = 0) {
    const safe = Math.max(0, Math.floor(Number(combo) || 0));
    this.runStats.maxOrbCombo = Math.max(this.runStats.maxOrbCombo || 0, safe);
  }

  _recordPerfectCombo(combo = 0) {
    const safe = Math.max(0, Math.floor(Number(combo) || 0));
    this.runStats.maxPerfectCombo = Math.max(this.runStats.maxPerfectCombo || 0, safe);
  }

  _recordBrokenPipe(count = 1) {
    const safe = Math.max(0, Math.floor(Number(count) || 0));
    if (safe <= 0) return;
    this.runStats.brokenPipes = (this.runStats.brokenPipes || 0) + safe;
  }

  _recordBrokenExplosion(count = 0) {
    const safe = Math.max(0, Math.floor(Number(count) || 0));
    if (safe <= 0) return;
    this.runStats.maxBrokenPipesInExplosion = Math.max(this.runStats.maxBrokenPipesInExplosion || 0, safe);
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

  _dashStartSfx() {
    if (!this.audioEnabled) return;
    sfxDashStart();
  }

  _dashBreakSfx() {
    if (!this.audioEnabled) return;
    sfxDashBreak();
  }

  _phaseSfx() {
    if (!this.audioEnabled) return;
    sfxPhase();
  }

  _teleportSfx() {
    if (!this.audioEnabled) return;
    sfxTeleport();
  }

  _explosionSfx() {
    if (!this.audioEnabled) return;
    sfxExplosion({ allowFallback: false });
  }

  _gameOverSfx() {
    if (!this.audioEnabled) return;
    sfxGameOver();
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
    this._resetRunStats();

    if (clearScore) this.score = 0;
    this.timeAlive = 0;
    this.bustercoinsEarned = 0;

    this.pipeT = 0;
    this.specialT = 1.6;
    this.orbT = rand(this.cfg.catalysts.orbs.intervalMin, this.cfg.catalysts.orbs.intervalMax);

    this.combo = 0;
    this.comboBreakFlash = 0;
    this.comboSparkAcc = 0;
    this.comboTimer = 0;

    this.perfectT = 0;
    this.perfectMax = 0;
    this.perfectCombo = 0;
    this.perfectAuraIntensity = 0;
    this.perfectAuraMode = null;

    this._gapMeta.clear();
    this._nextGapId = 1;

    this.slowField = null;
    this.slowExplosion = null;
    this.cds = { dash: 0, phase: 0, teleport: 0, slowField: 0 };
    this.player.dashMode = null;
    this.player.dashDestroyed = false;
    this.lastPipeShatter = null;
    this.lastSlowBlast = null;

    this.trailAcc = 0;
    this.trailHue = 0;
    this.trailGlintAcc = 0;
    this.trailSparkAcc = 0;
    this.trailAuraAcc = 0;
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
    const iw = this.playerImg?.naturalWidth || this.playerImg?.width || 1;
    const ih = this.playerImg?.naturalHeight || this.playerImg?.height || 1;
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

  _scorePopupAnchor() {
    const p = this.player;
    const offsetX = Math.max(24, p.r * 1.35);
    const offsetY = Math.max(20, p.r * 1.1);
    const pad = 14;
    const x = clamp(p.x + offsetX, pad, this.W - pad);
    const y = clamp(p.y - offsetY, pad, this.H - pad);
    return { x, y };
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
    return computePipeColor(this._difficulty01(), this.cfg.pipes.colors);
  }

  _pipeSpawnBudget() {
    const area = this.W * this.H;
    if (!Number.isFinite(area) || area <= 0) return 0;
    if (area < 5000) return 4;
    if (area < 20000) return 12;
    return Number.POSITIVE_INFINITY;
  }

  _maybeSpawnWithBudget(fn) {
    const cap = this._pipeSpawnBudget();
    if (this.pipes.length >= cap) return false;
    const before = this.pipes.length;
    fn();
    if (this.pipes.length > cap) this.pipes.splice(0, this.pipes.length - cap);
    return this.pipes.length > before;
  }

  _spawnSinglePipe(opts = {}) {
    this._maybeSpawnWithBudget(() => spawnSinglePipe(this, opts));
  }

  _spawnWall(opts = {}) {
    this._maybeSpawnWithBudget(() => spawnWall(this, opts));
  }

  _spawnBurst() {
    this._maybeSpawnWithBudget(() => spawnBurst(this));
  }

  _spawnCrossfire() {
    this._maybeSpawnWithBudget(() => spawnCrossfire(this));
  }

  _spawnSpecialWall() {
    const markerSize = Math.max(12, this._thickness() * 0.6, 200 - this._margin());
    this.pipes.push(new Pipe(-200, -200, markerSize, markerSize, 0, 0));
    this._spawnWall({ side: (rand(0, 4)) | 0, gap: this._gapSize(), speed: this._pipeSpeed() * 1.05 });
  }

  _spawnOrb() {
    spawnOrb(this);
  }

  _orbPoints(comboNow) {
    return orbPoints(this.cfg, comboNow);
  }

  getComboWindow(comboCount = this.combo) {
    const safeCombo = Math.max(0, Math.floor(Number(comboCount) || 0));
    const decay = Math.max(0, safeCombo - 1) * COMBO_WINDOW_DECAY;
    return Math.max(COMBO_WINDOW_MIN, COMBO_WINDOW_BASE - decay);
  }

  _breakCombo(x, y) {
    if (this.combo > 0) this.floats.push(new FloatText("COMBO BROKE", x, y, "rgba(255,90,90,.95)"));
    this.combo = 0;
    this.comboBreakFlash = 0.35;
    this.comboTimer = 0;
  }

  _resetPerfectCombo() {
    this.perfectCombo = 0;
  }

  _onGapPipeRemoved(pipe) {
    return this._onGapPipeRemovedWithFlags(pipe);
  }

  _onGapPipeRemovedWithFlags(pipe, { broken = false } = {}) {
    if (!this._gapMeta) return;
    const gid = pipe?.gapId;
    if (!gid) return;
    const meta = this._gapMeta.get(gid);
    if (!meta) return;

    if (broken) meta.broken = true;
    meta.pipesRemaining = Math.max(0, (meta.pipesRemaining ?? 0) - 1);
    if (meta.broken) return;
    if (meta.pipesRemaining > 0) return;
    this._gapMeta.delete(gid);
    if (!meta.perfected) this._resetPerfectCombo();
  }

  _onGapGateRemoved(gate) {
    if (!this._gapMeta) return;
    const gid = gate?.gapId;
    if (!gid) return;
    const meta = this._gapMeta.get(gid);
    if (!meta) return;
    this._gapMeta.delete(gid);
    if (!meta.perfected && !meta.broken) this._resetPerfectCombo();
  }

  _tickCooldowns(dt) {
    tickCooldowns(this.cds, dt);
  }

  _activeDashConfig() {
    if (this.skillSettings?.dashBehavior === "destroy") return this.cfg.skills.dashDestroy || this.cfg.skills.dash;
    return this.cfg.skills.dash;
  }

  _activeSlowConfig() {
    if (this.skillSettings?.slowFieldBehavior === "explosion") return this.cfg.skills.slowExplosion || this.cfg.skills.slowField;
    return this.cfg.skills.slowField;
  }

  _activeTeleportConfig() {
    const base = this.cfg.skills.teleport;
    if (!base) return null;
    if (this.skillSettings?.teleportBehavior === "explode") {
      const baseCooldown = Math.max(0, Number(base.cooldown) || 0);
      return { ...base, cooldown: baseCooldown * 2, behavior: "explode" };
    }
    return base;
  }

  _activeInvulnConfig() {
    const base = this.cfg.skills.phase;
    if (!base) return null;
    if (this.skillSettings?.invulnBehavior === "long") {
      const cd = Math.max(0, Number(base.cooldown) || 0) * 2;
      const dur = Math.max(0, Number(base.duration) || 0) * 2;
      return { ...base, cooldown: cd, duration: dur };
    }
    return base;
  }

  _dashBounceMax() {
    return dashBounceMax(this._activeDashConfig());
  }

  _dashBounceSfx(speed = 0) {
    if (!this.audioEnabled) return;
    sfxDashBounce(speed);
  }

  _dashDestroySfx() {
    if (!this.audioEnabled) return;
    sfxDashDestroy();
  }

  _slowFieldSfx() {
    if (!this.audioEnabled) return;
    sfxSlowField();
  }

  _slowExplosionSfx() {
    if (!this.audioEnabled) return;
    sfxSlowExplosion();
    this._explosionSfx();
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
    const dashCfg = this._activeDashConfig();
    const keep = clamp(Number(dashCfg?.bounceRetain) || 0.86, 0, 1);
    const baseSpeed = Math.max(Math.hypot(p.vx, p.vy), Number(dashCfg?.speed) || 0);
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
      speed / Math.max(1, Number(dashCfg?.speed) || 1)
    );
  }

  _shatterPipe(pipe, { hit, particles = 30, cause = "dashDestroy" } = {}) {
    if (!pipe) return false;
    const idx = this.pipes.indexOf(pipe);
    if (idx >= 0) this.pipes.splice(idx, 1);
    if (idx < 0) return false;
    this._onGapPipeRemovedWithFlags(pipe, { broken: true });
    this._recordBrokenPipe(1);

    const cx = (hit?.contactX != null) ? hit.contactX : (pipe.cx ? pipe.cx() : pipe.x + pipe.w * 0.5);
    const cy = (hit?.contactY != null) ? hit.contactY : (pipe.cy ? pipe.cy() : pipe.y + pipe.h * 0.5);
    const nx = hit?.nx || 0, ny = hit?.ny || 0;

    for (let i = 0; i < particles; i++) {
      const spread = rand(-0.7, 0.7);
      const baseDir = Math.atan2(ny || 0, nx || 0);
      const dir = (nx || ny) ? baseDir + spread : rand(0, Math.PI * 2);
      const sp = rand(160, 420);
      const prt = new Part(
        cx, cy,
        Math.cos(dir) * sp,
        Math.sin(dir) * sp,
        rand(0.20, 0.42),
        rand(1.2, 2.8),
        cause === "slowExplosion" ? "rgba(255,230,180,.85)" : "rgba(255,210,160,.90)",
        true
      );
      prt.drag = 10.5;
      prt.twinkle = true;
      this.parts.push(prt);
    }

    this.lastPipeShatter = { t: this.timeAlive, x: cx, y: cy, cause };
    return true;
  }

  _applyDashDestroy(hit, dashCfg) {
    const p = this.player;
    this._dashDestroySfx();
    this._shatterPipe(hit?.pipe, { hit, particles: Math.max(10, Number(dashCfg?.shatterParticles) || 30), cause: "dashDestroy" });
    this._dashImpactSlowdown(hit);
    p.dashDestroyed = true;
    p.dashMode = null;
    p.dashT = 0;
    p.dashBounces = 0;
    p.dashImpactFlash = Math.max(p.dashImpactFlash, 0.22);
    const iFrames = Math.max(0, Number(dashCfg?.impactIFrames) || 0);
    if (iFrames > 0) p.invT = Math.max(p.invT, iFrames);
    return "destroyed";
  }

  _dashImpactSlowdown(hit) {
    const p = this.player;
    let nx = hit?.nx || 0, ny = hit?.ny || 0;
    const pipeVX = hit?.pipe?.vx || 0;
    const pipeVY = hit?.pipe?.vy || 0;

    if (Math.abs(nx) < 1e-5 && Math.abs(ny) < 1e-5) {
      const fallback = norm2(p.dashVX || p.vx, p.dashVY || p.vy);
      nx = fallback.x; ny = fallback.y;
    }

    const relVx = p.vx - pipeVX;
    const relVy = p.vy - pipeVY;
    const relNormal = relVx * nx + relVy * ny;
    const tangentialX = relVx - relNormal * nx;
    const tangentialY = relVy - relNormal * ny;

    const playerSpeed = Math.max(1e-3, Math.hypot(p.vx, p.vy));
    const closing = Math.max(0, -relNormal);
    const impactScale = clamp(closing / playerSpeed, 0, 1);
    const damp = clamp(0.12 + impactScale * 0.45, 0, 0.65);

    const newRelNormal = relNormal * (1 - damp);
    const newVx = pipeVX + tangentialX + newRelNormal * nx;
    const newVy = pipeVY + tangentialY + newRelNormal * ny;

    p.vx = newVx;
    p.vy = newVy;
    const dir = norm2(newVx, newVy);
    if (dir.len > 1e-5) {
      p.dashVX = dir.x;
      p.dashVY = dir.y;
    }
  }

  _pipeOverlapsCircle(pipe, { x, y, r }) {
    if (!pipe || r <= 0) return false;
    return circleRect(x, y, r, pipe.x, pipe.y, pipe.w, pipe.h);
  }

  _destroyPipesInRadius({ x, y, r, cause = "slowExplosion" }) {
    let brokenCount = 0;
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i];
      if (this._pipeOverlapsCircle(pipe, { x, y, r })) {
        if (this._shatterPipe(pipe, { particles: 24, cause })) brokenCount += 1;
      }
    }
    this._recordBrokenExplosion(brokenCount);
  }

  _handlePipeCollision(hit, bounceCap, dashCfg) {
    if (this.player.dashT > 0) {
      if (this.player.dashMode === "destroy" && !this.player.dashDestroyed) {
        return this._applyDashDestroy(hit, dashCfg);
      }
      if (this.player.dashBounces < bounceCap) {
        this._applyDashReflect(hit);
        return "reflected";
      }
      this._gameOverSfx();
      this.state = STATE.OVER; // exceeded reflect cap -> normal collision
      this.onGameOver(this.score | 0);
      return "over";
    }

    this._gameOverSfx();
    this.state = STATE.OVER; // freeze
    this.onGameOver(this.score | 0);
    return "over";
  }

  _cooldownColor(rem, max) {
    const safeMax = Math.max(max, 1e-6);
    const pct = clamp(rem / safeMax, 0, 1);
    if (pct > 0.65) return "rgba(120,20,20,.95)";
    if (pct < 0.25) return "rgba(110,200,110,.95)";
    return "rgba(255,215,120,.95)";
  }

  _showCooldownFloat(name, rem, max) {
    const p = this.player;
    const color = this._cooldownColor(rem, max);
    const readyPct = clamp(max > 1e-6 ? 1 - (rem / max) : 0, 0, 1);
    const wobble = 1.5 + readyPct * 3.5;
    const txt = `${name.toUpperCase()} ${rem.toFixed(1)}s`;
    this.floats.push(new FloatText(txt, p.x, p.y - p.r * 1.4, color, {
      wobble,
      size: 16,
      strokeWidth: 2.4,
      glowColor: color
    }));
  }

  showAchievementPopup(def) {
    if (!def) return null;
    const anchor = typeof this._scorePopupAnchor === "function"
      ? this._scorePopupAnchor()
      : { x: this.W * 0.5, y: this.H * 0.35 };
    const title = def.title || "Achievement unlocked";
    const color = "rgba(175,225,255,.96)";
    const popup = new FloatText(`🏆 ${title}`, anchor.x, anchor.y, color, {
      wobble: 6,
      size: 32,
      strokeWidth: 4.6,
      glowColor: "rgba(130,210,255,.95)",
      palette: ["#dff4ff", "#b8e4ff", "#ffe6ff"],
      shimmer: 0.4,
      sparkle: true
    });
    popup.life = popup.max = 1.4;
    this.floats.push(popup);
    return popup;
  }

  _useSkill(name) {
    if (!this.cfg.skills[name]) return;
    const rem = Math.max(0, Number(this.cds[name]) || 0);
    const max = Math.max(0, Number(this.cfg.skills[name]?.cooldown) || rem);
    if (rem > 0) {
      this._showCooldownFloat(name, rem, max);
      return;
    }

    const p = this.player;
    let used = false;

    if (name === "dash") {
      const cfg = this._activeDashConfig();
      if (!cfg) return;
      if (this.skillSettings?.dashBehavior === "destroy") this._useDashDestroy(cfg);
      else this._useDashRicochet(cfg);
      used = true;
    }

    if (name === "phase") {
      const ph = this._activeInvulnConfig();
      if (!ph) return;
      const dur = clamp(Number(ph.duration) || 0, 0, 2.0);
      p.invT = Math.max(p.invT, dur);
      this.cds.phase = Math.max(0, Number(ph.cooldown) || 0);
      this._phaseSfx();
      this.floats.push(new FloatText("PHASE", p.x, p.y - p.r * 1.6, "rgba(160,220,255,.95)"));
      used = true;
    }

    if (name === "teleport") {
      const t = this._activeTeleportConfig();
      if (!t) return;

      const ed = clamp(Number(t.effectDuration) || 0.35, 0.1, 1.2);
      const burst = Math.floor(clamp(Number(t.burstParticles) || 0, 0, 240));

      const cur = (this.input && this.input.cursor) ? this.input.cursor : this.cursor;
      if (!cur || !cur.has) return;

      const pad = p.r + 2;
      const ox = p.x, oy = p.y;

      const tx = cur.x;
      const ty = cur.y;
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
      this._teleportSfx();
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

      if (this.skillSettings?.teleportBehavior === "explode") {
        this._destroyPipesInRadius({ x: nx, y: ny, r: Math.max(p.r, 1), cause: "teleportExplode" });
      }
      used = true;
    }

    if (name === "slowField") {
      const s = this._activeSlowConfig();
      if (!s) return;
      if (this.skillSettings?.slowFieldBehavior === "explosion") this._useSlowExplosion(s);
      else this._useSlowField(s);
      used = true;
    }

    if (used) {
      this.runStats.abilitiesUsed = (this.runStats.abilitiesUsed || 0) + 1;
      if (this.runStats.skillUsage && Object.prototype.hasOwnProperty.call(this.runStats.skillUsage, name)) {
        this.runStats.skillUsage[name] = (this.runStats.skillUsage[name] || 0) + 1;
      }
    }
  }

  _startDashMotion(d) {
    const p = this.player;
    const dur = clamp(Number(d.duration) || 0, 0, 1.2);
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
    p.dashDestroyed = false;

    return { dur };
  }

  _useDashRicochet(d) {
    this._startDashMotion(d);
    const p = this.player;
    p.dashMode = "ricochet";
    this.cds.dash = Math.max(0, Number(d.cooldown) || 0);
    this._dashStartSfx();

    for (let i = 0; i < 18; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(40, 260);
      const vx = Math.cos(a) * sp - p.dashVX * 220;
      const vy = Math.sin(a) * sp - p.dashVY * 220;
      const prt = new Part(p.x, p.y, vx, vy, rand(0.18, 0.34), rand(1.0, 2.2), "rgba(255,255,255,.80)", true);
      prt.drag = 9.5;
      this.parts.push(prt);
    }
  }

  _useDashDestroy(d) {
    this._startDashMotion(d);
    const p = this.player;
    p.dashMode = "destroy";
    this.cds.dash = Math.max(0, Number(d.cooldown) || 0);
    this._dashStartSfx();

    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(60, 320);
      const vx = Math.cos(a) * sp - p.dashVX * 180;
      const vy = Math.sin(a) * sp - p.dashVY * 180;
      const prt = new Part(p.x, p.y, vx, vy, rand(0.16, 0.36), rand(1.1, 2.4), "rgba(255,220,180,.85)", true);
      prt.drag = 11;
      this.parts.push(prt);
    }
  }

  _useSlowField(s) {
    const p = this.player;
    const dur = clamp(Number(s.duration) || 0, 0, 8.0);
    const rad = clamp(Number(s.radius) || 0, 40, 900);
    const fac = clamp(Number(s.slowFactor) || 0.6, 0.10, 1.0);

    this.slowField = { x: p.x, y: p.y, r: rad, fac, t: dur, tm: dur };
    this.slowExplosion = null;
    this.cds.slowField = Math.max(0, Number(s.cooldown) || 0);
    this._slowFieldSfx();
    this.floats.push(new FloatText("SLOW FIELD", p.x, p.y - p.r * 1.8, "rgba(120,210,255,.95)"));
  }

  _useSlowExplosion(s) {
    const p = this.player;
    const dur = clamp(Number(s.duration) || 0.12, 0, 1.2);
    const rad = clamp(Number(s.radius) || 0, 20, 900);
    const blastParticles = Math.max(0, Number(s.blastParticles) || 0);

    this.slowField = null;
    this.slowExplosion = { x: p.x, y: p.y, r: rad, t: dur, tm: dur };
    this.cds.slowField = Math.max(0, Number(s.cooldown) || 0);
    this._slowExplosionSfx();
    this.floats.push(new FloatText("SLOW BURST", p.x, p.y - p.r * 1.8, "rgba(255,210,150,.95)"));

    const shards = [];
    for (let i = 0; i < blastParticles; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(160, 440);
      const prt = new Part(
        p.x, p.y,
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        rand(0.22, 0.45),
        rand(1.1, 2.6),
        "rgba(255,230,180,.85)",
        true
      );
      prt.drag = 10.8;
      prt.twinkle = true;
      this.parts.push(prt);
      shards.push(prt);
    }

    this._destroyPipesInRadius({ x: p.x, y: p.y, r: rad, cause: "slowExplosion" });
    this.lastSlowBlast = { t: this.timeAlive, x: p.x, y: p.y, shards };
  }

  _updatePlayer(dt) {
    const p = this.player;

    if (p.invT > 0) p.invT = Math.max(0, p.invT - dt);
    if (p.dashT > 0) p.dashT = Math.max(0, p.dashT - dt);
    if (p.dashT <= 0 && p.dashMode) p.dashMode = null;
    if (p.dashImpactFlash > 0) p.dashImpactFlash = Math.max(0, p.dashImpactFlash - dt);

    const mv = this.input.getMove();
    const n = norm2(mv.dx, mv.dy);
    if (n.len > 0) { p.lastX = n.x; p.lastY = n.y; }

    if (p.dashT > 0) {
      const dashCfg = this._activeDashConfig();
      const dashSpeed = Math.max(0, Number(dashCfg?.speed) || 0);
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
    let wallContact = null;
    const bounceCap = this._dashBounceMax();
    if (p.dashT > 0 && p.invT <= 0) {
      const candidate =
        (p.x < pad) ? { nx: 1, ny: 0, contactX: pad, contactY: p.y, penetration: pad - p.x }
          : (p.x > this.W - pad) ? { nx: -1, ny: 0, contactX: this.W - pad, contactY: p.y, penetration: p.x - (this.W - pad) }
            : (p.y < pad) ? { nx: 0, ny: 1, contactX: p.x, contactY: pad, penetration: pad - p.y }
              : (p.y > this.H - pad) ? { nx: 0, ny: -1, contactX: p.x, contactY: this.H - pad, penetration: p.y - (this.H - pad) }
                : null;
      if (candidate) {
        wallContact = candidate;
        if (p.dashBounces < bounceCap) wallBounce = candidate;
      }
    }

    p.x = clamp(p.x, pad, this.W - pad);
    p.y = clamp(p.y, pad, this.H - pad);

    if (wallBounce) this._applyDashReflect(wallBounce);
    else if (wallContact && Number.isFinite(bounceCap)) {
      this._dashBreakSfx();
      p.dashMode = null;
      p.dashT = 0;
      p.dashBounces = bounceCap;
      p.vx = 0;
      p.vy = 0;
    }
  }

  _trailStyle(id) {
    return trailStyleFor(id);
  }

  _emitTrail(dt) {
    const id = this.getTrailId();
    const st = this._trailStyle(id);
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

    this.trailHue = (this.trailHue + dt * (st.hueRate || 220)) % 360;
    this.trailAcc += dt * st.rate;
    this.trailGlintAcc += dt * (glint.rate || st.rate * 0.55);
    this.trailSparkAcc += dt * (sparkle.rate || 34);
    this.trailAuraAcc += dt * auraRate;

    const n = this.trailAcc | 0;
    this.trailAcc -= n;
    const g = this.trailGlintAcc | 0;
    this.trailGlintAcc -= g;
    const s = this.trailSparkAcc | 0;
    this.trailSparkAcc -= s;
    const a = this.trailAuraAcc | 0;
    this.trailAuraAcc -= a;

    const p = this.player;

    const v = norm2(p.vx, p.vy);
    const backX = (v.len > 12) ? -v.x : -p.lastX;
    const backY = (v.len > 12) ? -v.y : -p.lastY;
    const bx = p.x + backX * p.r * 0.95;
    const by = p.y + backY * p.r * 0.95;
    const backA = Math.atan2(backY, backX);

    for (let i = 0; i < n; i++) {
      const jitter = rand(0, Math.PI * 2);
      const jx = Math.cos(jitter) * rand(0, p.r * jitterScale);
      const jy = Math.sin(jitter) * rand(0, p.r * jitterScale);

      const sp = rand(st.speed[0], st.speed[1]) * distanceScale;
      const a = rand(0, Math.PI * 2);
      const vx = backX * sp + Math.cos(a) * sp * 0.55;
      const vy = backY * sp + Math.sin(a) * sp * 0.55;

      const life = rand(st.life[0], st.life[1]) * baseLifeScale;
      const size = rand(st.size[0], st.size[1]) * 1.08;

      const color = st.color ? st.color({ i, hue: this.trailHue, rand }) : "rgba(140,220,255,.62)";

      const prt = new Part(bx + jx, by + jy, vx, vy, life, size, color, st.add);
      prt.drag = st.drag;
      this.parts.push(prt);
    }

    for (let i = 0; i < a; i++) {
      const ang = rand(0, Math.PI * 2);
      const wobble = rand(-0.35, 0.35);
      const orbit = rand(aura.orbit?.[0] ?? p.r * 0.65, aura.orbit?.[1] ?? p.r * 1.65);
      const px = p.x + Math.cos(ang) * orbit;
      const py = p.y + Math.sin(ang) * orbit;

      const sp = rand(aura.speed?.[0] ?? st.speed[0] * 0.65, aura.speed?.[1] ?? st.speed[1] * 1.1) * auraDistanceScale;
      const vx = Math.cos(ang + wobble) * sp;
      const vy = Math.sin(ang + wobble) * sp;

      const life = rand(aura.life?.[0] ?? st.life[0] * 0.9, aura.life?.[1] ?? st.life[1] * 1.15) * auraLifeScale;
      const size = rand(aura.size?.[0] ?? st.size[0] * 0.9, aura.size?.[1] ?? st.size[1] * 1.25) * auraSizeScale;
      const color = aura.color
        ? aura.color({ i, hue: this.trailHue, rand })
        : (st.color ? st.color({ i, hue: this.trailHue, rand }) : "rgba(140,220,255,.62)");

      const prt = new Part(px, py, vx, vy, life, size, color, aura.add ?? st.add);
      prt.drag = aura.drag ?? st.drag ?? 10.5;
      prt.twinkle = aura.twinkle ?? true;
      this.parts.push(prt);
    }

    for (let i = 0; i < g; i++) {
      const spin = rand(-0.9, 0.9);
      const off = rand(p.r * 0.12, p.r * 0.58);
      const px = bx + Math.cos(backA + Math.PI + spin) * off;
      const py = by + Math.sin(backA + Math.PI + spin) * off;

      const sp = rand(glint.speed?.[0] || 55, glint.speed?.[1] || 155) * distanceScale;
      const vx = backX * sp * 0.42 + Math.cos(backA + Math.PI + spin) * sp * 0.58;
      const vy = backY * sp * 0.42 + Math.sin(backA + Math.PI + spin) * sp * 0.58;

      const life = rand(glint.life?.[0] || 0.18, glint.life?.[1] || 0.32) * baseLifeScale;
      const size = rand(glint.size?.[0] || 1.2, glint.size?.[1] || 3.0);

      const color = glint.color ? glint.color({ i, hue: this.trailHue, rand }) : "rgba(255,255,255,.9)";

      const prt = new Part(px, py, vx, vy, life, size, color, glint.add !== false);
      prt.drag = glint.drag ?? st.drag ?? 11.2;
      prt.twinkle = true;
      this.parts.push(prt);
    }

    for (let i = 0; i < s; i++) {
      const ang = rand(0, Math.PI * 2);
      const orbit = rand(p.r * 0.45, p.r * 1.05);
      const px = p.x + Math.cos(ang) * orbit;
      const py = p.y + Math.sin(ang) * orbit;

      const sp = rand(sparkle.speed?.[0] || 20, sparkle.speed?.[1] || 55) * distanceScale;
      const wobble = rand(-0.55, 0.55);
      const vx = Math.cos(ang + wobble) * sp * 0.65;
      const vy = Math.sin(ang + wobble) * sp * 0.65;

      const life = rand(sparkle.life?.[0] || 0.28, sparkle.life?.[1] || 0.46) * baseLifeScale;
      const size = rand(sparkle.size?.[0] || 1.0, sparkle.size?.[1] || 2.4) * 1.1;
      const color = sparkle.color ? sparkle.color({ i, hue: this.trailHue, rand }) : "rgba(255,255,255,.88)";

      const prt = new Part(px, py, vx, vy, life, size, color, sparkle.add !== false);
      prt.drag = sparkle.drag ?? 12.5;
      prt.twinkle = true;
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
    if (this.slowExplosion) {
      this.slowExplosion.t = Math.max(0, this.slowExplosion.t - dt);
      if (this.slowExplosion.t <= 0) this.slowExplosion = null;
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
      else this._spawnSpecialWall();

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
      const flashDuration = Number(this.cfg.scoring.perfect.flashDuration) || 0.55;
      const auraRangeScale = clamp(Number(this.cfg.scoring.perfect.auraRangeScale) || 0.6, 0.1, 2);
      const auraMinIntensity = clamp(Number(this.cfg.scoring.perfect.auraMinIntensity) || 0.05, 0, 1);
      const auraRange = Math.max(40, Math.min(this.W, this.H) * auraRangeScale);

      let auraIntensity = 0;
      let auraAligned = 0;

      for (const g of this.gates) {
        if (g.perfected) continue;
        const meta = g.gapId && this._gapMeta ? this._gapMeta.get(g.gapId) : null;
        if (meta?.broken) continue;

        const pAxis = (g.axis === "x") ? this.player.x : this.player.y;
        const perpPrev = (g.axis === "x") ? prevPlayerY : prevPlayerX;
        const perpCurr = (g.axis === "x") ? this.player.y : this.player.x;

        if (g.entered) {
          const alignment = resolvePerfectGapAlignment({
            gate: g,
            perpAxis: perpCurr,
            windowScale: wS
          });
          if (alignment.aligned) {
            const axisDistance = Math.abs(g.pos - pAxis);
            const intensity = clamp(1 - (axisDistance / Math.max(1, auraRange)), 0, 1);
            if (intensity > auraMinIntensity) {
              auraAligned += 1;
              auraIntensity = Math.max(auraIntensity, intensity);
            }
          }
        }

        const res = resolveGapPerfect({
          gate: g,
          game: this,
          playerAxis: pAxis,
          prevPerpAxis: perpPrev,
          currPerpAxis: perpCurr,
          bonus,
          flashDuration,
          windowScale: wS
        });

        if (res.awarded) {
          const pts = res.points || 0;
          const perfectStyle = buildScorePopupStyle({ combo: res.streak || this.perfectCombo, variant: "perfect" });
          const anchor = this._scorePopupAnchor();
          this.floats.push(new FloatText(`+${pts}`, anchor.x, anchor.y, perfectStyle.color, perfectStyle));

          for (let k = 0; k < 28; k++) {
            const a = rand(0, Math.PI * 2), sp = rand(60, 320);
            const prt = new Part(this.player.x, this.player.y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.20, 0.45), rand(1.0, 2.2), "rgba(255,255,255,.85)", true);
            prt.drag = 8.5;
            this.parts.push(prt);
          }
        }
      }

      this.perfectAuraIntensity = auraIntensity;
      this.perfectAuraMode = auraAligned >= 2 ? "rainbow" : auraAligned === 1 ? "gold" : null;
    } else {
      this.perfectAuraIntensity = 0;
      this.perfectAuraMode = null;
    }

    // update pipes
    for (const p of this.pipes) {
      let mul = 1;
      if (this.slowField && this._pipeOverlapsCircle(p, this.slowField)) mul = this.slowField.fac;
      p.update(dt, mul, this.W, this.H);
    }

    // orbs
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      this.orbs[i].update(dt, this.W, this.H);
      if (this.orbs[i].dead()) { this.orbs.splice(i, 1); }
    }

    // orb pickup
    let justPickedOrb = false;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const ob = this.orbs[i];
      if (circleCircle(this.player.x, this.player.y, this.player.r, ob.x, ob.y, ob.r)) {
        this.orbs.splice(i, 1);

        const maxC = Math.max(1, Number(this.cfg.scoring.orbComboMax) || 30);
        this.combo = Math.min(maxC, this.combo + 1);
        this._recordOrbCombo(this.combo);
        this.bustercoinsEarned = (this.bustercoinsEarned || 0) + 1;
        this.comboTimer = this.getComboWindow(this.combo);
        justPickedOrb = true;

        // NEW: play boop AFTER combo increments (so pitch rises with combo)
        this._orbPickupSfx();

        const pts = this._orbPoints(this.combo);
        this._recordOrbScore(pts);

        const popupStyle = buildScorePopupStyle({ combo: this.combo, variant: "orb" });
        const anchor = this._scorePopupAnchor();
        this.floats.push(new FloatText(`+${pts}`, anchor.x, anchor.y, popupStyle.color, popupStyle));

        for (let k = 0; k < 18; k++) {
          const a = rand(0, Math.PI * 2), sp = rand(40, 240);
          const prt = new Part(ob.x, ob.y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.18, 0.38), rand(1.0, 2.0), "rgba(255,255,255,.7)", true);
          prt.drag = 10;
          this.parts.push(prt);
        }
      }
    }

    if (this.combo > 0) {
      if (!justPickedOrb) {
        this.comboTimer = Math.max(0, this.comboTimer - dt);
        if (this.comboTimer <= 0) {
          this.comboTimer = 0;
          const ui = this._skillUI();
          this._breakCombo(ui.barX + ui.barW * 0.5, ui.barY - 10);
        }
      }
    } else {
      this.comboTimer = 0;
    }

    // collision (phase = invuln)
    if (this.player.invT <= 0) {
      const bounceCap = this._dashBounceMax();
      const dashCfg = this._activeDashConfig();
      for (const p of this.pipes) {
        const hit = circleRectInfo(this.player.x, this.player.y, this.player.r, p.x, p.y, p.w, p.h);
        if (!hit) continue;
        hit.pipe = p;

        if (this.player.dashT > 0) {
          const res = this._handlePipeCollision(hit, bounceCap, dashCfg);
          if (res === "reflected" || res === "destroyed") break; // Only process one interaction per frame to avoid ping-pong chaos.
          if (res === "over") return;
        } else if (this._handlePipeCollision(hit, bounceCap, dashCfg) === "over") {
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
          this._recordPipeScore(Math.max(0, Number(this.cfg.scoring.pipeDodge) || 0));
        }
        this._onGapPipeRemoved(p);
        this.pipes.splice(i, 1);
      }
    }
    for (let i = this.gates.length - 1; i >= 0; i--) {
      if (this.gates[i].off(this.W, this.H, m)) {
        const gate = this.gates[i];
        this._onGapGateRemoved(gate);
        this.gates.splice(i, 1);
      }
    }

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
    /* v8 ignore start -- rendering paths are visual-only */
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
    const selection = this.getPipeTexture ? this.getPipeTexture() : null;
    const textureId = typeof selection === "string"
      ? selection
      : (selection?.id || DEFAULT_PIPE_TEXTURE_ID);
    const mode = normalizePipeTextureMode(selection?.mode || DEFAULT_PIPE_TEXTURE_MODE);
    drawPipeTexture(this.ctx, p, base, { textureId, mode, time: this.timeAlive });
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

    const auraIntensity = clamp(this.perfectAuraIntensity || 0, 0, 1);
    const auraMode = this.perfectAuraMode;
    if (auraIntensity > 0 && auraMode) {
      const auraPulse = 0.08 * Math.sin(this.timeAlive * 12) + 0.04 * Math.sin(this.timeAlive * 22 + 1.4);
      const outer = p.r * (1.6 + auraIntensity * (1.0 + auraPulse));
      const inner = Math.max(p.r * 0.6, outer * 0.35);
      const wobble = auraIntensity * p.r * 0.08;
      const auraX = p.x + Math.sin(this.timeAlive * 18) * wobble;
      const auraY = p.y + Math.cos(this.timeAlive * 15) * wobble;
      ctx.save();
      ctx.globalAlpha = clamp(0.25 + auraIntensity * 0.65, 0, 1);
      ctx.globalCompositeOperation = "lighter";
      if (auraMode === "rainbow") {
        const grad = ctx.createRadialGradient(auraX, auraY, inner, auraX, auraY, outer);
        grad.addColorStop(0, "rgba(255,255,255,.95)");
        grad.addColorStop(0.25, "rgba(120,220,255,.9)");
        grad.addColorStop(0.45, "rgba(160,255,170,.9)");
        grad.addColorStop(0.65, "rgba(255,220,120,.9)");
        grad.addColorStop(0.85, "rgba(255,140,240,.9)");
        grad.addColorStop(1, "rgba(255,255,255,.0)");
        ctx.fillStyle = grad;
        ctx.shadowColor = "rgba(255,255,255,.65)";
        ctx.shadowBlur = 20 + auraIntensity * 18;
      } else {
        ctx.fillStyle = `rgba(255,215,140,${0.28 + auraIntensity * 0.6})`;
        ctx.shadowColor = "rgba(255,215,140,.75)";
        ctx.shadowBlur = 20 + auraIntensity * 16;
      }
      ctx.beginPath();
      ctx.arc(auraX, auraY, outer, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const iw = this.playerImg?.naturalWidth || this.playerImg?.width || 0;
    const ih = this.playerImg?.naturalHeight || this.playerImg?.height || 0;
    const ready = this.playerImg?.complete !== false;
    if (ready && iw > 0 && ih > 0) {
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

    // score (centered, near bottom)
    ctx.save();
    const scoreX = this.W * 0.5;
    const scoreY = this.H * 0.95;
    const bubbleSize = clamp(Math.min(this.W, this.H) * 0.18, 80, 190);

    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `900 ${bubbleSize}px "Baloo 2","Fredoka One",system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
    ctx.lineJoin = "round";

    const bubble = ctx.createRadialGradient(scoreX, scoreY, bubbleSize * 0.15, scoreX, scoreY, bubbleSize * 0.85);
    bubble.addColorStop(0, "rgba(255,255,255,.70)");
    bubble.addColorStop(1, "rgba(160,210,255,.30)");

    ctx.globalAlpha = 0.72;
    ctx.fillStyle = bubble;
    ctx.strokeStyle = "rgba(255,255,255,.32)";
    ctx.lineWidth = Math.max(4, bubbleSize * 0.07);
    ctx.strokeText(`${this.score | 0}`, scoreX, scoreY);
    ctx.fillText(`${this.score | 0}`, scoreX, scoreY);

    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2, bubbleSize * 0.04);
    ctx.strokeStyle = "rgba(120,210,255,.35)";
    ctx.strokeText(`${this.score | 0}`, scoreX, scoreY);

    this._drawBustercoinCounter(scoreX, scoreY, bubbleSize);
    
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
    } else if (this.slowExplosion) {
      const t = clamp(this.slowExplosion.t / Math.max(1e-3, this.slowExplosion.tm), 0, 1);
      const a = 0.35 + 0.25 * (1 - t);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = "rgba(255,210,160,.85)";
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(this.slowExplosion.x, this.slowExplosion.y, this.slowExplosion.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    this._drawSkillBar();
  }

  _drawBustercoinCounter(scoreX, scoreY, bubbleSize) {
    const ctx = this.ctx;
    const coins = Math.max(0, this.bustercoinsEarned | 0);
    const coinFont = clamp(Math.round(bubbleSize * 0.28), 12, 38);
    const label = `◎ ${coins}`;
    const coinX = scoreX + bubbleSize * 0.62;
    const coinY = scoreY - bubbleSize * 0.36;

    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${coinFont}px "Baloo 2","Fredoka One",system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.lineWidth = Math.max(1.5, coinFont * 0.09);
    ctx.strokeStyle = "rgba(150,105,30,.85)";
    ctx.fillStyle = "rgba(255,215,130,.95)";
    ctx.strokeText(label, coinX, coinY);
    ctx.fillText(label, coinX, coinY);
    ctx.restore();
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
  /* v8 ignore stop */
}
