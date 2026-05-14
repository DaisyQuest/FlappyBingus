import {
  ANIMATION_TYPES,
  EFFECT_TYPES,
  PATTERN_TYPES,
  createDefaultIconStyleV2,
  resolveIconStyleV2,
  validateIconStyleV2
} from "../../js/iconStyleV2.js";
import { ICON_PRESETS, applyPresetPatch } from "./presets.js";

const UNLOCK_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "score", label: "Score" },
  { value: "achievement", label: "Achievement" },
  { value: "purchase", label: "Purchase" },
  { value: "record", label: "Record holder" }
];

const PATTERN_LABELS = PATTERN_TYPES.map((value) => ({
  value,
  label: value ? value.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()) : "None"
}));

const EFFECT_LABELS = EFFECT_TYPES.map((value) => ({
  value,
  label: value.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
}));

const ANIMATION_LABELS = ANIMATION_TYPES.map((value) => ({
  value,
  label: value.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
}));

const ANIMATION_TYPE_OPTIONS = [
  { value: "", label: "None" },
  ...ANIMATION_LABELS
];

const TIMING_MODES = [
  { value: "loop", label: "Loop" },
  { value: "pingpong", label: "Pingpong" },
  { value: "once", label: "Once" }
];

const EASING_OPTIONS = [
  { value: "linear", label: "Linear" },
  { value: "easeIn", label: "Ease In" },
  { value: "easeOut", label: "Ease Out" },
  { value: "easeInOut", label: "Ease In Out" },
  { value: "smoothStep", label: "Smooth Step" }
];

const ANIMATION_TRIGGER_SLOTS = [
  { key: "idle", label: "Idle", eventType: "", description: "Looping idle animation (optional)." },
  { key: "hit", label: "Hit", eventType: "hit", description: "Plays when the player is hit." },
  { key: "orbPickup", label: "Orb Pickup", eventType: "anim:orbPickup", description: "Plays on orb pickups." },
  { key: "perfectGap", label: "Perfect Gap", eventType: "anim:perfectGap", description: "Plays on perfect gap scoring." },
  { key: "dash", label: "Dash", eventType: "anim:dash", description: "Plays when the dash skill activates." },
  { key: "phase", label: "Phase", eventType: "anim:phase", description: "Plays when the phase skill activates." },
  { key: "teleport", label: "Teleport", eventType: "anim:teleport", description: "Plays on teleport activation." },
  { key: "explode", label: "Explode", eventType: "anim:explode", description: "Plays on exploding teleport activation." },
  { key: "tap", label: "Tap", eventType: "tap", description: "Plays on player tap events." },
  { key: "score", label: "Score", eventType: "score", description: "Plays on score ticks." }
];

const TARGET_SUGGESTIONS = [
  "palette.fill",
  "palette.core",
  "palette.rim",
  "palette.glow",
  "palette.accent",
  "pattern.rotationDeg",
  "pattern.centerOffset",
  "pattern.alpha",
  "shadow.blur",
  "stroke.width",
  "texture.offset",
  "effects[0].params.progress",
  "preview.scale"
];

const ANIMATION_LABEL_BY_TYPE = new Map(ANIMATION_LABELS.map((entry) => [entry.value, entry.label]));

const ANIMATION_TARGET_GUIDANCE = [
  {
    match: /^pattern\.centerOffset$/,
    types: ["patternScroll"],
    description: "Pattern Scroll moves the pattern center.",
    restrictTargets: true,
    strict: true
  },
  {
    match: /^pattern\.rotationDeg$/,
    types: ["patternRotate", "slowSpin"],
    description: "Pattern Rotate or Slow Spin keeps rotation consistent.",
    restrictTargets: true,
    strict: true
  },
  {
    match: /^texture\.offset$/,
    types: ["grainDrift", "scanlineDrift"],
    description: "Texture drift animations move texture offsets.",
    restrictTargets: true,
    strict: true
  },
  {
    match: /^effects\[\d+\]\.params\.progress$/,
    types: ["rimOrbitLight", "shimmerSweep", "radialRipple", "centerFlash", "sparkBloom", "shockRing", "hitFlash"],
    description: "Sweep or event animations drive effect progress.",
    restrictTargets: true,
    strict: true
  },
  {
    match: /^preview\.scale$/,
    types: ["pulseUniform", "heartbeat", "tickPulse"],
    description: "Pulse animations give preview scale a quick beat.",
    restrictTargets: false,
    strict: true
  }
];

let animationTargetListId = 0;

function isColorTarget(target) {
  if (!target) return false;
  const trimmed = target.trim();
  if (/^palette\./.test(trimmed)) return true;
  if (/^stroke\.color$/.test(trimmed)) return true;
  if (/^shadow\.color$/.test(trimmed)) return true;
  return /^pattern\.(primaryColor|secondaryColor|stroke|background|accent|glow|rindStroke|segmentStroke|base|highlight)$/.test(trimmed);
}

function createElement(tag, { className, text, attrs } = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  }
  return el;
}

