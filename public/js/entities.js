// Shared entity logic extracted from game.js for reuse and headless tests.
import { clamp, rand } from "./util.js";

export class Pipe {
  constructor(x, y, w, h, vx, vy) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = vx; this.vy = vy;
    this.entered = false;
    this.scored = false;
  }
  cx() { return this.x + this.w * 0.5; }
  cy() { return this.y + this.h * 0.5; }

  update(dt, mul = 1, W = 0, H = 0) {
    this.x += this.vx * dt * mul;
    this.y += this.vy * dt * mul;

    if (!this.entered) {
      // Mark entered once it overlaps the screen bounds
      if (this.x + this.w >= 0 && this.x <= W && this.y + this.h >= 0 && this.y <= H) {
        this.entered = true;
      }
    }
  }

  off(W, H, m) {
    return (this.x > W + m) || (this.x + this.w < -m) || (this.y > H + m) || (this.y + this.h < -m);
  }
}

export class Gate {
  constructor(axis, pos, v, gapCenter, gapHalf, thick) {
    this.axis = axis; this.pos = pos; this.prev = pos; this.v = v;
    this.gapCenter = gapCenter; this.gapHalf = gapHalf; this.thick = thick;
    this.entered = false;
    this.cleared = false;
    this.perfected = false;
  }
  update(dt, W, H) {
    this.prev = this.pos;
    this.pos += this.v * dt;
    if (!this.entered) {
      if (this.axis === "x") {
        if (this.pos + this.thick * 0.5 >= 0 && this.pos - this.thick * 0.5 <= W) this.entered = true;
      } else {
        if (this.pos + this.thick * 0.5 >= 0 && this.pos - this.thick * 0.5 <= H) this.entered = true;
      }
    }
  }
  crossed(playerAxis, { allowCleared = false } = {}) {
    if (this.perfected) return false;
    if ((this.cleared && !allowCleared) || !this.entered) return false;
    if (this.v > 0) return (this.prev < playerAxis && this.pos >= playerAxis);
    if (this.v < 0) return (this.prev > playerAxis && this.pos <= playerAxis);
    return false;
  }
  off(W, H, m) { return this.axis === "x" ? (this.pos < -m || this.pos > W + m) : (this.pos < -m || this.pos > H + m); }
}

export class Orb {
  constructor(x, y, vx, vy, r, life) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.r = r; this.life = life; this.max = life;
    this.ph = rand(0, Math.PI * 2);
  }
  update(dt, W, H) {
    this.life -= dt;
    this.ph += dt * 2.2;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const pad = this.r + 4;
    if (this.x < pad) { this.x = pad; this.vx = Math.abs(this.vx); }
    if (this.x > W - pad) { this.x = W - pad; this.vx = -Math.abs(this.vx); }
    if (this.y < pad) { this.y = pad; this.vy = Math.abs(this.vy); }
    if (this.y > H - pad) { this.y = H - pad; this.vy = -Math.abs(this.vy); }
  }
  dead() { return this.life <= 0; }
}

export class Part {
  constructor(x, y, vx, vy, life, size, color, add) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.max = life; this.size = size;
    this.color = color; this.add = add;
    this.drag = 0;
    this.twinkle = false;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) return;
    if (this.drag > 0) {
      const d = Math.exp(-this.drag * dt);
      this.vx *= d; this.vy *= d;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    const t = clamp(this.life / this.max, 0, 1);
    const a = t * t;
    ctx.save();
    if (this.add) ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a;
    const r = Math.max(0.7, this.size * (0.6 + 0.6 * (1 - t)));
    if (this.twinkle) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(0.65, r * 0.35);
      ctx.beginPath(); ctx.moveTo(this.x - r * 1.4, this.y); ctx.lineTo(this.x + r * 1.4, this.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.x, this.y - r * 1.4); ctx.lineTo(this.x, this.y + r * 1.4); ctx.stroke();
      ctx.lineWidth = Math.max(0.5, r * 0.25);
      ctx.beginPath(); ctx.moveTo(this.x - r * 0.9, this.y - r * 0.9); ctx.lineTo(this.x + r * 0.9, this.y + r * 0.9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.x - r * 0.9, this.y + r * 0.9); ctx.lineTo(this.x + r * 0.9, this.y - r * 0.9); ctx.stroke();
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export class FloatText {
  constructor(txt, x, y, color) {
    this.txt = txt; this.x = x; this.y = y;
    this.vx = rand(-18, 18); this.vy = rand(-90, -55);
    this.life = 0.9; this.max = 0.9;
    this.color = color || "rgba(255,255,255,.95)";
    this.size = 18;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const d = Math.exp(-2.7 * dt);
    this.vx *= d; this.vy *= d;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    const t = clamp(this.life / this.max, 0, 1), a = t * t;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `900 ${this.size}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = 14; ctx.shadowOffsetY = 2;
    ctx.fillStyle = this.color;
    ctx.fillText(this.txt, this.x, this.y);
    ctx.restore();
  }
}
