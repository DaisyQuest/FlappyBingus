"use strict";

const { normalizeUnlock, normalizePlayerIcons } = require("./playerIcons.cjs");

const PATTERN_TYPES = new Set([
  "zigzag",
  "centerline",
  "stripes",
  "honeycomb",
  "citrus_slice",
  "cobblestone"
]);

const ANIMATION_TYPES = new Set(["lava", "cape_flow", "zigzag_scroll"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeNumber(value) {
  if (value === null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function normalizeColorList(value, errors, path) {
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  const colors = value.map((entry) => normalizeString(entry)).filter((entry) => entry !== undefined);
  if (!colors.length) {
    errors.push({ path, message: "colors_empty" });
    return undefined;
  }
  if (colors.some((entry) => entry === null)) {
    errors.push({ path, message: "colors_invalid" });
    return undefined;
  }
  return colors;
}

function normalizePalette(value, errors, path, allowedKeys) {
  if (value === null) return null;
  if (!isPlainObject(value)) return undefined;
  const out = {};
  allowedKeys.forEach((key) => {
    if (!(key in value)) return;
    const color = normalizeString(value[key]);
    if (color === undefined) {
      errors.push({ path: `${path}.${key}`, message: "palette_color_invalid" });
      return;
    }
    if (color !== null) out[key] = color;
  });
  return Object.keys(out).length ? out : null;
}

function normalizePattern(value, errors, path) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    errors.push({ path, message: "pattern_invalid" });
    return undefined;
  }
  const type = normalizeString(value.type);
  if (!type || !PATTERN_TYPES.has(type)) {
    errors.push({ path: `${path}.type`, message: "pattern_type_invalid" });
    return undefined;
  }
  const out = { type };
  if (type === "zigzag") {
    const stroke = normalizeString(value.stroke);
    const background = normalizeString(value.background);
    const amplitude = normalizeNumber(value.amplitude);
    const waves = normalizeNumber(value.waves);
    const spacing = normalizeNumber(value.spacing);
    if (stroke !== undefined && stroke !== null) out.stroke = stroke;
    if (background !== undefined && background !== null) out.background = background;
    if (amplitude !== undefined && amplitude !== null) out.amplitude = amplitude;
    if (waves !== undefined && waves !== null) out.waves = waves;
    if (spacing !== undefined && spacing !== null) out.spacing = spacing;
  } else if (type === "centerline") {
    const stroke = normalizeString(value.stroke);
    const accent = normalizeString(value.accent);
    const glow = normalizeString(value.glow);
    if (stroke !== undefined && stroke !== null) out.stroke = stroke;
    if (accent !== undefined && accent !== null) out.accent = accent;
    if (glow !== undefined && glow !== null) out.glow = glow;
  } else if (type === "stripes") {
    const colors = normalizeColorList(value.colors, errors, `${path}.colors`);
    const stripeWidth = normalizeNumber(value.stripeWidth);
    const angle = normalizeNumber(value.angle);
    const glow = normalizeString(value.glow);
    if (colors !== undefined && colors !== null) out.colors = colors;
    if (stripeWidth !== undefined && stripeWidth !== null) out.stripeWidth = stripeWidth;
    if (angle !== undefined && angle !== null) out.angle = angle;
    if (glow !== undefined && glow !== null) out.glow = glow;
  } else if (type === "honeycomb") {
    const stroke = normalizeString(value.stroke);
    const lineWidth = normalizeNumber(value.lineWidth);
    const cellSize = normalizeNumber(value.cellSize);
    const glow = normalizeString(value.glow);
    if (stroke !== undefined && stroke !== null) out.stroke = stroke;
    if (lineWidth !== undefined && lineWidth !== null) out.lineWidth = lineWidth;
    if (cellSize !== undefined && cellSize !== null) out.cellSize = cellSize;
    if (glow !== undefined && glow !== null) out.glow = glow;
  } else if (type === "citrus_slice") {
    const stroke = normalizeString(value.stroke);
    const lineWidth = normalizeNumber(value.lineWidth);
    const segments = normalizeNumber(value.segments);
    const centerRadius = normalizeNumber(value.centerRadius);
    const glow = normalizeString(value.glow);
    const rindStroke = normalizeString(value.rindStroke);
    const segmentStroke = normalizeString(value.segmentStroke);
    const segmentWidth = normalizeNumber(value.segmentWidth);
    if (stroke !== undefined && stroke !== null) out.stroke = stroke;
    if (lineWidth !== undefined && lineWidth !== null) out.lineWidth = lineWidth;
    if (segments !== undefined && segments !== null) out.segments = segments;
    if (centerRadius !== undefined && centerRadius !== null) out.centerRadius = centerRadius;
    if (glow !== undefined && glow !== null) out.glow = glow;
    if (rindStroke !== undefined && rindStroke !== null) out.rindStroke = rindStroke;
    if (segmentStroke !== undefined && segmentStroke !== null) out.segmentStroke = segmentStroke;
    if (segmentWidth !== undefined && segmentWidth !== null) out.segmentWidth = segmentWidth;
  } else if (type === "cobblestone") {
    const base = normalizeString(value.base);
    const highlight = normalizeString(value.highlight);
    const stroke = normalizeString(value.stroke);
    const glow = normalizeString(value.glow);
    const lineWidth = normalizeNumber(value.lineWidth);
    const stoneSize = normalizeNumber(value.stoneSize);
    const gap = normalizeNumber(value.gap);
    if (base !== undefined && base !== null) out.base = base;
    if (highlight !== undefined && highlight !== null) out.highlight = highlight;
    if (stroke !== undefined && stroke !== null) out.stroke = stroke;
    if (glow !== undefined && glow !== null) out.glow = glow;
    if (lineWidth !== undefined && lineWidth !== null) out.lineWidth = lineWidth;
    if (stoneSize !== undefined && stoneSize !== null) out.stoneSize = stoneSize;
    if (gap !== undefined && gap !== null) out.gap = gap;
  }
  return out;
}

function normalizeAnimation(value, errors, path) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    errors.push({ path, message: "animation_invalid" });
    return undefined;
  }
  const type = normalizeString(value.type);
  if (!type || !ANIMATION_TYPES.has(type)) {
    errors.push({ path: `${path}.type`, message: "animation_type_invalid" });
    return undefined;
  }
  const out = { type };
  const speed = normalizeNumber(value.speed);
  if (speed !== undefined && speed !== null) out.speed = speed;
  if (type === "lava") {
    const palette = normalizePalette(value.palette, errors, `${path}.palette`, ["base", "ember", "molten", "flare"]);
    const layers = normalizeNumber(value.layers);
    const smoothness = normalizeNumber(value.smoothness);
    const fallback = normalizeString(value.fallback);
    if (palette !== undefined && palette !== null) out.palette = palette;
    if (layers !== undefined && layers !== null) out.layers = layers;
    if (smoothness !== undefined && smoothness !== null) out.smoothness = smoothness;
    if (fallback !== undefined && fallback !== null) out.fallback = fallback;
  } else if (type === "cape_flow") {
    const palette = normalizePalette(value.palette, errors, `${path}.palette`, [
      "base",
      "ash",
      "ember",
      "molten",
      "flare"
    ]);
    const bands = normalizeNumber(value.bands);
    const embers = normalizeNumber(value.embers);
    if (palette !== undefined && palette !== null) out.palette = palette;
    if (bands !== undefined && bands !== null) out.bands = bands;
    if (embers !== undefined && embers !== null) out.embers = embers;
  }
  return out;
}