function normalizeHexColor(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const shortMatch = trimmed.match(/^#([0-9a-f]{3})$/i);
  if (shortMatch) {
    return `#${shortMatch[1].split("").map((char) => char + char).join("")}`.toLowerCase();
  }
  const longMatch = trimmed.match(/^#([0-9a-f]{6})$/i);
  if (longMatch) {
    return `#${longMatch[1]}`.toLowerCase();
  }
  return null;
}

function buildAnimationHint(types, description) {
  const list = types.map((type) => ANIMATION_LABEL_BY_TYPE.get(type) || type).join(", ");
  return `Compatible: ${list}.${description ? ` ${description}` : ""}`;
}

function resolveAnimationGuidance(target) {
  if (!target) return null;
  const trimmed = target.trim();
  const explicit = ANIMATION_TARGET_GUIDANCE.find((rule) => rule.match.test(trimmed));
  if (explicit) return explicit;
  if (isColorTarget(trimmed)) {
    return {
      types: ["colorShift"],
      description: "Color Shift is the only color-safe animation.",
      strict: true
    };
  }
  return null;
}

function resolveTargetsForAnimation(type) {
  if (!type) return null;
  if (type === "colorShift") {
    const colorTargets = TARGET_SUGGESTIONS.filter((target) => isColorTarget(target));
    return colorTargets.length ? colorTargets : null;
  }
  const rules = ANIMATION_TARGET_GUIDANCE.filter((rule) => rule.types.includes(type) && rule.restrictTargets);
  if (!rules.length) return null;
  const filtered = TARGET_SUGGESTIONS.filter((target) => rules.some((rule) => rule.match.test(target)));
  return filtered.length ? filtered : null;
}

function updateAnimationGuidance({ targetInput, typeSelect, hintEl }) {
  const guidance = resolveAnimationGuidance(targetInput.value);
  const options = Array.from(typeSelect.options);
  if (!guidance) {
    options.forEach((opt) => {
      opt.disabled = false;
    });
    hintEl.textContent = targetInput.value
      ? "Most numeric animations work best on alpha, scale, blur, or width targets."
      : "Choose a target to see compatible animations.";
    return;
  }

  const allowed = new Set(guidance.types);
  options.forEach((opt) => {
    opt.disabled = guidance.strict && !allowed.has(opt.value);
  });
  if (guidance.strict && typeSelect.value && !allowed.has(typeSelect.value)) {
    typeSelect.value = guidance.types[0];
  }
  hintEl.textContent = buildAnimationHint(guidance.types, guidance.description);
}

function updateAnimationTargets({ typeSelect, targetList }) {
  if (!targetList) return;
  const targets = resolveTargetsForAnimation(typeSelect.value) || TARGET_SUGGESTIONS;
  targetList.replaceChildren();
  targets.forEach((value) => {
    const option = createElement("option");
    option.value = value;
    targetList.appendChild(option);
  });
}

function createFieldRow(labelText, input, { hint, defaultValue, colorPicker } = {}) {
  const row = createElement("div", { className: "field-row" });
  const label = createElement("label", { text: labelText });
  let inputNode = input;
  if (colorPicker) {
    const wrap = createElement("div", { className: "color-field" });
    const picker = createElement("input", { className: "color-picker", attrs: { type: "color" } });
    const initialHex = normalizeHexColor(input.value);
    picker.value = initialHex || "#000000";
    picker.addEventListener("input", () => {
      input.value = picker.value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    input.addEventListener("input", () => {
      const nextHex = normalizeHexColor(input.value);
      if (nextHex) picker.value = nextHex;
    });
    wrap.append(input, picker);
    inputNode = wrap;
  }
  row.append(label, inputNode);
  if (defaultValue !== undefined) {
    const hintEl = createElement("small", { text: `Default: ${defaultValue}` });
    row.appendChild(hintEl);
  }
  if (hint) {
    const hintEl = createElement("small", { text: hint, className: "muted" });
    row.appendChild(hintEl);
  }
  return row;
}

function createTextInput(value = "") {
  const input = createElement("input", { attrs: { type: "text" } });
  input.value = value ?? "";
  return input;
}

function createNumberInput(value = "") {
  const input = createElement("input", { attrs: { type: "number", step: "any" } });
  input.value = value === null || value === undefined ? "" : String(value);
  return input;
}

function createCheckbox(value = false) {
  const input = createElement("input", { attrs: { type: "checkbox" } });
  input.checked = Boolean(value);
  return input;
}

function createSelect(options, value = "") {
  const select = createElement("select");
  options.forEach((opt) => {
    const option = createElement("option", { text: opt.label });
    option.value = opt.value;
    select.appendChild(option);
  });
  select.value = value ?? "";
  return select;
}

function createTextArea(value = "") {
  const input = createElement("textarea");
  input.value = value ?? "";
  input.rows = 4;
  return input;
}

function setPath(target, path, value) {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let ref = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!ref[key] || typeof ref[key] !== "object") {
      ref[key] = Number.isFinite(Number(parts[i + 1])) ? [] : {};
    }
    ref = ref[key];
  }
  ref[parts[parts.length - 1]] = value;
}

function reindexRows(list, rowAttr, fieldPrefix) {
  const rows = Array.from(list.querySelectorAll(`[${rowAttr}]`));
  rows.forEach((row, index) => {
    row.setAttribute(rowAttr, String(index));
    row.querySelectorAll("[data-field]").forEach((input) => {
      if (!input.dataset.field.startsWith(fieldPrefix)) return;
      const rest = input.dataset.field.split("].").slice(1).join("].");
      input.dataset.field = `${fieldPrefix}${index}].${rest}`;
    });
  });
}

function parseValue(input) {
  const type = input.dataset.type || input.type;
  if (type === "checkbox") return input.checked;
  if (type === "number") {
    if (input.value === "") return undefined;
    const num = Number(input.value);
    return Number.isFinite(num) ? num : undefined;
  }
  if (type === "json") {
    if (!input.value.trim()) return undefined;
    try {
      return JSON.parse(input.value);
    } catch {
      return { __jsonError: true, raw: input.value };
    }
  }
  const value = String(input.value ?? "").trim();
  return value.length ? value : undefined;
}

function buildPatternExtraFields(pattern = {}) {
  const grid = createElement("div", { className: "field-grid", attrs: { "data-pattern-extra": "true" } });
  const extras = [
    "stroke",
    "background",
    "amplitude",
    "waves",
    "spacing",
    "colors",
    "stripeWidth",
    "angle",
    "lineWidth",
    "cellSize",
    "segments",
    "centerRadius",
    "rindStroke",
    "segmentStroke",
    "segmentWidth",
    "base",
    "highlight",
    "stoneSize",
    "gap",
    "rays",
    "rings",
    "count",
    "lines",
    "stripes",
    "cells"
  ];
  extras.forEach((key) => {
    const isNumber = [
      "amplitude",
      "waves",
      "spacing",
      "stripeWidth",
      "angle",
      "lineWidth",
      "cellSize",
      "segments",
      "centerRadius",
      "segmentWidth",
      "stoneSize",
      "gap",
      "rays",
      "rings",
      "count",
      "lines",
      "stripes",
      "cells"
    ].includes(key);
    const isJson = key === "colors";
    const isColor = !isNumber && !isJson && /color|stroke|background|accent|glow|rind|segment|base|highlight/i.test(key);
    const input = isJson
      ? createTextArea(JSON.stringify(pattern[key] || [], null, 2))
      : (isNumber ? createNumberInput(pattern[key]) : createTextInput(pattern[key] ?? ""));
    input.dataset.field = `style.pattern.${key}`;
    input.dataset.type = isNumber ? "number" : (isJson ? "json" : "text");
    grid.appendChild(createFieldRow(`Pattern ${key}`, input, { colorPicker: isColor }));
  });
  return grid;
}

function createTabBar(tabs) {
  const bar = createElement("div", { className: "tab-bar" });
  tabs.forEach((tab) => {
    const button = createElement("button", { className: "tab-button", text: tab.label, attrs: { type: "button", "data-tab": tab.id } });
    if (tab.active) button.classList.add("active");
    bar.appendChild(button);
  });
  return bar;
}

function activateTab(card, tabId) {
  card.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.tabPanel !== tabId);
  });
  card.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
}

