import { getTrailStyle } from "./trailStyles.js";
import { rand } from "./util.js";

class Part {
  constructor(x, y, vx, vy, life, size, color, add) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.t = life;
    this.size = size; this.color = color; this.add = add;
    this.drag = 10;
  }
  step(dt) {
    const d = Math.exp(-this.drag * dt);
    this.vx *= d; this.vy *= d;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.t -= dt;
    return this.t > 0;
  }
}

export class TrailPreview {
  constructor({ canvas, playerImg, getTrailId }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.playerImg = playerImg;
    this.getTrailId = getTrailId || (() => "classic");

    this.trailAcc = 0;
    this.trailHue = 0;
    this.parts = [];
    this.lastTs = 0;
    this.running = false;
    this.time = 0;
    this.player = { x: 50, y: 60, r: 14, lastX: 1, lastY: 0, vx: 0, vy: 0 };
  }

  start() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame((ts) => this._loop(ts));
  }

  _emit(dt) {
    const id = this.getTrailId();
    const st = getTrailStyle(id);

    this.trailHue = (this.trailHue + dt * (st.hueRate || 220)) % 360;
    this.trailAcc += dt * st.rate * 0.5; // slightly calmer for preview

    const n = this.trailAcc | 0;
    this.trailAcc -= n;

    const p = this.player;
    const vlen = Math.hypot(p.vx, p.vy);
    const backX = vlen > 1 ? -p.vx / vlen : -p.lastX;
    const backY = vlen > 1 ? -p.vy / vlen : -p.lastY;
    const bx = p.x + backX * p.r * 0.95;
    const by = p.y + backY * p.r * 0.95;

    for (let i = 0; i < n; i++) {
      const jitter = rand(0, Math.PI * 2);
      const jx = Math.cos(jitter) * rand(0, p.r * 0.25);
      const jy = Math.sin(jitter) * rand(0, p.r * 0.25);

      const sp = rand(st.speed[0], st.speed[1]) * 0.5;
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

  _stepPlayer(dt) {
    this.time += dt;
    const t = this.time;
    const W = this.canvas.width;
    const H = this.canvas.height;

    const px = W * 0.18 + (Math.sin(t * 0.9) * 0.4 + 0.4) * W * 0.7;
    const py = H * 0.6 + Math.sin(t * 1.6) * 16;

    const vx = (px - this.player.x) / dt;
    const vy = (py - this.player.y) / dt;
    this.player.lastX = vx === 0 && vy === 0 ? this.player.lastX : vx / Math.hypot(vx, vy);
    this.player.lastY = vx === 0 && vy === 0 ? this.player.lastY : vy / Math.hypot(vx, vy);
    this.player.vx = vx; this.player.vy = vy;
    this.player.x = px; this.player.y = py;
  }

  _render(dt) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fillRect(0, 0, W, H);

    const alive = [];
    for (const p of this.parts) {
      if (!p.step(dt)) continue;
      alive.push(p);
      ctx.globalCompositeOperation = p.add ? "lighter" : "source-over";
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.size * (p.t / p.life)), 0, Math.PI * 2);
      ctx.fill();
    }
    this.parts = alive;

    ctx.globalCompositeOperation = "source-over";
    const r = this.player.r * 1.2;
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(Math.atan2(this.player.vy, this.player.vx));
    if (this.playerImg?.complete) {
      ctx.drawImage(this.playerImg, -r, -r, r * 2, r * 2);
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _loop(ts) {
    if (!this.running) return;
    const dt = Math.min(0.05, this.lastTs ? (ts - this.lastTs) / 1000 : 1 / 60);
    this.lastTs = ts;

    this._stepPlayer(dt);
    this._emit(dt);
    this._render(dt);

    requestAnimationFrame((nt) => this._loop(nt));
  }
}
