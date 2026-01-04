// =====================
// FILE: public/js/surfGame.js
// =====================
import { clamp, getRandSource, rand, createSeededRand } from "./util.js";
import { Part } from "./entities.js";
import { trailStyleFor } from "./trailStyles.js";
import {
  createBackgroundLayer,
  drawBackgroundLayer,
  initBackgroundLayer,
  refreshBackgroundLayer,
  updateBackgroundDots
} from "./backgroundLayer.js";

const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 720;

const STATE = Object.freeze({ MENU: 0, PLAY: 1, OVER: 2 });

const TERRAIN = Object.freeze({
  minY: 120,
  maxY: 660,
  minLength: 200,
  maxLength: 320,
  downRise: [70, 190],
  upRise: [-140, -60],
  flatRise: [-8, 8],
  lookahead: WORLD_WIDTH * 2.2,
  cleanupBehind: WORLD_WIDTH * 1.4
});

const PHYSICS = Object.freeze({
  baseSpeed: 220,
  minSpeed: 140,
  gravity: 980,
  airDamping: 1.4,
  slopeStickTolerance: 10,
  landingQualityThreshold: 0.45,
  maxLandingSpeedBoost: 130,
  slopeBoostScale: 0.45
});

const SCORE = Object.freeze({
  airtimeRate: 12,
  bigAirMin: 40,
  bigAirScale: 0.18,
  chainBonus: 18,
  chainMultiplier: 0.12
});

function computeSlopeY(segment, x) {
  const dx = segment.x1 - segment.x0;
  if (dx === 0) return segment.y1;
  const t = (x - segment.x0) / dx;
  return segment.y0 + (segment.y1 - segment.y0) * t;
}

function computeSlopeTangent(segment) {
  const dx = segment.x1 - segment.x0;
  const dy = segment.y1 - segment.y0;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function landingQuality(velocity, tangent) {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed <= 0.001) return 0;
  return (velocity.x * tangent.x + velocity.y * tangent.y) / speed;
}

function isDownhill(segment) {
  return segment.y1 > segment.y0 + 1;
}

function randRange(rand01, a, b) {
  return a + (b - a) * rand01();
}

function createSegment({ x0, y0, type, rand01 }) {
  const length = randRange(rand01, TERRAIN.minLength, TERRAIN.maxLength);
  let rise = 0;
  if (type === "down") rise = randRange(rand01, TERRAIN.downRise[0], TERRAIN.downRise[1]);
  else if (type === "up") rise = randRange(rand01, TERRAIN.upRise[0], TERRAIN.upRise[1]);
  else rise = randRange(rand01, TERRAIN.flatRise[0], TERRAIN.flatRise[1]);

  let y1 = clamp(y0 + rise, TERRAIN.minY, TERRAIN.maxY);
  rise = y1 - y0;
  return {
    id: `${x0}-${y0}-${type}`,
    type,
    x0,
    y0,
    x1: x0 + length,
    y1
  };
}

export class SurfGame {
  constructor({
    canvas,
    ctx,
    playerImg,
    input,
    getTrailId,
    onGameOver,
    disableAutoTerrain = false
  } = {}) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.playerImg = playerImg;
    this.input = input;
    this.getTrailId = getTrailId || (() => "classic");
    this.onGameOver = onGameOver || (() => {});
    this.disableAutoTerrain = disableAutoTerrain;

    this.state = STATE.MENU;
    this.W = 1; this.H = 1; this.DPR = 1;