function createEffectRow(effect = {}, index = 0) {
  const row = createElement("div", { className: "effect-row", attrs: { "data-effect-row": String(index) } });
  const header = createElement("div", { className: "effect-row-header" });
  const typeSelect = createSelect(EFFECT_LABELS, effect.type || "outline");
  typeSelect.dataset.field = `style.effects[${index}].type`;
  const enabled = createCheckbox(effect.enabled !== false);
  enabled.dataset.field = `style.effects[${index}].enabled`;
  const params = createTextArea(JSON.stringify(effect.params || {}, null, 2));
  params.dataset.field = `style.effects[${index}].params`;
  params.dataset.type = "json";
  const actions = createElement("div", { className: "row-actions" });
  const moveUp = createElement("button", { text: "↑", attrs: { type: "button", "data-move": "up" } });
  const moveDown = createElement("button", { text: "↓", attrs: { type: "button", "data-move": "down" } });
  const remove = createElement("button", { text: "Remove", attrs: { type: "button", "data-remove": "true" } });
  actions.append(moveUp, moveDown, remove);
  header.append(typeSelect, enabled, createElement("span", { text: "Enabled" }), actions);
  row.append(header, createFieldRow("Params (JSON)", params));
  return row;
}

function buildAnimationTriggerMap(animations = []) {
  const map = new Map();
  if (!Array.isArray(animations)) return map;
  animations.forEach((anim) => {
    if (!anim) return;
    const trigger = typeof anim.triggeredBy === "string" ? anim.triggeredBy : "";
    if (!map.has(trigger)) map.set(trigger, anim);
  });
  return map;
}

function setAnimationSlotDisabled(slot, disabled) {
  slot.classList.toggle("is-disabled", disabled);
  slot.querySelectorAll("[data-anim-field]").forEach((input) => {
    if (input.dataset.animField === "type") return;
    input.disabled = disabled;
  });
}

function createAnimationSlot(trigger, animation = {}) {
  const slot = createElement("section", {
    className: "animation-slot",
    attrs: {
      "data-animation-slot": "true",
      "data-animation-trigger": trigger.eventType,
      "data-animation-label": trigger.label
    }
  });
  const header = createElement("div", { className: "animation-slot-header" });
  const title = createElement("div");
  title.append(
    createElement("strong", { text: trigger.label }),
    createElement("small", { text: trigger.description, className: "muted" })
  );
  const previewBtn = createElement("button", {
    text: "Preview",
    attrs: { type: "button", "data-preview-trigger": trigger.eventType, "data-preview-label": trigger.label }
  });
  header.append(title, previewBtn);

  const body = createElement("div", { className: "animation-slot-body" });
  const idInput = createTextInput(animation.id || "");
  idInput.dataset.animField = "id";

  const typeSelect = createSelect(ANIMATION_TYPE_OPTIONS, animation.type || "");
  typeSelect.dataset.animField = "type";

  const enabled = createCheckbox(animation.enabled !== false);
  enabled.dataset.animField = "enabled";

  const target = createTextInput(animation.target || "");
  target.dataset.animField = "target";
  const targetListId = `iconAnimationTargets-${animationTargetListId++}`;
  target.setAttribute("list", targetListId);
  const targetList = createElement("datalist", { attrs: { id: targetListId } });

  const targetRow = createFieldRow("Target", target, { hint: "Choose a target to see compatible animations." });
  const targetHint = targetRow.querySelector("small.muted");
  if (targetHint) targetHint.dataset.animationGuidance = "true";

  const timing = animation.timing || {};
  const modeSelect = createSelect(TIMING_MODES, timing.mode || "loop");
  modeSelect.dataset.animField = "timing.mode";
  const duration = createNumberInput(timing.durationMs ?? 1200);
  duration.dataset.animField = "timing.durationMs";
  duration.dataset.type = "number";
  const delay = createNumberInput(timing.delayMs ?? 0);
  delay.dataset.animField = "timing.delayMs";
  delay.dataset.type = "number";
  const easing = createSelect(EASING_OPTIONS, timing.easing || "linear");
  easing.dataset.animField = "timing.easing";
  const phaseOffset = createNumberInput(timing.phaseOffset ?? 0);
  phaseOffset.dataset.animField = "timing.phaseOffset";
  phaseOffset.dataset.type = "number";

  const params = createTextArea(JSON.stringify(animation.params || {}, null, 2));
  params.dataset.animField = "params";
  params.dataset.type = "json";

  const seed = createNumberInput(animation.seed ?? "");
  seed.dataset.animField = "seed";
  seed.dataset.type = "number";

  body.append(
    createFieldRow("ID", idInput),
    createFieldRow("Animation", typeSelect),
    createFieldRow("Enabled", enabled),
    targetRow,
    createFieldRow("Timing mode", modeSelect),
    createFieldRow("Duration (ms)", duration),
    createFieldRow("Delay (ms)", delay),
    createFieldRow("Easing", easing),
    createFieldRow("Phase offset", phaseOffset),
    createFieldRow("Seed", seed),
    createFieldRow("Params (JSON)", params)
  );
  slot.append(header, body, targetList);

  updateAnimationGuidance({ targetInput: target, typeSelect, hintEl: targetHint });
  updateAnimationTargets({ typeSelect, targetList });
  target.addEventListener("input", () => {
    updateAnimationGuidance({ targetInput: target, typeSelect, hintEl: targetHint });
  });
  typeSelect.addEventListener("change", () => {
    updateAnimationTargets({ typeSelect, targetList });
    setAnimationSlotDisabled(slot, !typeSelect.value);
  });

  setAnimationSlotDisabled(slot, !typeSelect.value);
  return slot;
}

