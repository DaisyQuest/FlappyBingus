// =====================
// FILE: public/js/rendering.js
// =====================
// Rendering utilities shared across the game to keep visuals beautiful while
// allowing lower-detail modes to reduce GPU/CPU work.

const DETAIL_LEVELS = {
  high: {
    resolutionScale: 1.0,
    minDpr: 1.0,
    maxDpr: 1.9,
    backgroundDensity: 1.0,
    backgroundAlpha: 1.0,
    vignetteIntensity: 1.0,
    shadows: true,
    shadowScale: 1.0,
    glow: true,
    fxDensity: 1.0,
    fxCap: 1.0
  },
  low: {
    resolutionScale: 0.82,
    minDpr: 0.9,
    maxDpr: 1.35,
    backgroundDensity: 0.52,
    backgroundAlpha: 0.82,
    vignetteIntensity: 0.68,
    shadows: false,
    shadowScale: 0.45,
    glow: false,
    fxDensity: 0.52,
    fxCap: 0.6
  }
};

export class RenderProfile {
  constructor(level = "high") {
    this.level = "high";
    this.settings = DETAIL_LEVELS.high;
    this.setLevel(level);
  }

  setLevel(level = "high") {
    const next = DETAIL_LEVELS[level] ? level : "high";
    const changed = next !== this.level;
    this.level = next;
    this.settings = DETAIL_LEVELS[this.level];
    return changed;
  }

  backgroundCount(base) {
    return Math.max(10, Math.round(base * this.settings.backgroundDensity));
  }

  vignetteAlpha(alpha) {
    return Math.max(0, alpha * this.settings.vignetteIntensity);
  }

  dotsAlpha(alpha) {
    return Math.max(0, alpha * this.settings.backgroundAlpha);
  }

  shadowBlur(value) {
    if (!this.settings.shadows) return 0;
    return Math.max(0, value * this.settings.shadowScale);
  }

  shadowColor(base) {
    return this.settings.shadows ? base : "transparent";
  }

  glowAlpha(alpha) {
    return this.settings.glow ? alpha : alpha * 0.55;
  }

  particleCount(base) {
    return Math.max(1, Math.round(base * this.settings.fxDensity));
  }

  particleLimit(base) {
    return Math.max(1, Math.round(base * this.settings.fxCap));
  }

  effectiveDpr(rawDpr = 1) {
    const cap = Math.max(0.5, Number(this.settings.maxDpr) || 2);
    const floor = Math.max(0.5, Number(this.settings.minDpr) || 0.5);
    const scale = Number(this.settings.resolutionScale) || 1;
    const base = Math.max(0.5, rawDpr);
    return Math.max(floor, Math.min(cap, base * scale));
  }
}

/**
 * Pre-rendered static background (fill, vignette, dots).
 * Rebuilt only on resize or detail changes, then blitted each frame.
 */
export class BackgroundLayer {
  constructor(baseColor = "#07101a") {
    this.baseColor = baseColor;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.w = 0; this.h = 0;
    this.key = "";
  }

  rebuild({ width, height, dots, profile }) {
    const w = Math.max(1, Math.round(width || 1));
    const h = Math.max(1, Math.round(height || 1));
    const key = `${w}x${h}:${profile?.level || "high"}:${dots?.length || 0}`;
    if (this.key === key) return;
    this.key = key;
    this.w = w; this.h = h;

    this.canvas.width = w;
    this.canvas.height = h;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);

    // Base fill
    ctx.fillStyle = this.baseColor;
    ctx.fillRect(0, 0, w, h);

    // Vignette
    const vg = ctx.createRadialGradient(
      w * 0.5, h * 0.45, Math.min(w, h) * 0.12,
      w * 0.5, h * 0.5, Math.max(w, h) * 0.75
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,.44)");
    ctx.globalAlpha = profile ? profile.vignetteAlpha(1) : 1;
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // Starfield dots
    ctx.globalAlpha = (profile ? profile.dotsAlpha(0.75) : 0.75);
    ctx.fillStyle = "rgba(255,255,255,.20)";
    for (const p of dots || []) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  draw(targetCtx) {
    if (!targetCtx) return;
    targetCtx.drawImage(this.canvas, 0, 0, this.w, this.h);
  }
}
