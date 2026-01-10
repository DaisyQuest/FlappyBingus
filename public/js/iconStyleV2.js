// =====================
// FILE: public/js/iconStyleV2.js
// Icon style v2 model helpers, validation, and migrations.
// =====================

const DEFAULT_STYLE_SIZE = 96;
const DEFAULT_FILL = "#ff8c1a";
const DEFAULT_CORE = "#ffc285";
const DEFAULT_RIM = "#0f172a";
const DEFAULT_GLOW = "rgba(255, 200, 120, 0.75)";

const DEFAULT_STYLE_V2 = Object.freeze({
  version: 2,
  size: DEFAULT_STYLE_SIZE,
  circle: {
    radiusRatio: 0.5,
    maskMode: "hard",
    edgeFeatherPx: 0
  },
  palette: {
    fill: DEFAULT_FILL,
    core: DEFAULT_CORE,
    rim: DEFAULT_RIM,
    glow: DEFAULT_GLOW,
    accent: "#ffffff"
  },
  stroke: {
    width: 6,
    color: DEFAULT_RIM,
    alpha: 1
  },
  shadow: {
    enabled: true,
    blur: 10,
    spread: 0,
    color: DEFAULT_GLOW,
    alpha: 0.7,
    offsetX: 0,
    offsetY: 0
  },
  pattern: {
    type: "",
    scale: 1,
    rotationDeg: 0,
    alpha: 1,
    radialBias: 0,
    centerOffset: { x: 0, y: 0 },
    blendMode: "normal"
  },
  texture: {
    type: "none",
    intensity: 0,
    scale: 1,
    offset: { x: 0, y: 0 }
  },
  effects: [],
  animations: []
});

const PATTERN_TYPES = Object.freeze([
  "",
  "zigzag",
  "centerline",
  "stripes",
  "honeycomb",
  "citrus_slice",
  "cobblestone",
  "checker",
  "polkaDots",
  "chevrons",
  "diagonalHatch",
  "radialBurst",
  "topographic",
  "stars",
  "flames",
  "circuit",
  "waves",
  "concentricRings",
  "spiral",
  "sunburst",
  "radialStripes",
  "radialChevrons",
  "cellular",
  "fracture"
]);

const EFFECT_TYPES = Object.freeze([
  "outline",
  "innerGlow",
  "dropShadow",
  "vignette",
  "noiseOverlay",
  "gradientFill",
  "rimOrbitLight",
  "shimmerSweep",
  "radialRipple",
  "centerFlash",
  "sparkBloom",
  "shockRing",
  "hitFlash"
]);

const ANIMATION_TYPES = Object.freeze([
  "pulseUniform",
  "slowSpin",
  "breathingGlow",
  "rimOrbitLight",
  "shimmerSweep",
  "colorShift",
  "patternScroll",
  "patternRotate",
  "grainDrift",
  "scanlineDrift",
  "heartbeat",
  "tickPulse",
  "radialRipple",
  "centerFlash",
  "sparkBloom",
  "shockRing",
  "hitFlash",
  "legacy_lava",
  "legacy_cape_flow",
  "legacy_zigzag_scroll"
]);

const BLEND_MODES = Object.freeze([
  "normal",
  "screen",
  "multiply",
  "overlay",
  "softLight",
  "hardLight"
]);

const TEXTURE_TYPES = Object.freeze([
  "none",
  "noise",
  "grain",
  "paper",
  "metal",
  "scanlines"
]);

const TIMING_MODES = Object.freeze(["loop", "pingpong", "once"]);

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(target, source) {
  if (!isObject(source)) return target;
  const out = { ...(target || {}) };
  Object.entries(source).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      out[key] = value.map((entry) => (isObject(entry) ? deepMerge({}, entry) : entry));
    } else if (isObject(value)) {
      out[key] = deepMerge(isObject(out[key]) ? out[key] : {}, value);
    } else if (value !== undefined) {
      out[key] = value;
    }
  });
  return out;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return value;
  return Math.min(max, Math.max(min, value));
}

function normalizeColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function isValidColor(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed === "transparent") return true;
  if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return true;
  if (/^rgba?\(/i.test(trimmed)) return true;
  if (/^hsla?\(/i.test(trimmed)) return true;
  if (/^var\(--/.test(trimmed)) return true;
  return false;
}

function isStyleV2(style) {
  return Boolean(style && typeof style === "object" && (style.version === 2 || style.palette || style.circle));
}

function createDefaultIconStyleV2(overrides = {}) {
  const base = structuredClone ? structuredClone(DEFAULT_STYLE_V2) : JSON.parse(JSON.stringify(DEFAULT_STYLE_V2));
  return deepMerge(base, overrides);
}

function migrateLegacyStyleToV2(legacyStyle = {}) {
  const palette = {
    fill: normalizeColor(legacyStyle.fill, DEFAULT_FILL),
    core: normalizeColor(legacyStyle.core, normalizeColor(legacyStyle.fill, DEFAULT_CORE)),
    rim: normalizeColor(legacyStyle.rim, DEFAULT_RIM),
    glow: normalizeColor(legacyStyle.glow, DEFAULT_GLOW),
    accent: normalizeColor(legacyStyle.accent, "#ffffff")
  };
  const pattern = legacyStyle.pattern
    ? {
      type: legacyStyle.pattern?.type || "",
      scale: 1,
      rotationDeg: 0,
      alpha: 1,
      radialBias: 0,
      centerOffset: { x: 0, y: 0 },
      blendMode: "normal",
      ...legacyStyle.pattern
    }
    : { ...DEFAULT_STYLE_V2.pattern };
  return createDefaultIconStyleV2({
    palette,
    pattern,
    legacyAnimation: legacyStyle.animation || null
  });
}

function resolveIconStyleV2(icon = {}) {
  const style = icon?.style || icon?.styleV2 || {};
  if (isStyleV2(style)) {
    return createDefaultIconStyleV2(style);
  }
  return migrateLegacyStyleToV2(style);
}

function mergeIconStylePatch(base, patch) {
  if (!patch) return base;
  return deepMerge(base, patch);
}

function validateIconStyleV2(style = {}) {
  const errors = [];
  const safe = isStyleV2(style) ? style : migrateLegacyStyleToV2(style);

  if (safe.circle?.radiusRatio !== 0.5) {
    errors.push({ path: "circle.radiusRatio", message: "circle_radius_ratio_locked" });
  }
  const edgeFeather = safe.circle?.edgeFeatherPx;
  if (Number.isFinite(edgeFeather) && (edgeFeather < 0 || edgeFeather > 4)) {
    errors.push({ path: "circle.edgeFeatherPx", message: "edge_feather_out_of_range" });
  }

  const palette = safe.palette || {};
  ["fill", "core", "rim", "glow", "accent"].forEach((key) => {
    if (palette[key] && !isValidColor(palette[key])) {
      errors.push({ path: `palette.${key}`, message: "invalid_color" });
    }
  });

  if (safe.stroke) {
    if (Number.isFinite(safe.stroke.width) && (safe.stroke.width < 0 || safe.stroke.width > 24)) {
      errors.push({ path: "stroke.width", message: "stroke_width_out_of_range" });
    }
    if (safe.stroke.color && !isValidColor(safe.stroke.color)) {
      errors.push({ path: "stroke.color", message: "invalid_color" });
    }
    if (Number.isFinite(safe.stroke.alpha) && (safe.stroke.alpha < 0 || safe.stroke.alpha > 1)) {
      errors.push({ path: "stroke.alpha", message: "stroke_alpha_out_of_range" });
    }
  }

  if (safe.shadow) {
    if (safe.shadow.color && !isValidColor(safe.shadow.color)) {
      errors.push({ path: "shadow.color", message: "invalid_color" });
    }
    ["blur", "spread"].forEach((key) => {
      if (Number.isFinite(safe.shadow[key]) && safe.shadow[key] < 0) {
        errors.push({ path: `shadow.${key}`, message: "shadow_range" });
      }
    });
    if (Number.isFinite(safe.shadow.alpha) && (safe.shadow.alpha < 0 || safe.shadow.alpha > 1)) {
      errors.push({ path: "shadow.alpha", message: "shadow_alpha_out_of_range" });
    }
  }

  if (safe.pattern) {
    if (!PATTERN_TYPES.includes(safe.pattern.type ?? "")) {
      errors.push({ path: "pattern.type", message: "invalid_pattern_type" });
    }
    if (Number.isFinite(safe.pattern.scale) && (safe.pattern.scale < 0.2 || safe.pattern.scale > 6)) {
      errors.push({ path: "pattern.scale", message: "pattern_scale_out_of_range" });
    }
    if (Number.isFinite(safe.pattern.rotationDeg) && (safe.pattern.rotationDeg < -720 || safe.pattern.rotationDeg > 720)) {
      errors.push({ path: "pattern.rotationDeg", message: "pattern_rotation_out_of_range" });
    }
    if (Number.isFinite(safe.pattern.alpha) && (safe.pattern.alpha < 0 || safe.pattern.alpha > 1)) {
      errors.push({ path: "pattern.alpha", message: "pattern_alpha_out_of_range" });
    }
    if (Number.isFinite(safe.pattern.radialBias) && (safe.pattern.radialBias < -1 || safe.pattern.radialBias > 1)) {
      errors.push({ path: "pattern.radialBias", message: "pattern_radial_bias_out_of_range" });
    }
    if (safe.pattern.centerOffset) {
      const { x, y } = safe.pattern.centerOffset;
      if (Number.isFinite(x) && (x < -0.5 || x > 0.5)) errors.push({ path: "pattern.centerOffset.x", message: "center_offset_out_of_range" });
      if (Number.isFinite(y) && (y < -0.5 || y > 0.5)) errors.push({ path: "pattern.centerOffset.y", message: "center_offset_out_of_range" });
    }
    if (safe.pattern.primaryColor && !isValidColor(safe.pattern.primaryColor)) {
      errors.push({ path: "pattern.primaryColor", message: "invalid_color" });
    }
    if (safe.pattern.secondaryColor && !isValidColor(safe.pattern.secondaryColor)) {
      errors.push({ path: "pattern.secondaryColor", message: "invalid_color" });
    }
    if (safe.pattern.blendMode && !BLEND_MODES.includes(safe.pattern.blendMode)) {
      errors.push({ path: "pattern.blendMode", message: "invalid_blend_mode" });
    }
  }

  if (safe.texture) {
    if (!TEXTURE_TYPES.includes(safe.texture.type || "none")) {
      errors.push({ path: "texture.type", message: "invalid_texture_type" });
    }
    if (Number.isFinite(safe.texture.intensity) && (safe.texture.intensity < 0 || safe.texture.intensity > 1)) {
      errors.push({ path: "texture.intensity", message: "texture_intensity_out_of_range" });
    }
    if (Number.isFinite(safe.texture.scale) && (safe.texture.scale < 0.2 || safe.texture.scale > 6)) {
      errors.push({ path: "texture.scale", message: "texture_scale_out_of_range" });
    }
  }

  if (Array.isArray(safe.effects)) {
    safe.effects.forEach((effect, index) => {
      if (!EFFECT_TYPES.includes(effect?.type)) {
        errors.push({ path: `effects[${index}].type`, message: "invalid_effect_type" });
      }
      if (effect?.params?.color && !isValidColor(effect.params.color)) {
        errors.push({ path: `effects[${index}].params.color`, message: "invalid_color" });
      }
      if (effect?.params?.secondaryColor && !isValidColor(effect.params.secondaryColor)) {
        errors.push({ path: `effects[${index}].params.secondaryColor`, message: "invalid_color" });
      }
    });
  }

  if (Array.isArray(safe.animations)) {
    safe.animations.forEach((anim, index) => {
      if (!ANIMATION_TYPES.includes(anim?.type)) {
        errors.push({ path: `animations[${index}].type`, message: "invalid_animation_type" });
      }
      if (anim?.timing?.mode && !TIMING_MODES.includes(anim.timing.mode)) {
        errors.push({ path: `animations[${index}].timing.mode`, message: "invalid_timing_mode" });
      }
      if (typeof anim?.target === "string") {
        const ok = /^palette\.|^shadow\.|^stroke\.|^pattern\.|^texture\.|^effects\[\d+\]\.params\.|^preview\.scale/.test(anim.target);
        if (!ok) {
          errors.push({ path: `animations[${index}].target`, message: "invalid_target" });
        }
      }
      if (anim?.triggeredBy !== undefined && typeof anim.triggeredBy !== "string") {
        errors.push({ path: `animations[${index}].triggeredBy`, message: "invalid_triggered_by" });
      }
      if (Number.isFinite(anim?.timing?.durationMs) && anim.timing.durationMs <= 0) {
        errors.push({ path: `animations[${index}].timing.durationMs`, message: "duration_out_of_range" });
      }
    });
  }

  return { ok: errors.length === 0, errors, style: safe };
}

export {
  DEFAULT_STYLE_V2,
  DEFAULT_STYLE_SIZE,
  PATTERN_TYPES,
  EFFECT_TYPES,
  ANIMATION_TYPES,
  TEXTURE_TYPES,
  BLEND_MODES,
  createDefaultIconStyleV2,
  isStyleV2,
  migrateLegacyStyleToV2,
  resolveIconStyleV2,
  mergeIconStylePatch,
  validateIconStyleV2
};