function createPresetPanel(currentStyle) {
  const wrap = createElement("div", { className: "preset-panel" });
  const search = createTextInput("");
  search.placeholder = "Search presets";
  search.dataset.presetSearch = "true";
  const tags = Array.from(new Set(ICON_PRESETS.flatMap((preset) => preset.tags || []))).sort();
  const tagSelect = createSelect([{ value: "", label: "All tags" }, ...tags.map((tag) => ({ value: tag, label: tag }))], "");
  tagSelect.dataset.presetTag = "true";

  const list = createElement("div", { className: "preset-list", attrs: { "data-preset-list": "true" } });
  ICON_PRESETS.forEach((preset) => {
    const button = createElement("button", { className: "preset-button", text: preset.name, attrs: { type: "button", "data-preset-id": preset.id } });
    button.dataset.tags = (preset.tags || []).join(",");
    list.appendChild(button);
  });

  wrap.append(createFieldRow("Search", search), createFieldRow("Tag", tagSelect), list);
  wrap.dataset.currentStyle = JSON.stringify(currentStyle);
  return wrap;
}

function renderAnimationSlots(list, animations = []) {
  list.innerHTML = "";
  const triggerMap = buildAnimationTriggerMap(animations);
  ANIMATION_TRIGGER_SLOTS.forEach((trigger) => {
    const anim = triggerMap.get(trigger.eventType) || {};
    list.appendChild(createAnimationSlot(trigger, anim));
  });
}