function normalizeStyle(value, errors, path) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    errors.push({ path, message: "style_invalid" });
    return undefined;
  }
  const out = {};
  const fill = normalizeString(value.fill);
  const core = normalizeString(value.core);
  const rim = normalizeString(value.rim);
  const glow = normalizeString(value.glow);
  if (fill !== undefined && fill !== null) out.fill = fill;
  if (core !== undefined && core !== null) out.core = core;
  if (rim !== undefined && rim !== null) out.rim = rim;
  if (glow !== undefined && glow !== null) out.glow = glow;
  if ("pattern" in value) {
    const pattern = normalizePattern(value.pattern, errors, `${path}.pattern`);
    if (pattern !== undefined) out.pattern = pattern;
  }
  if ("animation" in value) {
    const animation = normalizeAnimation(value.animation, errors, `${path}.animation`);
    if (animation !== undefined) out.animation = animation;
  }
  return Object.keys(out).length ? out : null;
}

function normalizeIconOverride(value, errors, path) {
  if (!isPlainObject(value)) {
    errors.push({ path, message: "icon_override_invalid" });
    return undefined;
  }
  const out = {};
  if ("name" in value) {
    const name = normalizeString(value.name);
    if (name === undefined) {
      errors.push({ path: `${path}.name`, message: "name_invalid" });
    } else if (name !== null) {
      out.name = name;
    }
  }
  if ("imageSrc" in value) {
    const imageSrc = normalizeString(value.imageSrc);
    if (imageSrc === undefined) {
      errors.push({ path: `${path}.imageSrc`, message: "image_src_invalid" });
    } else {
      out.imageSrc = imageSrc;
    }
  }
  if ("unlock" in value) {
    if (value.unlock === null) {
      out.unlock = null;
    } else if (!isPlainObject(value.unlock)) {
      errors.push({ path: `${path}.unlock`, message: "unlock_invalid" });
    } else {
      const rawUnlock = value.unlock;
      const prepared = {
        ...rawUnlock,
        minScore: rawUnlock.minScore !== undefined ? Number(rawUnlock.minScore) : rawUnlock.minScore,
        cost: rawUnlock.cost !== undefined ? Number(rawUnlock.cost) : rawUnlock.cost
      };
      out.unlock = normalizeUnlock(prepared);
    }
  }
  if ("style" in value) {
    const style = normalizeStyle(value.style, errors, `${path}.style`);
    if (style !== undefined) out.style = style;
  }
  return Object.keys(out).length ? out : null;
}

