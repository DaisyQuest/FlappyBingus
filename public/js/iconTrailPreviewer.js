// =====================
// FILE: public/js/iconTrailPreviewer.js
// Renders the icon trail effect inside small swatches using a shared RAF loop.
// =====================
import { TrailPreview } from "./trailPreview.js";
import { createPlayerIconSprite } from "./playerIconSprites.js";
import { clamp } from "./util.js";

const DEFAULT_ANCHOR = { x: 0.5, y: 0.5 };
const MAX_DT = 1 / 12;

function rafOrNull(fn) {
  return typeof fn === "function" ? fn.bind(globalThis) : null;
}

export class IconTrailPreviewer {
  constructor({
    requestFrame = (typeof requestAnimationFrame === "function" ? requestAnimationFrame : null),
    cancelFrame = (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : null),
    now = () => (typeof performance !== "undefined" ? performance.now() : Date.now())
  } = {}) {
    this._raf = rafOrNull(requestFrame);
    this._cancel = rafOrNull(cancelFrame);
    this._now = now;
    this._frame = null;
    this._tick = this._tick.bind(this);
    this._sprites = new Map();
    this.previews = new Map();
    this.running = false;
    this.lastNow = 0;
  }

  _spriteFor(icon, provided) {
    if (provided) {
      if (icon?.id) this._sprites.set(icon.id, provided);
      return provided;
    }
    const key = icon?.id;
    if (!key) return null;
    if (this._sprites.has(key)) return this._sprites.get(key);
    const sprite = createPlayerIconSprite(icon, { size: 96 });
    this._sprites.set(key, sprite);
    return sprite;
  }

  attach(element, {
    icon,
    trailId = "classic",
    anchor = DEFAULT_ANCHOR,
    playerImg = null,
    group = "swatches"
  } = {}) {
    if (!element) return null;
    const canvas = element.querySelector("canvas.icon-swatch-canvas");
    if (!canvas) return null;

    const sprite = this._spriteFor(icon, playerImg);
    const existing = this.previews.get(element);
    if (existing) {
      if (icon?.id && existing.iconId !== icon.id && sprite) {
        existing.preview.setPlayerImage(sprite);
        existing.iconId = icon.id;
      }
      if (trailId && trailId !== existing.trailId) {
        existing.preview.setTrail(trailId);
        existing.trailId = trailId;
      }
      existing.preview.anchor = anchor || existing.preview.anchor || DEFAULT_ANCHOR;
      existing.group = group;
      return existing.preview;
    }

    const preview = new TrailPreview({
      canvas,
      playerImg: sprite,
      requestFrame: null,
      cancelFrame: null,
      now: this._now,
      mode: "static",
      anchor: anchor || DEFAULT_ANCHOR,
      drawBackground: false,
      staticDrift: { speed: 190, swing: 0.46, wobble: 0.32, rate: 0.9, heading: -Math.PI * 0.45 }
    });
    preview.setTrail(trailId || "classic");
    preview.step(1 / 30, this._now());

    this.previews.set(element, { preview, trailId, iconId: icon?.id || null, group });
    this.start();
    return preview;
  }

  sync(entries = [], { trailId, group = "swatches" } = {}) {
    const live = new Set();
    for (const entry of entries) {
      const preview = this.attach(entry.element || entry.swatch || entry.el, {
        icon: entry.icon,
        playerImg: entry.playerImg,
        anchor: entry.anchor,
        trailId: trailId || entry.trailId || "classic",
        group
      });
      if (preview && entry.element) live.add(entry.element);
      else if (preview && entry.swatch) live.add(entry.swatch);
    }

    for (const [el, rec] of Array.from(this.previews.entries())) {
      if (rec.group === group && !live.has(el)) {
        this.previews.delete(el);
      }
    }

    if (this.previews.size === 0) {
      this.stop();
    } else {
      this.start();
    }
  }

  setTrail(id) {
    const trailId = id || "classic";
    for (const rec of this.previews.values()) {
      if (rec.trailId !== trailId) {
        rec.preview.setTrail(trailId);
        rec.trailId = trailId;
      }
    }
  }

  _stepAll(dt, now = this._now()) {
    for (const rec of this.previews.values()) {
      rec.preview.step(dt, now);
    }
  }

  _tick(ts) {
    if (!this.running) return;
    if (this.previews.size === 0) {
      this.stop();
      return;
    }

    const now = (typeof ts === "number" ? ts : this._now());
    const prev = this.lastNow || now;
    const dt = clamp(this.lastNow ? (now - prev) * 0.001 : 1 / 60, 0, MAX_DT);
    this.lastNow = now;
    this._stepAll(dt, now);

    this._frame = this._raf?.(this._tick) ?? null;
    if (this._frame === null) {
      this.running = false;
    }
  }

  start() {
    if (this.running || this.previews.size === 0 || !this._raf) return;
    this.running = true;
    this.lastNow = 0;
    this._frame = this._raf(this._tick);
    if (this._frame === null) {
      this.running = false;
    }
  }

  stop() {
    this.running = false;
    if (this._frame !== null && this._cancel) {
      this._cancel(this._frame);
    }
    this._frame = null;
    this.lastNow = 0;
  }

  destroy() {
    this.stop();
    this.previews.clear();
    this._sprites.clear();
  }
}

export const __testables = {
  DEFAULT_ANCHOR,
  MAX_DT
};