function createIconCard({ icon, allowRemove = false } = {}) {
  const style = resolveIconStyleV2(icon);
  const card = createElement("section", { className: "icon-card" });
  card.dataset.iconCard = "true";

  const header = createElement("header");
  const heading = createElement("h3", { text: icon?.name || icon?.id || "New icon" });
  header.append(heading);
  card.appendChild(header);

  const body = createElement("div", { className: "icon-card-body" });

  const preview = createElement("div", { className: "icon-preview" });
  const previewToolbar = createElement("div", { className: "preview-toolbar" });
  const previewStatus = createElement("div", { className: "preview-status", attrs: { "data-preview-status": "true" } });
  previewStatus.textContent = "Preview: Idle";
  const previewBg = createSelect([
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
    { value: "checker", label: "Checker" }
  ], "dark");
  previewBg.dataset.previewBg = "true";
  const reducedToggle = createCheckbox(false);
  reducedToggle.dataset.previewReduceMotion = "true";
  const maskToggle = createCheckbox(false);
  maskToggle.dataset.previewMask = "true";
  previewToolbar.append(
    previewStatus,
    createFieldRow("Background", previewBg),
    createFieldRow("Reduced motion", reducedToggle),
    createFieldRow("Show mask", maskToggle)
  );
  const previewWrap = createElement("div", { className: "preview-grid", attrs: { "data-icon-preview": "true" } });
  [64, 128, 256].forEach((size) => {
    const canvas = createElement("canvas", { className: "icon-preview-canvas", attrs: { width: size, height: size, "data-preview-size": String(size) } });
    previewWrap.appendChild(canvas);
  });
  preview.append(previewToolbar, previewWrap);

  const tabs = createTabBar([
    { id: "basics", label: "Basics", active: true },
    { id: "style", label: "Style" },
    { id: "pattern", label: "Pattern" },
    { id: "effects", label: "Effects" },
    { id: "animations", label: "Animations" },
    { id: "presets", label: "Presets" },
    { id: "advanced", label: "Advanced" }
  ]);

  const panel = createElement("div", { className: "tab-panels" });

  const basics = createElement("section", { className: "section-card", attrs: { "data-tab-panel": "basics" } });
  basics.appendChild(createElement("strong", { text: "Basics" }));
  const basicsGrid = createElement("div", { className: "field-grid" });
  const idInput = createTextInput(icon?.id || "");
  idInput.dataset.field = "id";
  const nameInput = createTextInput(icon?.name || "");
  nameInput.dataset.field = "name";
  const imageInput = createTextInput(icon?.imageSrc || "");
  imageInput.dataset.field = "imageSrc";
  const schemaInput = createNumberInput(icon?.schemaVersion ?? 2);
  schemaInput.dataset.field = "schemaVersion";
  schemaInput.dataset.type = "number";
  basicsGrid.append(
    createFieldRow("ID", idInput),
    createFieldRow("Name", nameInput),
    createFieldRow("Image src", imageInput),
    createFieldRow("Schema version", schemaInput)
  );
  basics.appendChild(basicsGrid);

  const unlock = createElement("section", { className: "section-card", attrs: { "data-tab-panel": "basics" } });
  unlock.appendChild(createElement("strong", { text: "Unlock" }));
  const unlockGrid = createElement("div", { className: "field-grid" });
  const unlockType = createSelect(UNLOCK_OPTIONS, icon?.unlock?.type || "free");
  unlockType.dataset.field = "unlockType";
  const unlockLabel = createTextInput(icon?.unlock?.label || "");
  unlockLabel.dataset.field = "unlockLabel";
  const unlockId = createTextInput(icon?.unlock?.id || "");
  unlockId.dataset.field = "unlockId";
  const unlockScore = createNumberInput(icon?.unlock?.minScore ?? "");
  unlockScore.dataset.field = "unlockScore";
  const unlockCost = createNumberInput(icon?.unlock?.cost ?? "");
  unlockCost.dataset.field = "unlockCost";
  const unlockCurrency = createTextInput(icon?.unlock?.currencyId || "");
  unlockCurrency.dataset.field = "unlockCurrency";
  unlockGrid.append(
    createFieldRow("Type", unlockType),
    createFieldRow("Label", unlockLabel),
    createFieldRow("Achievement ID", unlockId),
    createFieldRow("Score min", unlockScore),
    createFieldRow("Cost", unlockCost),
    createFieldRow("Currency ID", unlockCurrency)
  );
  unlock.appendChild(unlockGrid);

  const stylePanel = createElement("section", { className: "section-card", attrs: { "data-tab-panel": "style" } });
  stylePanel.appendChild(createElement("strong", { text: "Style" }));
  const styleGrid = createElement("div", { className: "field-grid" });
  const sizeInput = createNumberInput(style.size);
  sizeInput.dataset.field = "style.size";
  sizeInput.dataset.type = "number";
  const radiusInput = createTextInput("0.5");
  radiusInput.disabled = true;
  styleGrid.append(
    createFieldRow("Preview size", sizeInput),
    createFieldRow("Radius ratio", radiusInput, { hint: "Locked to circle invariant." }),
    createFieldRow("Mask mode", (() => {
      const select = createSelect([{ value: "hard", label: "Hard" }, { value: "soft", label: "Soft" }], style.circle?.maskMode || "hard");
      select.dataset.field = "style.circle.maskMode";
      return select;
    })()),
    createFieldRow("Edge feather px", (() => {
      const input = createNumberInput(style.circle?.edgeFeatherPx ?? 0);
      input.dataset.field = "style.circle.edgeFeatherPx";
      input.dataset.type = "number";
      return input;
    })())
  );
  const paletteGrid = createElement("div", { className: "field-grid" });
  [
    ["fill", "Fill"],
    ["core", "Core"],
    ["rim", "Rim"],
    ["glow", "Glow"],
    ["accent", "Accent"]
  ].forEach(([key, label]) => {
    const input = createTextInput(style.palette?.[key] || "");
    input.dataset.field = `style.palette.${key}`;
    paletteGrid.appendChild(createFieldRow(label, input, { colorPicker: true }));
  });
  const strokeGrid = createElement("div", { className: "field-grid" });
  const strokeWidth = createNumberInput(style.stroke?.width ?? "");
  strokeWidth.dataset.field = "style.stroke.width";
  strokeWidth.dataset.type = "number";
  const strokeColor = createTextInput(style.stroke?.color || "");
  strokeColor.dataset.field = "style.stroke.color";
  const strokeAlpha = createNumberInput(style.stroke?.alpha ?? "");
  strokeAlpha.dataset.field = "style.stroke.alpha";
  strokeAlpha.dataset.type = "number";
  strokeGrid.append(
    createFieldRow("Stroke width", strokeWidth),
    createFieldRow("Stroke color", strokeColor, { colorPicker: true }),
    createFieldRow("Stroke alpha", strokeAlpha)
  );
  const shadowGrid = createElement("div", { className: "field-grid" });
  const shadowEnabled = createCheckbox(style.shadow?.enabled !== false);
  shadowEnabled.dataset.field = "style.shadow.enabled";
  shadowEnabled.dataset.type = "checkbox";
  const shadowBlur = createNumberInput(style.shadow?.blur ?? "");
  shadowBlur.dataset.field = "style.shadow.blur";
  shadowBlur.dataset.type = "number";
  const shadowSpread = createNumberInput(style.shadow?.spread ?? "");
  shadowSpread.dataset.field = "style.shadow.spread";
  shadowSpread.dataset.type = "number";
  const shadowColor = createTextInput(style.shadow?.color || "");
  shadowColor.dataset.field = "style.shadow.color";
  const shadowAlpha = createNumberInput(style.shadow?.alpha ?? "");
  shadowAlpha.dataset.field = "style.shadow.alpha";
  shadowAlpha.dataset.type = "number";
  const shadowOffsetX = createNumberInput(style.shadow?.offsetX ?? "");
  shadowOffsetX.dataset.field = "style.shadow.offsetX";
  shadowOffsetX.dataset.type = "number";
  const shadowOffsetY = createNumberInput(style.shadow?.offsetY ?? "");
  shadowOffsetY.dataset.field = "style.shadow.offsetY";
  shadowOffsetY.dataset.type = "number";
  shadowGrid.append(
    createFieldRow("Shadow enabled", shadowEnabled),
    createFieldRow("Shadow blur", shadowBlur),
    createFieldRow("Shadow spread", shadowSpread),
    createFieldRow("Shadow color", shadowColor, { colorPicker: true }),
    createFieldRow("Shadow alpha", shadowAlpha),
    createFieldRow("Shadow offset X", shadowOffsetX),
    createFieldRow("Shadow offset Y", shadowOffsetY)
  );
  stylePanel.append(styleGrid, createElement("strong", { text: "Palette" }), paletteGrid, createElement("strong", { text: "Stroke" }), strokeGrid, createElement("strong", { text: "Shadow" }), shadowGrid);

  const patternPanel = createElement("section", { className: "section-card", attrs: { "data-tab-panel": "pattern" } });
  patternPanel.appendChild(createElement("strong", { text: "Pattern" }));
  const patternGrid = createElement("div", { className: "field-grid" });
  const patternType = createSelect(PATTERN_LABELS, style.pattern?.type || "");
  patternType.dataset.field = "style.pattern.type";
  const patternScale = createNumberInput(style.pattern?.scale ?? 1);
  patternScale.dataset.field = "style.pattern.scale";
  patternScale.dataset.type = "number";
  const patternRotation = createNumberInput(style.pattern?.rotationDeg ?? 0);
  patternRotation.dataset.field = "style.pattern.rotationDeg";
  patternRotation.dataset.type = "number";
  const patternAlpha = createNumberInput(style.pattern?.alpha ?? 1);
  patternAlpha.dataset.field = "style.pattern.alpha";
  patternAlpha.dataset.type = "number";
  const radialBias = createNumberInput(style.pattern?.radialBias ?? 0);
  radialBias.dataset.field = "style.pattern.radialBias";
  radialBias.dataset.type = "number";
  const centerX = createNumberInput(style.pattern?.centerOffset?.x ?? 0);
  centerX.dataset.field = "style.pattern.centerOffset.x";
  centerX.dataset.type = "number";
  const centerY = createNumberInput(style.pattern?.centerOffset?.y ?? 0);
  centerY.dataset.field = "style.pattern.centerOffset.y";
  centerY.dataset.type = "number";
  const primaryColor = createTextInput(style.pattern?.primaryColor || "");
  primaryColor.dataset.field = "style.pattern.primaryColor";
  const secondaryColor = createTextInput(style.pattern?.secondaryColor || "");
  secondaryColor.dataset.field = "style.pattern.secondaryColor";
  const blendMode = createSelect([
    { value: "normal", label: "Normal" },
    { value: "screen", label: "Screen" },
    { value: "multiply", label: "Multiply" },
    { value: "overlay", label: "Overlay" },
    { value: "softLight", label: "Soft Light" },
    { value: "hardLight", label: "Hard Light" }
  ], style.pattern?.blendMode || "normal");
  blendMode.dataset.field = "style.pattern.blendMode";
  patternGrid.append(
    createFieldRow("Type", patternType),
    createFieldRow("Scale", patternScale),
    createFieldRow("Rotation (deg)", patternRotation),
    createFieldRow("Alpha", patternAlpha),
    createFieldRow("Radial bias", radialBias),
    createFieldRow("Center offset X", centerX),
    createFieldRow("Center offset Y", centerY),
    createFieldRow("Primary color", primaryColor, { colorPicker: true }),
    createFieldRow("Secondary color", secondaryColor, { colorPicker: true }),
    createFieldRow("Blend mode", blendMode)
  );
  patternPanel.append(patternGrid, buildPatternExtraFields(style.pattern));

  const effectsPanel = createElement("section", { className: "section-card", attrs: { "data-tab-panel": "effects" } });
  effectsPanel.appendChild(createElement("strong", { text: "Effects" }));
  const effectsList = createElement("div", { className: "effect-list", attrs: { "data-effect-list": "true" } });
  (style.effects || []).forEach((effect, idx) => effectsList.appendChild(createEffectRow(effect, idx)));
  const addEffectBtn = createElement("button", { text: "Add effect", attrs: { type: "button", "data-add-effect": "true" } });
  effectsPanel.append(effectsList, addEffectBtn);

  const animationsPanel = createElement("section", { className: "section-card", attrs: { "data-tab-panel": "animations" } });
  animationsPanel.appendChild(createElement("strong", { text: "Animations" }));
  animationsPanel.appendChild(createElement("p", {
    text: "Configure one idle animation and one animation per trigger. Use Preview to test each trigger.",
    className: "muted"
  }));
  const animList = createElement("div", { className: "animation-slot-list", attrs: { "data-animation-list": "true" } });
  renderAnimationSlots(animList, style.animations || []);
  animationsPanel.append(animList);

  addEffectBtn.addEventListener("click", () => {
    effectsList.appendChild(createEffectRow({}, effectsList.children.length));
    reindexRows(effectsList, "data-effect-row", "style.effects[");
  });

  effectsList.addEventListener("click", (event) => {
    const row = event.target.closest("[data-effect-row]");
    if (!row) return;
    if (event.target.dataset.remove) {
      row.remove();
      reindexRows(effectsList, "data-effect-row", "style.effects[");
      return;
    }
    const move = event.target.dataset.move;
    if (!move) return;
    const sibling = move === "up" ? row.previousElementSibling : row.nextElementSibling;
    if (!sibling) return;
    if (move === "up") effectsList.insertBefore(row, sibling);
    else effectsList.insertBefore(sibling, row);
    reindexRows(effectsList, "data-effect-row", "style.effects[");
  });

  const presetPanel = createElement("section", { className: "section-card", attrs: { "data-tab-panel": "presets" } });
  presetPanel.appendChild(createElement("strong", { text: "Presets" }));
  presetPanel.appendChild(createPresetPanel(style));

  const advancedPanel = createElement("section", { className: "section-card", attrs: { "data-tab-panel": "advanced" } });
  advancedPanel.appendChild(createElement("strong", { text: "Advanced JSON" }));
  const jsonArea = createTextArea(JSON.stringify({ ...icon, schemaVersion: icon?.schemaVersion ?? 2, style }, null, 2));
  jsonArea.dataset.field = "advancedJson";
  const jsonErrors = createElement("div", { className: "validation-errors", attrs: { "data-validation-errors": "true" } });
  const applyJson = createElement("button", { text: "Apply JSON", attrs: { type: "button", "data-apply-json": "true" } });
  const copyJson = createElement("button", { text: "Copy JSON", attrs: { type: "button", "data-copy-json": "true" } });
  advancedPanel.append(createFieldRow("Icon JSON", jsonArea), applyJson, copyJson, jsonErrors);

  panel.append(basics, unlock, stylePanel, patternPanel, effectsPanel, animationsPanel, presetPanel, advancedPanel);
  body.append(preview, tabs, panel);
  card.appendChild(body);

  if (allowRemove) {
    const actions = createElement("div", { className: "icon-actions" });
    const resetBtn = createElement("button", { text: "Reset unlock to free", attrs: { type: "button" } });
    resetBtn.addEventListener("click", () => {
      unlockType.value = "free";
      unlockLabel.value = "";
      unlockId.value = "";
      unlockScore.value = "";
      unlockCost.value = "";
      unlockCurrency.value = "";
    });
    actions.append(resetBtn);
    card.appendChild(actions);
  }

  tabs.addEventListener("click", (event) => {
    const btn = event.target.closest(".tab-button");
    if (!btn) return;
    activateTab(card, btn.dataset.tab);
  });
  activateTab(card, "basics");

  return card;
}