    this.background = createBackgroundLayer();
    this.backgroundRand = getRandSource();

    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      w: 48,
      h: 48,
      r: 18,
      grounded: false,
      ground: null
    };

    this.segments = [];
    this.terrainCursor = { x: 0, y: WORLD_HEIGHT * 0.55 };
    this.rand01 = getRandSource();

    this.trailParts = [];
    this.trailAcc = 0;

    this.score = 0;
    this.timeAlive = 0;
    this.airtime = 0;
    this.chain = 0;
    this.maxChain = 0;
    this.maxBigAir = 0;
    this.lastLandingY = null;
    this.peakY = null;

    this.scoreBreakdown = {
      airtime: { points: 0, seconds: 0 },
      bigAir: { points: 0, count: 0 },
      chain: { points: 0, count: 0 }
    };

    this.restartHold = 0;
    this.skillSettings = null;
  }

  setSkillSettings(settings) {
    this.skillSettings = settings || null;
  }

  setPlayerImage(playerImg) {
    this.playerImg = playerImg || {};
  }

  setStateMenu() {
    this.state = STATE.MENU;
  }

  startRun({ seed } = {}) {
    this.state = STATE.PLAY;
    this.score = 0;
    this.timeAlive = 0;
    this.airtime = 0;
    this.chain = 0;
    this.maxChain = 0;
    this.maxBigAir = 0;
    this.restartHold = 0;
    this.lastLandingY = null;
    this.peakY = null;
    this.scoreBreakdown = {
      airtime: { points: 0, seconds: 0 },
      bigAir: { points: 0, count: 0 },
      chain: { points: 0, count: 0 }
    };

    this.rand01 = seed ? createSeededRand(String(seed)) : getRandSource();

    this.player.x = WORLD_WIDTH * 0.25;
    this.player.y = WORLD_HEIGHT * 0.35;
    this.player.vx = PHYSICS.baseSpeed;
    this.player.vy = 0;
    this.player.grounded = false;
    this.player.ground = null;

    this.segments = [];
    this.terrainCursor = { x: 0, y: WORLD_HEIGHT * 0.55 };
    if (!this.disableAutoTerrain) {
      this._ensureTerrainAhead();
    }
  }

  endRun() {
    this.state = STATE.OVER;
    this.onGameOver(this.score);
  }

  resizeToWindow() {
    const rawDpr = Number(window.devicePixelRatio || 1);
    const dpr = Math.min(Number.isFinite(rawDpr) && rawDpr > 0 ? rawDpr : 1, 2);
    const viewportW = Number(window.visualViewport?.width ?? window.innerWidth);
    const viewportH = Number(window.visualViewport?.height ?? window.innerHeight);
    const cssW = Math.max(1, Math.round(Number.isFinite(viewportW) && viewportW > 0 ? viewportW : WORLD_WIDTH));
    const cssH = Math.max(1, Math.round(Number.isFinite(viewportH) && viewportH > 0 ? viewportH : WORLD_HEIGHT));
    const scale = Math.max(0.01, Math.min(cssW / WORLD_WIDTH, cssH / WORLD_HEIGHT));
    const drawW = WORLD_WIDTH * scale;
    const drawH = WORLD_HEIGHT * scale;
    const offsetX = (cssW - drawW) * 0.5;
    const offsetY = (cssH - drawH) * 0.5;

    if (this.canvas) {
      this.canvas.style.width = cssW + "px";
      this.canvas.style.height = cssH + "px";
      this.canvas.width = Math.floor(cssW * dpr);
      this.canvas.height = Math.floor(cssH * dpr);
      this.canvas._logicalW = WORLD_WIDTH;
      this.canvas._logicalH = WORLD_HEIGHT;
      this.canvas._view = {
        x: offsetX,
        y: offsetY,
        width: drawW,
        height: drawH
      };
    }

    if (this.ctx?.setTransform) {
      this.ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);
      this.ctx.imageSmoothingEnabled = true;
    }

    this.DPR = dpr * scale;
    this.W = WORLD_WIDTH;
    this.H = WORLD_HEIGHT;
    this._initBackground();
  }

  _initBackground() {
    initBackgroundLayer(this.background, {
      width: this.W,
      height: this.H,
      rand: this.backgroundRand
    });
    refreshBackgroundLayer(this.background, { width: this.W, height: this.H });
  }

  getRunStats() {
    const toInt = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return 0;
      return Math.floor(n);
    };
    return {
      mode: "surf",
      runTime: toInt(this.timeAlive),
      totalScore: toInt(this.score),
      maxChain: toInt(this.maxChain),
      maxBigAir: toInt(this.maxBigAir),
      scoreBreakdown: {
        airtime: { points: toInt(this.scoreBreakdown.airtime.points), seconds: toInt(this.scoreBreakdown.airtime.seconds) },
        bigAir: { points: toInt(this.scoreBreakdown.bigAir.points), count: toInt(this.scoreBreakdown.bigAir.count) },
        chain: { points: toInt(this.scoreBreakdown.chain.points), count: toInt(this.scoreBreakdown.chain.count) }
      }
    };
  }

  setTerrainSegments(segments) {
    this.segments = Array.isArray(segments) ? segments : [];
  }

  _ensureTerrainAhead() {
    if (this.disableAutoTerrain) return;
    const maxX = this.player.x + TERRAIN.lookahead;
    let cursor = this.terrainCursor;

    while (cursor.x < maxX) {
      const roll = this.rand01();
      const type = roll < 0.72 ? "down" : (roll < 0.86 ? "flat" : "up");
      const segment = createSegment({ x0: cursor.x, y0: cursor.y, type, rand01: this.rand01 });
      this.segments.push(segment);
      cursor = { x: segment.x1, y: segment.y1 };
    }

    this.terrainCursor = cursor;
    const cleanupX = this.player.x - TERRAIN.cleanupBehind;
    this.segments = this.segments.filter((seg) => seg.x1 >= cleanupX);
  }

  _resolveGround() {
    const p = this.player;
    const px = p.x;
    let best = null;
    let bestDelta = Infinity;

    for (const seg of this.segments) {
      if (px < seg.x0 - p.r || px > seg.x1 + p.r) continue;
      const yOn = computeSlopeY(seg, px);
      const delta = (p.y + p.r) - yOn;
      if (delta >= -PHYSICS.slopeStickTolerance && delta < bestDelta) {
        best = { segment: seg, yOn, delta };
        bestDelta = delta;
      }
    }

    return best;
  }

  _applyTrail(dt) {
    const style = trailStyleFor(this.getTrailId());
    const baseRate = Math.max(0, Number(style.rate) || 0);
    this.trailAcc += dt * baseRate;
    const count = this.trailAcc | 0;
    this.trailAcc -= count;
    if (!count) return;

    const p = this.player;
    const speed = Math.hypot(p.vx, p.vy) || 1;
    const dirX = -p.vx / speed;
    const dirY = -p.vy / speed;

    for (let i = 0; i < count; i++) {
      const life = rand(style.life?.[0] ?? 0.2, style.life?.[1] ?? 0.4);
      const size = rand(style.size?.[0] ?? 1, style.size?.[1] ?? 2);
      const spd = rand(style.speed?.[0] ?? 20, style.speed?.[1] ?? 60);
      const spread = 0.4 + rand(-0.12, 0.12);
      const vx = dirX * spd * spread + rand(-12, 12);
      const vy = dirY * spd * spread + rand(-12, 12);
      const color = typeof style.color === "function"
        ? style.color({ rand, hue: (this.timeAlive * (style.hueRate || 0)) % 360, i })
        : (style.color || "rgba(120,210,255,.6)");
      const part = new Part(p.x, p.y, vx, vy, life, size, color, Boolean(style.add));
      part.drag = Number(style.drag) || 0;
      this.trailParts.push(part);
    }
  }

  _addScore(kind, points, countDelta = 0) {
    if (!Number.isFinite(points) || points <= 0) return;
    this.score += points;
    const bucket = this.scoreBreakdown[kind];
    if (!bucket) return;
    bucket.points += points;
    if (kind === "airtime") {
      bucket.seconds += countDelta;
    } else {
      bucket.count += countDelta;
    }
  }

  _handleLanding(segment, velocity, quality) {
    const downhill = isDownhill(segment);
    const goodLanding = downhill && quality >= PHYSICS.landingQualityThreshold;

    if (goodLanding) {
      this.chain += 1;
      this.maxChain = Math.max(this.maxChain, this.chain);
      const chainBonus = this.chain * SCORE.chainBonus;
      this._addScore("chain", chainBonus, 1);
    } else {
      this.chain = 0;
    }

    if (this.lastLandingY != null && this.peakY != null) {
      const height = Math.max(0, this.lastLandingY - this.peakY);
      if (height >= SCORE.bigAirMin) {
        const multiplier = 1 + Math.max(0, this.chain - 1) * SCORE.chainMultiplier;
        const points = height * SCORE.bigAirScale * multiplier;
        this._addScore("bigAir", points, 1);
        this.maxBigAir = Math.max(this.maxBigAir, height);
      }
    }

    this.lastLandingY = computeSlopeY(segment, this.player.x);
    this.peakY = this.player.y;
  }

  update(dt) {
    if (this.state === STATE.OVER) return;

    if (!this.skillSettings?.simpleBackground) {
      updateBackgroundDots(this.background, { width: this.W, height: this.H, dt, rand: this.backgroundRand });
    }

    if (this.state !== STATE.PLAY) return;

    const p = this.player;
    const gravityOn = Boolean(this.input?.keys?.Space);
    const restartHeld = Boolean(this.input?.keys?.KeyR);

    this.timeAlive += dt;

    if (restartHeld) {
      this.restartHold += dt;
      if (this.restartHold >= 0.6) {
        this.endRun();
        return;
      }
    } else {
      this.restartHold = 0;
    }

    if (!p.grounded) {
      if (gravityOn) {
        p.vy += PHYSICS.gravity * dt;
      } else {
        const damp = Math.exp(-PHYSICS.airDamping * dt);
        p.vy *= damp;
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (!p.grounded) {
      this.airtime += dt;
      this._addScore("airtime", dt * SCORE.airtimeRate, dt);
      this.peakY = this.peakY == null ? p.y : Math.min(this.peakY, p.y);
    }

    this._ensureTerrainAhead();

    let landedThisFrame = false;
    const groundInfo = this._resolveGround();

    if (groundInfo) {
      const segment = groundInfo.segment;
      const tangent = computeSlopeTangent(segment);
      const velocity = { x: p.vx, y: p.vy };
      const quality = landingQuality(velocity, tangent);

      if (!p.grounded) {
        landedThisFrame = true;
        this._handleLanding(segment, velocity, quality);
      }

      p.grounded = true;
      p.ground = segment;
      p.y = groundInfo.yOn - p.r;

      let speedAlong = (p.vx * tangent.x + p.vy * tangent.y);
      const boost = landedThisFrame
        ? clamp(Math.abs(p.vy) * PHYSICS.slopeBoostScale, 0, PHYSICS.maxLandingSpeedBoost)
        : 0;
      speedAlong = Math.max(PHYSICS.minSpeed, speedAlong + boost);

      if (gravityOn) {
        const slopeAccel = PHYSICS.gravity * (tangent.y * 0.8);
        speedAlong = Math.max(PHYSICS.minSpeed, speedAlong + slopeAccel * dt);
      }

      p.vx = tangent.x * speedAlong;
      p.vy = tangent.y * speedAlong;

      if (p.x >= segment.x1 - p.r) {
        p.grounded = false;
        p.ground = null;
      }
    } else {
      p.grounded = false;
      p.ground = null;
    }

    p.vx = Math.max(PHYSICS.minSpeed, p.vx);
    p.y = clamp(p.y, 0 + p.r, WORLD_HEIGHT - p.r);

    this._applyTrail(dt);
    for (const part of this.trailParts) part.update(dt);
    this.trailParts = this.trailParts.filter((part) => part.life > 0);
  }

  render(alpha = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const renderAlpha = Number.isFinite(alpha) ? clamp(alpha, 0, 1) : 1;

    ctx.save();
    ctx.clearRect(0, 0, this.W, this.H);
    drawBackgroundLayer(this.background, ctx, { width: this.W, height: this.H });

    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(140,200,255,.45)";
    ctx.shadowColor = "rgba(60,110,180,.35)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (const seg of this.segments) {
      if (seg.x1 < this.player.x - this.W || seg.x0 > this.player.x + this.W) continue;
      ctx.moveTo(seg.x0, seg.y0);
      ctx.lineTo(seg.x1, seg.y1);
    }
    ctx.stroke();
    ctx.restore();

    for (const part of this.trailParts) part.draw(ctx);

    const px = this.player.x;
    const py = this.player.y;
    const iw = this.playerImg?.naturalWidth || this.playerImg?.width || 0;
    const ih = this.playerImg?.naturalHeight || this.playerImg?.height || 0;
    const ready = this.playerImg?.complete !== false;

    if (ready && iw > 0 && ih > 0) {
      ctx.drawImage(this.playerImg, px - this.player.w * 0.5, py - this.player.h * 0.5, this.player.w, this.player.h);
    } else {
      ctx.fillStyle = "rgba(120,210,255,.92)";
      ctx.beginPath();
      ctx.arc(px, py, this.player.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalAlpha = renderAlpha;
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.font = "600 20px 'Segoe UI',sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score ${Math.floor(this.score)}`, 24, 36);
    ctx.fillText(`Chain x${this.chain}`, 24, 64);
    ctx.restore();

    ctx.restore();
  }
}

export const __testables = {
  computeSlopeY,
  computeSlopeTangent,
  landingQuality,
  createSegment,
  isDownhill,
  PHYSICS,
  SCORE
};
