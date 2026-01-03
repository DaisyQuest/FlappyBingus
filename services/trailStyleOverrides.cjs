"use strict";

const ALLOWED_SHAPES = new Set([
  "circle",
  "star",
  "heart",
  "hexagon",
  "pixel",
  "lemon_slice",
  "petal",
  "leaf"
]);

const ALLOWED_EXTRA_MODES = new Set(["trail", "sparkle", "glint", "aura"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeRange(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const min = normalizeNumber(value[0]);
  const max = normalizeNumber(value[1]);
  if (min === null || max === null) return null;
  return [min, max];
}

function normalizeBoolean(value) {
  return value === true || value === false ? value : null;
}

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeColor(value, errors, path) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const colors = value.map((entry) => normalizeString(entry)).filter(Boolean);
    if (!colors.length) {
      errors.push({ path, message: "color_palette_empty" });
      return null;
    }
    if (colors.length !== value.length) {
      errors.push({ path, message: "color_palette_invalid_entries" });
      return null;
    }
    return colors;
  }
  errors.push({ path, message: "color_invalid" });
  return null;
}

function normalizeShape(value, errors, path) {
  const shape = normalizeString(value);
  if (!shape) return null;
  if (!ALLOWED_SHAPES.has(shape)) {
    errors.push({ path, message: "shape_invalid" });
    return null;
  }
  return shape;
}

function normalizeHexStyle(value, errors, path) {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) {
    errors.push({ path, message: "hex_style_invalid" });
    return null;
  }
  const stroke = normalizeString(value.stroke);
  const fill = normalizeString(value.fill);
  const lineWidth = normalizeNumber(value.lineWidth);
  const out = {};
  if (stroke) out.stroke = stroke;
  if (fill) out.fill = fill;
  if (lineWidth !== null) out.lineWidth = lineWidth;
  return Object.keys(out).length ? out : null;
}

function normalizeSliceStyle(value, errors, path) {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) {
    errors.push({ path, message: "slice_style_invalid" });
    return null;
  }
  const out = {};
  const rind = normalizeString(value.rind);
  const pith = normalizeString(value.pith);
  const segment = normalizeString(value.segment);
  const segments = normalizeNumber(value.segments);
  const segmentGap = normalizeNumber(value.segmentGap);
  if (rind) out.rind = rind;
  if (pith) out.pith = pith;
  if (segment) out.segment = segment;
  if (segments !== null) out.segments = segments;
  if (segmentGap !== null) out.segmentGap = segmentGap;
  return Object.keys(out).length ? out : null;
}

function normalizeBanding(value, errors, path) {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) {
    errors.push({ path, message: "banding_invalid" });
    return null;
  }
  const out = {};
  const count = normalizeNumber(value.count);
  const spreadScale = normalizeNumber(value.spreadScale);
  const jitterScale = normalizeNumber(value.jitterScale);
  if (count !== null) out.count = count;
  if (spreadScale !== null) out.spreadScale = spreadScale;
  if (jitterScale !== null) out.jitterScale = jitterScale;
  return Object.keys(out).length ? out : null;
}

function normalizeParticleGroup(value, errors, path, { allowMode = false } = {}) {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) {
    errors.push({ path, message: "group_invalid" });
    return null;
  }

  const out = {};
  if (allowMode) {
    const mode = normalizeString(value.mode);
    if (!mode || !ALLOWED_EXTRA_MODES.has(mode)) {
      errors.push({ path: `${path}.mode`, message: "mode_invalid" });
      return null;
    }
    out.mode = mode;
  }

  const numberFields = [
    "rate",
    "drag",
    "jitterScale",
    "hueRate",
    "lifeScale",
    "distanceScale",
    "sizeScale"
  ];
  numberFields.forEach((key) => {
    const num = normalizeNumber(value[key]);
    if (num !== null) out[key] = num;
  });

  const rangeFields = ["life", "size", "speed", "orbit"];
  rangeFields.forEach((key) => {
    if (value[key] === undefined) return;
    const range = normalizeRange(value[key]);
    if (!range) {
      errors.push({ path: `${path}.${key}`, message: "range_invalid" });
      return;
    }
    out[key] = range;
  });

  const add = normalizeBoolean(value.add);
  if (add !== null) out.add = add;
  const twinkle = normalizeBoolean(value.twinkle);
  if (twinkle !== null) out.twinkle = twinkle;

  const shape = normalizeShape(value.particleShape, errors, `${path}.particleShape`);
  if (shape) out.particleShape = shape;

  const color = normalizeColor(value.color, errors, `${path}.color`);
  if (color) out.color = color;

  const hexStyle = normalizeHexStyle(value.hexStyle, errors, `${path}.hexStyle`);
  if (hexStyle) out.hexStyle = hexStyle;

  const sliceStyle = normalizeSliceStyle(value.sliceStyle, errors, `${path}.sliceStyle`);
  if (sliceStyle) out.sliceStyle = sliceStyle;

  return Object.keys(out).length ? out : null;
}

function normalizeTrailStyleOverride(value, errors, path) {
  if (!isPlainObject(value)) {
    errors.push({ path, message: "trail_style_invalid" });
    return null;
  }

  const out = normalizeParticleGroup(value, errors, path) || {};

  const banding = normalizeBanding(value.banding, errors, `${path}.banding`);
  if (banding) out.banding = banding;

  const sparkle = normalizeParticleGroup(value.sparkle, errors, `${path}.sparkle`);
  if (sparkle) out.sparkle = sparkle;
  const glint = normalizeParticleGroup(value.glint, errors, `${path}.glint`);
  if (glint) out.glint = glint;
  const aura = normalizeParticleGroup(value.aura, errors, `${path}.aura`);
  if (aura) out.aura = aura;

  if (value.extras !== undefined) {
    if (!Array.isArray(value.extras)) {
      errors.push({ path: `${path}.extras`, message: "extras_invalid" });
    } else {
      const extras = value.extras
        .map((entry, idx) => normalizeParticleGroup(entry, errors, `${path}.extras[${idx}]`, { allowMode: true }))
        .filter(Boolean);
      if (extras.length) out.extras = extras;
    }
  }

  return Object.keys(out).length ? out : null;
}

function normalizeTrailStyleOverrides(payload) {
  const errors = [];
  const source = payload?.overrides ?? payload?.trailStyles?.overrides ?? payload;
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
    const normalized = normalizeTrailStyleOverride(value, errors, `overrides.${id}`);
    if (normalized) overrides[id] = normalized;
  });

  return { ok: errors.length === 0, overrides, errors };
}

module.exports = {
  ALLOWED_SHAPES,
  ALLOWED_EXTRA_MODES,
  normalizeTrailStyleOverrides
};