function readIconDefinition(card) {
  const id = String(card.querySelector("[data-field='id']")?.value || "").trim();
  if (!id) return null;
  const icon = { id };
  const name = String(card.querySelector("[data-field='name']")?.value || "").trim();
  if (name) icon.name = name;
  const imageSrcRaw = card.querySelector("[data-field='imageSrc']")?.value;
  if (imageSrcRaw !== undefined) {
    const imageSrc = String(imageSrcRaw).trim();
    if (imageSrc.length) icon.imageSrc = imageSrc;
    else icon.imageSrc = "";
  }

  const schemaVersion = Number(card.querySelector("[data-field='schemaVersion']")?.value || 2);
  icon.schemaVersion = Number.isFinite(schemaVersion) ? schemaVersion : 2;

  const unlockType = card.querySelector("[data-field='unlockType']")?.value || "free";
  const unlock = { type: unlockType };
  const unlockLabel = String(card.querySelector("[data-field='unlockLabel']")?.value || "").trim();
  if (unlockLabel) unlock.label = unlockLabel;
  if (unlockType === "score") {
    const minScore = Number(card.querySelector("[data-field='unlockScore']")?.value);
    if (Number.isFinite(minScore)) unlock.minScore = minScore;
  } else if (unlockType === "achievement") {
    const unlockId = String(card.querySelector("[data-field='unlockId']")?.value || "").trim();
    if (unlockId) unlock.id = unlockId;
  } else if (unlockType === "purchase") {
    const cost = Number(card.querySelector("[data-field='unlockCost']")?.value);
    if (Number.isFinite(cost)) unlock.cost = cost;
    const currencyId = String(card.querySelector("[data-field='unlockCurrency']")?.value || "").trim();
    if (currencyId) unlock.currencyId = currencyId;
  }
  icon.unlock = unlock;

  const style = createDefaultIconStyleV2();
  const fieldInputs = Array.from(card.querySelectorAll("[data-field^='style.']"));
  fieldInputs.forEach((input) => {
    const value = parseValue(input);
    if (value === undefined) return;
    if (value?.__jsonError) {
      input.dataset.jsonError = "true";
      return;
    }
    const path = input.dataset.field.replace("style.", "");
    setPath(style, path, value);
  });

  const effects = Array.from(card.querySelectorAll("[data-effect-row]"));
  style.effects = effects.map((row, index) => {
    const effect = { type: "outline", enabled: true };
    row.querySelectorAll("[data-field^='style.effects']").forEach((input) => {
      const value = parseValue(input);
      if (value === undefined) return;
      if (value?.__jsonError) {
        input.dataset.jsonError = "true";
        return;
      }
      const path = input.dataset.field.replace(`style.effects[${index}].`, "");
      setPath(effect, path, value);
    });
    return effect;
  });

  const animationSlots = Array.from(card.querySelectorAll("[data-animation-slot]"));
  style.animations = animationSlots.flatMap((slot) => {
    const anim = { enabled: true, timing: {} };
    slot.querySelectorAll("[data-anim-field]").forEach((input) => {
      const value = parseValue(input);
      if (value === undefined) return;
      if (value?.__jsonError) {
        input.dataset.jsonError = "true";
        return;
      }
      const path = input.dataset.animField;
      setPath(anim, path, value);
    });
    if (!anim.type) return [];
    const trigger = slot.dataset.animationTrigger ?? "";
    if (trigger) anim.triggeredBy = trigger;
    return [anim];
  });

  icon.style = style;
  return icon;
}

