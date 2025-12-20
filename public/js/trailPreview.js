// =====================
// FILE: public/js/trailPreview.js
// =====================
import { clamp, createSeededRand } from "./util.js";
import { Part } from "./entities.js";
import { trailStyleFor } from "./trailStyles.js";

export class TrailPreview {
  constructor({
    canvas,
    playerImg,
    requestFrame = (typeof requestAnimationFrame === "function" ? requestAnimationFrame : null),
    cancelFrame = (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : null),
    now = () => (typeof performance !== "undefined" ? performance.now() : Date.now())
  } = {}) {
    this.canvas = canvas || null;
    this.ctx = this.canvas?.getContext?.("2d") || null;
    this.playerImg = playerImg;

    this.parts = [];
    this.trailId = "classic";
    this.trailHue = 0;
    this.trailAcc = 0;
    this.trailGlintAcc = 0;
    this.trailSparkAcc = 0;
    this.player = { x: 0, y: 0, vx: 0, vy: 0, prevX: 0, prevY: 0, r: 18, phase: 0 };

    this.W = 320;
    this.H = 180;
    this.DPR = Math.max(1, (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));

    this._raf = requestFrame;
    this._cancel = cancelFrame;
    this._now = now;
    this._frame = null;
    this._tick = this._tick.bind(this);
    this.running = false;
    this.lastTs = 0;
    this._rand = createSeededRand("trail-preview-classic");

    this.resize();
  }

  setTrail(id) {
    const nextId = id || "classic";
    this.trailId = nextId;
    this.trailHue = 0;
    this.trailAcc = 1;
    this.trailGlintAcc = 1;
    this.trailSparkAcc = 1;
    this.player.phase = 0;
    this.parts.length = 0;
    this._rand = createSeededRand(`trail-preview-${nextId}`);
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

  _tick(ts) {
    if (!this.running) return;
    if (!this.ctx) return;

    const now = (typeof ts === "number" ? ts : this._now());
    const prev = this.lastTs || now;
    const rawDt = (now - prev) * 0.001;
    const dt = clamp(this.lastTs ? rawDt : 1 / 60, 0, 1 / 12);
    this.lastTs = now;

    this.resize();
    this._updatePlayer(dt);
    this._emitTrail(dt);
    this._updateParts(dt);
    this._draw();

    this._frame = this._raf?.(this._tick) ?? null;
  }

  _updatePlayer(dt) {
    const targetX = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(this.player.phase * 1.2));
    const targetY = 0.5 + 0.32 * Math.sin(this.player.phase * 0.9 + Math.cos(this.player.phase * 0.6) * 0.65);

    this.player.prevX = this.player.x || this.W * targetX;
    this.player.prevY = this.player.y || this.H * targetY;

    this.player.phase += dt * 0.95;
    this.player.x = this.W * targetX;
    this.player.y = this.H * targetY;
    this.player.r = Math.max(12, Math.min(this.W, this.H) * 0.08);

    const invDt = dt > 1e-4 ? 1 / dt : 0;
    this.player.vx = (this.player.x - this.player.prevX) * invDt;
    this.player.vy = (this.player.y - this.player.prevY) * invDt;
  }

  _emitTrail(dt) {
    const st = trailStyleFor(this.trailId);
    const glint = st.glint || {};
    const sparkle = st.sparkle || {};

    const flow = 0.8 + 0.4 * Math.sin(this.player.phase * 1.6);
    this.trailHue = (this.trailHue + dt * (st.hueRate || 220)) % 360;
    this.trailAcc += dt * st.rate * flow;
    this.trailGlintAcc += dt * (glint.rate || st.rate * 0.55);
    this.trailSparkAcc += dt * (sparkle.rate || 34);

    const n = this.trailAcc | 0;
    this.trailAcc -= n;
    const g = this.trailGlintAcc | 0;
    this.trailGlintAcc -= g;
    const s = this.trailSparkAcc | 0;
    this.trailSparkAcc -= s;

    const p = this.player;
    const vMag = Math.hypot(p.vx, p.vy) || 1;
    const backX = -p.vx / vMag;
    const backY = -p.vy / vMag;
    const bx = p.x + backX * p.r * 0.95;
    const by = p.y + backY * p.r * 0.95;
    const backA = Math.atan2(backY, backX);

    for (let i = 0; i < n; i++) {
      const jitter = this._randRange(0, Math.PI * 2);
      const jx = Math.cos(jitter) * this._randRange(0, p.r * 0.35);
      const jy = Math.sin(jitter) * this._randRange(0, p.r * 0.35);

      const sp = this._randRange(st.speed[0], st.speed[1]);
      const a = this._randRange(0, Math.PI * 2);
      const vx = backX * sp + Math.cos(a) * sp * 0.55;
      const vy = backY * sp + Math.sin(a) * sp * 0.55;

      const life = this._randRange(st.life[0], st.life[1]);
      const size = this._randRange(st.size[0], st.size[1]);

      const color = st.color ? st.color({ i, hue: this.trailHue, rand: this._randRange.bind(this) }) : "rgba(140,220,255,.62)";

      const prt = new Part(bx + jx, by + jy, vx, vy, life, size, color, st.add);
      prt.drag = st.drag;
      this.parts.push(prt);
    }

    for (let i = 0; i < g; i++) {
      const spin = this._randRange(-0.9, 0.9);
      const off = this._randRange(p.r * 0.12, p.r * 0.58);
      const px = bx + Math.cos(backA + Math.PI + spin) * off;
      const py = by + Math.sin(backA + Math.PI + spin) * off;

      const sp = this._randRange(glint.speed?.[0] || 55, glint.speed?.[1] || 155);
      const vx = backX * sp * 0.42 + Math.cos(backA + Math.PI + spin) * sp * 0.58;
      const vy = backY * sp * 0.42 + Math.sin(backA + Math.PI + spin) * sp * 0.58;

      const life = this._randRange(glint.life?.[0] || 0.18, glint.life?.[1] || 0.32);
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

      const sp = this._randRange(sparkle.speed?.[0] || 20, sparkle.speed?.[1] || 55);
      const wobble = this._randRange(-0.55, 0.55);
      const vx = Math.cos(ang + wobble) * sp * 0.65;
      const vy = Math.sin(ang + wobble) * sp * 0.65;

      const life = this._randRange(sparkle.life?.[0] || 0.28, sparkle.life?.[1] || 0.46);
      const size = this._randRange(sparkle.size?.[0] || 1.0, sparkle.size?.[1] || 2.4);
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

    for (const part of this.parts) {
      part.draw(ctx);
    }

    this._drawPlayer(ctx);

    const sheen = ctx.createLinearGradient?.(0, 0, 0, this.H) || null;
    if (sheen) {
      sheen.addColorStop(0, "rgba(255,255,255,.06)");
      sheen.addColorStop(1, "rgba(255,255,255,.01)");
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    ctx.restore?.();
  }

  _drawPlayer(ctx) {
    const p = this.player;
    ctx.save?.();
    ctx.translate?.(p.x, p.y);
    const size = p.r * 2.4;
    const ang = Math.atan2(p.vy, p.vx) * 0.18;
    if (ctx.rotate) ctx.rotate(ang);

    if (this.playerImg?.complete && this.playerImg?.naturalWidth > 0) {
      ctx.drawImage?.(this.playerImg, -size * 0.5, -size * 0.5, size, size);
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