function normalizeIconStyleOverrides(payload) {
  const errors = [];
  const source = payload?.overrides ?? payload?.iconStyles?.overrides ?? payload;
  if (source === undefined || source === null) {
    return { ok: true, overrides: {}, errors };
  }
  if (!isPlainObject(source)) {
    return { ok: false, overrides: {}, errors: [{ path: "overrides", message: "overrides_invalid" }] };
  }
  const overrides = {};
  Object.entries(source).forEach(([rawId, value]) => {
    const id = normalizeString(rawId);
    if (!id) {
      errors.push({ path: "overrides", message: "id_invalid" });
      return;
    }
    const normalized = normalizeIconOverride(value, errors, `overrides.${id}`);
    if (normalized) overrides[id] = normalized;
  });
  return { ok: errors.length === 0, overrides, errors };
}

function mergeIconStyles(baseStyle = {}, overrideStyle) {
  if (overrideStyle === null) return null;
  if (!overrideStyle || typeof overrideStyle !== "object") return baseStyle || {};
  const merged = { ...(baseStyle || {}), ...overrideStyle };
  if ("pattern" in overrideStyle) {
    if (overrideStyle.pattern === null) {
      delete merged.pattern;
    } else if (overrideStyle.pattern && typeof overrideStyle.pattern === "object") {
      merged.pattern = { ...(baseStyle?.pattern || {}), ...overrideStyle.pattern };
    }
  }
  if ("animation" in overrideStyle) {
    if (overrideStyle.animation === null) {
      delete merged.animation;
    } else if (overrideStyle.animation && typeof overrideStyle.animation === "object") {
      merged.animation = { ...(baseStyle?.animation || {}), ...overrideStyle.animation };
    }
  }
  return merged;
}

function applyIconStyleOverrides({ icons = [], overrides = {} } = {}) {
  const base = normalizePlayerIcons(icons);
  const output = [];
  const known = new Set();
  base.forEach((icon) => {
    const override = overrides?.[icon.id];
    if (override) {
      const merged = {
        ...icon,
        ...override,
        style: mergeIconStyles(icon.style, override.style),
        unlock: override.unlock === null ? normalizeUnlock({ type: "free" }) : (override.unlock || icon.unlock)
      };
      output.push(merged);
    } else {
      output.push({ ...icon });
    }
    known.add(icon.id);
  });

  Object.entries(overrides || {}).forEach(([id, override]) => {
    if (known.has(id) || !override) return;
    const created = {
      id,
      name: override.name || id,
      unlock: override.unlock === null ? normalizeUnlock({ type: "free" }) : (override.unlock || normalizeUnlock()),
      imageSrc: override.imageSrc || undefined,
      style: mergeIconStyles({}, override.style)
    };
    output.push(created);
  });

  return normalizePlayerIcons(output);
}

module.exports = {
  PATTERN_TYPES,
  ANIMATION_TYPES,
  normalizeIconStyleOverrides,
  applyIconStyleOverrides
};