function collectIconDefinitions(root) {
  const icons = [];
  const cards = root.querySelectorAll("[data-icon-card]");
  cards.forEach((card) => {
    const icon = readIconDefinition(card);
    if (!icon?.id) return;
    icons.push(icon);
  });
  return icons;
}

function filterPresets(list, { query = "", tag = "" } = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  return list.filter((preset) => {
    const matchesQuery = !normalizedQuery
      || preset.name.toLowerCase().includes(normalizedQuery)
      || preset.id.toLowerCase().includes(normalizedQuery);
    const matchesTag = !tag || (preset.tags || []).includes(tag);
    return matchesQuery && matchesTag;
  });
}

function applyPresetToCard(card, preset) {
  const icon = readIconDefinition(card);
  if (!icon) return;
  const mergedStyle = applyPresetPatch(icon.style, preset);
  applyStyleToCard(card, mergedStyle);
  const errors = validateIconStyleV2(mergedStyle);
  if (!errors.ok) {
    const errorBox = card.querySelector("[data-validation-errors]");
    if (errorBox) {
      errorBox.innerHTML = errors.errors.map((err) => `<div>${err.path}: ${err.message}</div>`).join("");
    }
  }
}

function wirePresetPanel(card) {
  const panel = card.querySelector("[data-tab-panel='presets']");
  if (!panel) return;
  const list = panel.querySelector("[data-preset-list]");
  const search = panel.querySelector("[data-preset-search]");
  const tagSelect = panel.querySelector("[data-preset-tag]");
  if (!list || !search || !tagSelect) return;

  function render() {
    const filtered = filterPresets(ICON_PRESETS, { query: search.value, tag: tagSelect.value });
    list.querySelectorAll(".preset-button").forEach((btn) => {
      const preset = ICON_PRESETS.find((item) => item.id === btn.dataset.presetId);
      btn.classList.toggle("hidden", !filtered.includes(preset));
    });
  }

  search.addEventListener("input", render);
  tagSelect.addEventListener("change", render);
  list.addEventListener("click", (event) => {
    const button = event.target.closest(".preset-button");
    if (!button) return;
    const preset = ICON_PRESETS.find((item) => item.id === button.dataset.presetId);
    if (!preset) return;
    applyPresetToCard(card, preset);
  });
  render();
}

