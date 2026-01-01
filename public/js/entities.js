// Shared entity logic extracted from game.js for reuse and headless tests.
import { clamp, rand } from "./util.js";
import { DEFAULT_TEXT_STYLE_CUSTOM, normalizeTextStyleCustom, normalizeTextStylePreset } from "./settings.js";

let entityRandRange = rand;

export function setEntityRandSource(fn) {
  entityRandRange = (typeof fn === "function") ? fn : rand;
}

function randRange(a, b) {
  return entityRandRange(a, b);
}

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
    this.ph = randRange(0, Math.PI * 2);
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
    this.shape = "circle";
    this.rotation = 0;
    this.slice = null;
    this.strokeColor = null;
    this.fillColor = null;
    this.lineWidth = null;
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
    if (this.shape === "star") {
      const inner = r * 0.5;
      const points = 10;
      ctx.translate(this.x, this.y);
      if (this.rotation) ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < points; i++) {
        const ang = -Math.PI / 2 + (Math.PI * 2 * i) / points;
        const radius = (i % 2 === 0) ? r : inner;
        const x = Math.cos(ang) * radius;
        const y = Math.sin(ang) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === "heart") {
      ctx.translate(this.x, this.y);
      if (this.rotation) ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.9);
      ctx.bezierCurveTo(r * 1.3, r * 0.35, r * 0.9, -r * 0.7, 0, -r * 0.2);
      ctx.bezierCurveTo(-r * 0.9, -r * 0.7, -r * 1.3, r * 0.35, 0, r * 0.9);
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === "lemon_slice") {
      const slice = this.slice || {};
      const rind = slice.rind || "rgba(255, 247, 195, 0.95)";
      const pith = slice.pith || "rgba(255, 252, 224, 0.95)";
      const segment = slice.segment || "rgba(255, 240, 170, 0.9)";
      const segments = Math.max(4, Math.floor(slice.segments || 6));
      const inner = r * 0.82;
      const pulp = r * 0.64;
      const gap = Math.min(0.22, Math.max(0.06, slice.segmentGap ?? 0.12));
      ctx.translate(this.x, this.y);
      if (this.rotation) ctx.rotate(this.rotation);
      ctx.fillStyle = rind;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pith;
      ctx.beginPath();
      ctx.arc(0, 0, inner, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.color || pith;
      ctx.beginPath();
      ctx.arc(0, 0, pulp, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = segment;
      for (let i = 0; i < segments; i++) {
        const step = (Math.PI * 2) / segments;
        const start = i * step + step * gap;
        const end = (i + 1) * step - step * gap;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, pulp, start, end);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = segment;
      ctx.lineWidth = Math.max(0.7, r * 0.14);
      for (let i = 0; i < segments; i++) {
        const ang = (Math.PI * 2 * i) / segments;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * inner * 0.94, Math.sin(ang) * inner * 0.94);
        ctx.stroke();
      }
    } else if (this.shape === "petal") {
      ctx.translate(this.x, this.y);
      if (this.rotation) ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.85, -r * 0.15, 0, r);
      ctx.quadraticCurveTo(-r * 0.85, -r * 0.15, 0, -r);
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === "leaf") {
      ctx.translate(this.x, this.y);
      if (this.rotation) ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r * 0.9, -r * 0.2, r * 0.6, r * 0.9, 0, r);
      ctx.bezierCurveTo(-r * 0.6, r * 0.9, -r * 0.9, -r * 0.2, 0, -r);
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === "hexagon") {
      const fill = this.fillColor ?? this.color;
      const stroke = this.strokeColor ?? this.color;
      const lineWidth = this.lineWidth ?? Math.max(1, r * 0.18);
      ctx.translate(this.x, this.y);
      if (this.rotation) ctx.rotate(this.rotation);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = Math.PI / 6 + (Math.PI * 2 * i) / 6;
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke && lineWidth > 0) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    } else if (this.shape === "pixel") {
      ctx.fillStyle = this.color;
      const w = r * 1.8;
      const h = r * 1.1;
      ctx.fillRect(this.x - w * 0.5, this.y - h * 0.5, w, h);
    } else if (this.twinkle) {
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

const FLOAT_TEXT_FONT_STACK = "system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
const COMIC_TEXT_FONT_STACK = "'Bangers','Comic Sans MS','Impact','Arial Black',system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
const DIGITAL_TEXT_FONT_STACK = "'Orbitron','Rajdhani','Trebuchet MS',system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
const SERIF_TEXT_FONT_STACK = "'Merriweather','Georgia','Times New Roman',serif";
const MONO_TEXT_FONT_STACK = "'JetBrains Mono','Fira Code','SFMono-Regular',monospace";
const TEXT_FONT_STACKS = Object.freeze({
  system: FLOAT_TEXT_FONT_STACK,
  comic: COMIC_TEXT_FONT_STACK,
  digital: DIGITAL_TEXT_FONT_STACK,
  serif: SERIF_TEXT_FONT_STACK,
  mono: MONO_TEXT_FONT_STACK
});

const RANDOM_TEXT_STYLE_POOL = Object.freeze([
  "basic",
  "comic_book_mild",
  "comic_book_extreme",
  "digital",
  "clean",
  "neon_pulse",
  "holographic",
  "sticker_blast"
]);

function resolveFontFamily(key) {
  return TEXT_FONT_STACKS[key] || key || FLOAT_TEXT_FONT_STACK;
}

function pickRandomPreset() {
  const idx = Math.floor(randRange(0, RANDOM_TEXT_STYLE_POOL.length));
  return RANDOM_TEXT_STYLE_POOL[idx] || "basic";
}

export class FloatText {
  constructor(txt, x, y, color, style = {}) {
    const hasColor = Object.prototype.hasOwnProperty.call(style, "color");
    const hasFontFamily = Object.prototype.hasOwnProperty.call(style, "fontFamily");
    const hasFontWeight = Object.prototype.hasOwnProperty.call(style, "fontWeight");
    const hasStrokeColor = Object.prototype.hasOwnProperty.call(style, "strokeColor");
    const hasGlowColor = Object.prototype.hasOwnProperty.call(style, "glowColor");
    const hasSize = Object.prototype.hasOwnProperty.call(style, "size");
    this.txt = txt; this.x = x; this.y = y;
    this.vx = randRange(-18, 18); this.vy = randRange(-90, -55);
    this.life = 0.9; this.max = 0.9;
    this.color = hasColor ? style.color : (color || "rgba(255,255,255,.95)");
    this.palette = Array.isArray(style.palette) ? style.palette.slice(0, 4) : null;
    this.glowColor = hasGlowColor ? style.glowColor : "rgba(255,255,255,.95)";
    this.strokeColor = hasStrokeColor ? style.strokeColor : "rgba(0,0,0,.55)";
    this.strokeWidth = style.strokeWidth ?? 1.8;
    this.size = hasSize ? style.size : 18;
    this.wobble = style.wobble || 0;
    this.spin = style.spin || 0;
    this.shimmer = style.shimmer || 0;
    this.sparkle = !!style.sparkle;
    this.combo = style.combo || 0;
    this.comboMax = style.comboMax || 1;
    this.fontFamily = hasFontFamily ? style.fontFamily : FLOAT_TEXT_FONT_STACK;
    this.fontWeight = hasFontWeight ? style.fontWeight : 900;
    this.shadowBoost = style.shadowBoost ?? 0;
    this.shadowOffsetY = style.shadowOffsetY ?? 3;
    this._colorCustom = hasColor;
    this._fontFamilyCustom = hasFontFamily;
    this._fontWeightCustom = hasFontWeight;
    this._strokeColorCustom = hasStrokeColor;
    this._glowColorCustom = hasGlowColor;
    this._sizeCustom = hasSize;

    this.rotation = 0;
    this.phase = 0;
    this.sparkleSeed = randRange(0, Math.PI * 2);

    this._applyTextPreferences({
      preset: style.textStylePreset ?? FloatText.textStylePreset,
      custom: style.textStyleCustom ?? FloatText.textStyleCustom
    });
  }
  static setTextStylePreset(preset) {
    FloatText.textStylePreset = normalizeTextStylePreset(preset);
  }
  static setTextStyleCustom(custom) {
    FloatText.textStyleCustom = normalizeTextStyleCustom(custom);
  }
  static setTextPreferences({ preset, custom } = {}) {
    if (preset !== undefined) FloatText.textStylePreset = normalizeTextStylePreset(preset);
    if (custom !== undefined) FloatText.textStyleCustom = normalizeTextStyleCustom(custom);
  }
  _applyComicBookStyle(extreme) {
    const intensity = extreme ? 1 : 0.45;

    if (!this._fontFamilyCustom) this.fontFamily = COMIC_TEXT_FONT_STACK;
    if (!this._fontWeightCustom) this.fontWeight = extreme ? 950 : 800;
    if (!this._strokeColorCustom) this.strokeColor = extreme ? "rgba(0,0,0,.95)" : "rgba(0,0,0,.7)";

    this.strokeWidth = Math.max(this.strokeWidth, 1.8 + intensity * 2.4);
    this.shadowBoost += 10 * intensity;
    this.shadowOffsetY += 1.5 * intensity;
    this.size *= extreme ? 1.18 : 1.06;
    this.wobble = Math.max(this.wobble, 0.5 * intensity);
    if (!this.spin) this.spin = randRange(-0.18, 0.18) * (extreme ? 2 : 1);
    this.shimmer = Math.max(this.shimmer, 0.3 * intensity);

    if (!this.palette) {
      this.palette = extreme
        ? ["#fff3a6", "#ff8fd1", "#7ce9ff", "#ffcf7a"]
        : ["#fff3c4", "#ffd5f0"];
    }
    if (extreme) this.sparkle = true;
  }
  _applyPresetStyle(preset) {
    switch (preset) {
      case "comic_book_mild":
        this._applyComicBookStyle(false);
        break;
      case "comic_book_extreme":
        this._applyComicBookStyle(true);
        break;
      case "digital":
        if (!this._fontFamilyCustom) this.fontFamily = DIGITAL_TEXT_FONT_STACK;
        if (!this._fontWeightCustom) this.fontWeight = 700;
        if (!this._strokeColorCustom) this.strokeColor = "rgba(8,12,20,.8)";
        if (!this._glowColorCustom) this.glowColor = "rgba(160,240,255,.95)";
        this.strokeWidth = Math.max(this.strokeWidth, 2.2);
        this.shadowBoost = Math.max(this.shadowBoost, 12);
        this.shadowOffsetY = 0;
        this.wobble = Math.max(this.wobble, 0.35);
        this.shimmer = Math.max(this.shimmer, 0.5);
        this.palette = ["#b2f5ff", "#9da7ff", "#6d7bff"];
        break;
      case "clean":
        if (!this._fontFamilyCustom) this.fontFamily = FLOAT_TEXT_FONT_STACK;
        if (!this._fontWeightCustom) this.fontWeight = 700;
        this.strokeWidth = 0;
        this.shadowBoost = Math.min(this.shadowBoost, 2);
        this.shadowOffsetY = 0;
        this.wobble = 0;
        this.spin = 0;
        this.shimmer = 0;
        this.sparkle = false;
        this.palette = null;
        break;
      case "neon_pulse":
        if (!this._fontFamilyCustom) this.fontFamily = DIGITAL_TEXT_FONT_STACK;
        if (!this._fontWeightCustom) this.fontWeight = 800;
        if (!this._strokeColorCustom) this.strokeColor = "rgba(6,10,16,.9)";
        if (!this._glowColorCustom) this.glowColor = "rgba(140,255,236,.95)";
        this.strokeWidth = Math.max(this.strokeWidth, 2.8);
        this.shadowBoost = Math.max(this.shadowBoost, 18);
        this.shadowOffsetY = 0;
        this.wobble = Math.max(this.wobble, 0.6);
        this.shimmer = Math.max(this.shimmer, 0.7);
        this.sparkle = true;
        this.palette = ["#9cfffb", "#ff7bd4", "#7b8bff"];
        break;
      case "holographic":
        if (!this._fontFamilyCustom) this.fontFamily = FLOAT_TEXT_FONT_STACK;
        if (!this._fontWeightCustom) this.fontWeight = 850;
        if (!this._strokeColorCustom) this.strokeColor = "rgba(255,255,255,.7)";
        if (!this._glowColorCustom) this.glowColor = "rgba(210,255,255,.95)";
        this.strokeWidth = Math.max(this.strokeWidth, 2.4);
        this.shadowBoost = Math.max(this.shadowBoost, 14);
        this.shadowOffsetY = 1;
        this.wobble = Math.max(this.wobble, 0.8);
        this.spin = this.spin || randRange(-0.2, 0.2);
        this.shimmer = Math.max(this.shimmer, 0.75);
        this.sparkle = true;
        this.palette = ["#f8bfff", "#b7f7ff", "#ffe6a6"];
        break;
      case "sticker_blast":
        if (!this._fontFamilyCustom) this.fontFamily = COMIC_TEXT_FONT_STACK;
        if (!this._fontWeightCustom) this.fontWeight = 900;
        if (!this._strokeColorCustom) this.strokeColor = "rgba(0,0,0,.95)";
        this.strokeWidth = Math.max(this.strokeWidth, 4.2);
        this.shadowBoost = Math.max(this.shadowBoost, 12);
        this.shadowOffsetY = 2;
        this.wobble = Math.max(this.wobble, 0.4);
        this.shimmer = Math.max(this.shimmer, 0.25);
        this.palette = ["#fff3a6", "#ff8bd1", "#7ce9ff"];
        break;
      default:
        break;
    }
  }
  _applyCustomStyle(custom) {
    const normalized = normalizeTextStyleCustom(custom || DEFAULT_TEXT_STYLE_CUSTOM);
    this.fontFamily = resolveFontFamily(normalized.fontFamily);
    this.fontWeight = normalized.fontWeight;
    this.size *= normalized.sizeScale;
    this.strokeColor = normalized.strokeColor;
    this.strokeWidth = normalized.strokeWidth;
    this.shadowBoost = normalized.shadowBoost;
    this.shadowOffsetY = normalized.shadowOffsetY;
    this.wobble = normalized.wobble;
    this.spin = normalized.spin;
    this.shimmer = normalized.shimmer;
    this.sparkle = normalized.sparkle;

    if (!normalized.useGameColors) {
      this.color = normalized.color;
      this.palette = normalized.useGradient ? [normalized.gradientStart, normalized.gradientEnd] : null;
    }
    if (!normalized.useGameGlow) this.glowColor = normalized.glowColor;
  }
  _applyTextPreferences({ preset, custom } = {}) {
    const normalizedPreset = normalizeTextStylePreset(preset);
    const resolvedPreset = normalizedPreset === "random" ? pickRandomPreset() : normalizedPreset;
    this._resolvedTextPreset = resolvedPreset;

    if (resolvedPreset === "disabled") {
      this.life = 0;
      this.max = 0;
      return;
    }
    if (resolvedPreset === "custom") {
      this._applyCustomStyle(custom);
      return;
    }
    if (resolvedPreset === "basic") return;
    this._applyPresetStyle(resolvedPreset);
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const d = Math.exp(-2.7 * dt);
    this.vx *= d; this.vy *= d;
    this.phase += dt;
    this.rotation += this.spin * dt;
  }
  _gradient(ctx, w, h) {
    if (!this.palette || this.palette.length < 2) return null;
    const slide = Math.sin(this.phase * 2.5) * this.shimmer * 12;
    const g = ctx.createLinearGradient(-w * 0.6, -h * 0.8 + slide, w * 0.6, h * 0.8 - slide);
    const n = this.palette.length;
    for (let i = 0; i < n; i++) {
      g.addColorStop(i / Math.max(1, n - 1), this.palette[i]);
    }
    return g;
  }
  _sparkles(ctx, a) {
    if (!this.sparkle) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a * 0.65;
    ctx.fillStyle = this.glowColor;
    const base = Math.min(6, 2 + Math.floor((this.combo / Math.max(1, this.comboMax)) * 8));
    for (let i = 0; i < base; i++) {
      const ph = this.sparkleSeed + i * 1.8 + this.phase * 5.4;
      const r = (Math.sin(ph * 1.7) * 0.5 + 0.5) * 8 + 3;
      const ox = Math.cos(ph) * (6 + i * 0.8);
      const oy = Math.sin(ph * 0.7) * (4 + i * 0.6);
      ctx.beginPath();
      ctx.arc(ox, oy, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  draw(ctx) {
    if (this.life <= 0) return;
    const t = clamp(this.life / this.max, 0, 1), a = t * t;
    const wob = Math.sin(this.phase * 5) * this.wobble * (0.6 + 0.4 * (1 - t));
    ctx.save();
    ctx.translate(this.x + wob, this.y);
    if (this.rotation) ctx.rotate(this.rotation);

    ctx.globalAlpha = a;
    ctx.font = `${this.fontWeight} ${this.size}px ${this.fontFamily}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 20 + (8 * (this.combo / Math.max(1, this.comboMax))) + this.shadowBoost;
    ctx.shadowOffsetY = this.shadowOffsetY;

    const w = this.size * this.txt.length * 0.65;
    const h = this.size;
    const grad = this._gradient(ctx, w, h);
    ctx.fillStyle = grad || this.color;
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.strokeWidth;
    ctx.lineJoin = "round";

    if (this.strokeWidth > 0) ctx.strokeText(this.txt, 0, 0);
    ctx.fillText(this.txt, 0, 0);

    this._sparkles(ctx, a);
    ctx.restore();
  }
}

FloatText.textStylePreset = "basic";
FloatText.textStyleCustom = normalizeTextStyleCustom(DEFAULT_TEXT_STYLE_CUSTOM);
