// ===============================
// FILE: public/js/pipes/pipeEntity.js
// ===============================
// Pipe/Gate entity definitions extracted for modularization and testing.

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