function wireAdvancedPanel(card) {
  const panel = card.querySelector("[data-tab-panel='advanced']");
  if (!panel) return;
  const jsonArea = panel.querySelector("[data-field='advancedJson']");
  const applyBtn = panel.querySelector("[data-apply-json]");
  const copyBtn = panel.querySelector("[data-copy-json]");
  const errorBox = panel.querySelector("[data-validation-errors]");
  if (!jsonArea || !applyBtn || !copyBtn) return;

  applyBtn.addEventListener("click", () => {
    if (errorBox) errorBox.textContent = "";
    try {
      const parsed = JSON.parse(jsonArea.value || "{}");
      if (!parsed || typeof parsed !== "object") return;
      const nextStyle = resolveIconStyleV2(parsed);
      const errors = validateIconStyleV2(nextStyle);
      if (!errors.ok && errorBox) {
        errorBox.innerHTML = errors.errors.map((err) => `<div>${err.path}: ${err.message}</div>`).join("");
        return;
      }
      applyIconJsonToCard(card, parsed, nextStyle);
    } catch (err) {
      if (errorBox) errorBox.textContent = `Invalid JSON: ${err.message}`;
    }
  });

  copyBtn.addEventListener("click", async () => {
    const text = jsonArea.value || "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      jsonArea.select();
      document.execCommand("copy");
    }
  });
}

function applyStyleToCard(card, style) {
  card.querySelectorAll("[data-field^='style.']").forEach((input) => {
    const path = input.dataset.field.replace("style.", "");
    const value = path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), style);
    setInputValue(input, value);
  });

  const effectsList = card.querySelector("[data-effect-list]");
  if (effectsList) {
    effectsList.innerHTML = "";
    (style.effects || []).forEach((effect, idx) => effectsList.appendChild(createEffectRow(effect, idx)));
  }
  const animList = card.querySelector("[data-animation-list]");
  if (animList) {
    renderAnimationSlots(animList, style.animations || []);
  }
}

function setInputValue(input, value) {
  const inputType = input.dataset.type || input.type;
  if (inputType === "checkbox") {
    input.checked = Boolean(value);
    return;
  }
  if (value === undefined || value === null) {
    input.value = "";
    return;
  }
  if (inputType === "json") {
    input.value = JSON.stringify(value, null, 2);
    return;
  }
  input.value = typeof value === "object" ? JSON.stringify(value) : String(value);
}

function setFieldValue(card, field, value) {
  const input = card.querySelector(`[data-field='${field}']`);
  if (!input) return;
  setInputValue(input, value);
}

function applyIconJsonToCard(card, parsed, style) {
  setFieldValue(card, "id", parsed.id || "");
  setFieldValue(card, "name", parsed.name || "");
  setFieldValue(card, "imageSrc", parsed.imageSrc || "");
  setFieldValue(card, "schemaVersion", parsed.schemaVersion ?? 2);

  const unlock = parsed.unlock || {};
  setFieldValue(card, "unlockType", unlock.type || "free");
  setFieldValue(card, "unlockLabel", unlock.label || "");
  setFieldValue(card, "unlockId", unlock.id || "");
  setFieldValue(card, "unlockScore", unlock.minScore ?? "");
  setFieldValue(card, "unlockCost", unlock.cost ?? "");
  setFieldValue(card, "unlockCurrency", unlock.currencyId || "");

  const heading = card.querySelector("header h3");
  if (heading) heading.textContent = parsed.name || parsed.id || "New icon";

  applyStyleToCard(card, style);
}

function validateIconCard(card) {
  const icon = readIconDefinition(card);
  if (!icon) return { ok: false, errors: [{ path: "id", message: "missing_id" }] };
  return validateIconStyleV2(icon.style || {});
}

export {
  createIconCard,
  collectIconDefinitions,
  readIconDefinition,
  wirePresetPanel,
  wireAdvancedPanel,
  validateIconCard
};
