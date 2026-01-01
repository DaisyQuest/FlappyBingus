// =====================
// FILE: public/js/uiLayout.js
// =====================
import { DEFAULT_CONFIG } from "./config.js";
import { OFFLINE_STATUS_TEXT, SIGNED_OUT_TEXT } from "./userStatusCopy.js";
import { formatWorldwideRuns } from "./worldwideStats.js";

const HOW_TO_STEPS = [
  'Move with <span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span>',
  "Use abilities to stay alive",
  "Gain points by surviving",
  "Orbs award bonus points",
  "Perfect gaps award bonus points",
  "Practice in Tutorial"
];

const SKILL_COOLDOWN_REFS = [
  { ref: "dashCooldownValue", key: "dash", label: "Reflect cooldown" },
  { ref: "dashDestroyCooldownValue", key: "dashDestroy", label: "Break cooldown" },
  { ref: "teleportCooldownValue", key: "teleport", label: "Teleport cooldown" },
  { ref: "teleportExplodeCooldownValue", key: "teleport", label: "Explode teleport cooldown", multiplier: 2 },
  { ref: "invulnShortCooldownValue", key: "phase", label: "Invulnerability cooldown" },
  { ref: "invulnLongCooldownValue", key: "phase", label: "Invulnerability cooldown", multiplier: 2 },
  { ref: "slowFieldCooldownValue", key: "slowField", label: "Slow Field cooldown" },
  { ref: "slowExplosionCooldownValue", key: "slowExplosion", label: "Explode cooldown" }
];

function readCooldown(cfg, key, { multiplier = 1 } = {}) {
  const fallback = Number(DEFAULT_CONFIG?.skills?.[key]?.cooldown);
  const raw = Number(cfg?.skills?.[key]?.cooldown);
  const base = (Number.isFinite(raw) && raw >= 0)
    ? raw
    : (Number.isFinite(fallback) && fallback >= 0)
      ? fallback
      : null;
  if (base == null) return null;
  const val = base * multiplier;
  if (!Number.isFinite(val) || val < 0) return null;
  return val;
}

export function formatCooldownSeconds(value) {
  if (!Number.isFinite(value) || value < 0) return "—";
  const precision = value >= 10 ? 1 : 2;
  const numeric = Number(value.toFixed(precision));
  return `${numeric}s`;
}

function applySkillCooldowns(refs, cfg = DEFAULT_CONFIG) {
  SKILL_COOLDOWN_REFS.forEach(({ ref, key, label, multiplier = 1 }) => {
    const el = refs[ref];
    if (!el) return;
    const val = readCooldown(cfg, key, { multiplier });
    const text = formatCooldownSeconds(val);
    el.textContent = text;
    el.setAttribute("aria-label", `${label}: ${text}`);
  });
}

function createElement(doc, refs, tag, options = {}, children = []) {
  const {
    id,
    ref,
    className,
    text,
    html,
    attrs = {},
    dataset = {},
    props = {}
  } = options;

  const el = doc.createElement(tag);
  if (id) el.id = id;
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  if (html !== undefined) el.innerHTML = html;

  for (const [key, val] of Object.entries(attrs)) {
    if (val === false || val === null || val === undefined) continue;
    el.setAttribute(key, val === true ? "" : val);
  }
  for (const [key, val] of Object.entries(dataset)) {
    el.dataset[key] = val;
  }
  for (const [key, val] of Object.entries(props)) {
    el[key] = val;
  }
  for (const child of children) {
    el.append(child);
  }

  const refKey = ref || id;
  if (refKey) refs[refKey] = el;
  return el;
}

function createHowToCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card howto-card";

  const header = doc.createElement("div");
  header.className = "howto-header";

  const tutorialBtn = createElement(doc, refs, "button", {
    id: "tutorial",
    className: "cta-btn wide",
    text: "Tutorial",
    props: { disabled: true }
  });
  header.append(tutorialBtn);

  const wrapper = doc.createElement("div");
  wrapper.className = "howto";

  const howToTitle = doc.createElement("div");
  howToTitle.className = "howto-heading";
  howToTitle.textContent = "How to play";

  const list = doc.createElement("ul");
  list.className = "howto-list";
  HOW_TO_STEPS.forEach(step => {
    const li = doc.createElement("li");
    li.innerHTML = step;
    list.append(li);
  });

  wrapper.append(howToTitle, list);

  const settingsAction = createElement(doc, refs, "label", {
    className: "cta-btn wide card-nav",
    attrs: { for: "viewSettings", role: "button", tabindex: "0" },
    text: "Settings"
  });
  const settingsHint = createElement(doc, refs, "div", {
    className: "nav-callout settings-callout",
    text: "Change skill behaviors and key bindings"
  });
  const actions = doc.createElement("div");
  actions.className = "card-actions center callout-stack";
  actions.append(settingsAction, settingsHint);

  card.append(header, wrapper, actions);
  return card;
}

function createTrailCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card";

  const actions = doc.createElement("div");
  actions.className = "row top-actions";
  const startBtn = createElement(doc, refs, "button", {
    id: "start",
    className: "primary cta-btn wide sparkle",
    text: "Start",
    props: { disabled: true }
  });
  actions.append(startBtn);

  const divider = doc.createElement("div");
  divider.className = "soft-divider";

  const iconField = doc.createElement("div");
  iconField.className = "field icon-field icon-field-launcher";

  const iconLauncher = createElement(doc, refs, "button", {
    id: "iconLauncher",
    className: "icon-launcher",
    attrs: { type: "button" }
  });

  const iconBadge = doc.createElement("div");
  iconBadge.className = "icon-launcher-badge";
  const iconSwatch = doc.createElement("span");
  iconSwatch.className = "icon-swatch";
  const iconCanvas = doc.createElement("canvas");
  iconCanvas.className = "icon-swatch-canvas";
  iconCanvas.setAttribute("aria-hidden", "true");
  iconSwatch.append(iconCanvas);
  const iconLabel = doc.createElement("div");
  iconLabel.className = "icon-launcher-label";
  const iconName = doc.createElement("div");
  iconName.className = "icon-launcher-name";
  iconName.textContent = "High-Vis Orange";
  const iconAction = doc.createElement("div");
  iconAction.className = "icon-launcher-action";
  iconAction.textContent = "Change icon";
  iconLabel.append(iconName, iconAction);
  iconBadge.append(iconSwatch, iconLabel);
  iconLauncher.append(iconBadge);

  const iconOverlay = createElement(doc, refs, "div", {
    id: "iconOverlay",
    className: "icon-overlay modal-layer hidden",
    attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "iconOverlayTitle", "aria-hidden": "true" }
  });

  const overlayPanel = doc.createElement("div");
  overlayPanel.className = "icon-overlay-panel";
  const overlayHeader = doc.createElement("div");
  overlayHeader.className = "icon-overlay-header";
  const overlayTitle = doc.createElement("div");
  overlayTitle.id = "iconOverlayTitle";
  overlayTitle.className = "section-title";
  overlayTitle.textContent = "Choose your Bingus";
  const overlayClose = createElement(doc, refs, "button", {
    id: "iconOverlayClose",
    className: "icon-overlay-close",
    attrs: { type: "button" },
    text: "Close"
  });
  overlayHeader.append(overlayTitle, overlayClose);

  const options = createElement(doc, refs, "div", {
    id: "iconOptions",
    className: "icon-grid icon-overlay-grid",
    attrs: { role: "listbox" }
  });

  const iconHint = createElement(doc, refs, "div", {
    id: "iconHint",
    className: "hint"
  });

  overlayPanel.append(overlayHeader, options, iconHint);
  iconOverlay.append(overlayPanel);

  iconField.append(iconLauncher, iconOverlay);

  const pipeTextureField = doc.createElement("div");
  pipeTextureField.className = "field pipe-texture-field pipe-texture-field-launcher";

  const pipeTextureLauncher = createElement(doc, refs, "button", {
    id: "pipeTextureLauncher",
    className: "pipe-texture-launcher",
    attrs: { type: "button" }
  });

  const pipeTextureBadge = doc.createElement("div");
  pipeTextureBadge.className = "pipe-texture-launcher-badge";
  const pipeTextureSwatch = doc.createElement("span");
  pipeTextureSwatch.className = "pipe-texture-swatch";
  const pipeTextureCanvas = doc.createElement("canvas");
  pipeTextureCanvas.className = "pipe-texture-swatch-canvas";
  pipeTextureCanvas.width = 84;
  pipeTextureCanvas.height = 56;
  pipeTextureCanvas.setAttribute("aria-hidden", "true");
  pipeTextureSwatch.append(pipeTextureCanvas);
  const pipeTextureLabel = doc.createElement("div");
  pipeTextureLabel.className = "pipe-texture-launcher-label";
  const pipeTextureName = doc.createElement("div");
  pipeTextureName.className = "pipe-texture-launcher-name";
  pipeTextureName.textContent = "Basic";
  const pipeTextureAction = doc.createElement("div");
  pipeTextureAction.className = "pipe-texture-launcher-action";
  pipeTextureAction.textContent = "Change pipes";
  pipeTextureLabel.append(pipeTextureName, pipeTextureAction);
  pipeTextureBadge.append(pipeTextureSwatch, pipeTextureLabel);
  pipeTextureLauncher.append(pipeTextureBadge);

  const pipeTextureOverlay = createElement(doc, refs, "div", {
    id: "pipeTextureOverlay",
    className: "pipe-texture-overlay modal-layer hidden",
    attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "pipeTextureOverlayTitle", "aria-hidden": "true" }
  });
  const pipeTextureOverlayPanel = doc.createElement("div");
  pipeTextureOverlayPanel.className = "pipe-texture-overlay-panel icon-overlay-panel";
  const pipeTextureOverlayHeader = doc.createElement("div");
  pipeTextureOverlayHeader.className = "pipe-texture-overlay-header icon-overlay-header";
  const pipeTextureOverlayTitle = doc.createElement("div");
  pipeTextureOverlayTitle.id = "pipeTextureOverlayTitle";
  pipeTextureOverlayTitle.className = "section-title";
  pipeTextureOverlayTitle.textContent = "Pipe Textures";
  const pipeTextureOverlayClose = createElement(doc, refs, "button", {
    id: "pipeTextureOverlayClose",
    className: "pipe-texture-overlay-close icon-overlay-close",
    attrs: { type: "button" },
    text: "Close"
  });
  pipeTextureOverlayHeader.append(pipeTextureOverlayTitle, pipeTextureOverlayClose);

  const pipeTextureModeOptions = createElement(doc, refs, "div", {
    id: "pipeTextureModeOptions",
    className: "pipe-texture-mode-options"
  });
  const modes = ["MONOCHROME", "MINIMAL", "NORMAL", "HIGH", "ULTRA"];
  modes.forEach((mode) => {
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "pipe-texture-mode-btn";
    btn.dataset.pipeTextureMode = mode;
    btn.setAttribute("aria-pressed", mode === "NORMAL" ? "true" : "false");
    btn.textContent = mode;
    pipeTextureModeOptions.append(btn);
  });

  const pipeTextureOptions = createElement(doc, refs, "div", {
    id: "pipeTextureOptions",
    className: "pipe-texture-grid",
    attrs: { role: "listbox" }
  });

  const pipeTextureHint = createElement(doc, refs, "div", {
    id: "pipeTextureHint",
    className: "hint",
    text: "Unlock pipe textures by improving your personal best."
  });

  pipeTextureOverlayPanel.append(pipeTextureOverlayHeader, pipeTextureModeOptions, pipeTextureOptions, pipeTextureHint);
  pipeTextureOverlay.append(pipeTextureOverlayPanel);

  pipeTextureField.append(pipeTextureLauncher, pipeTextureOverlay);

  const trailField = doc.createElement("div");
  trailField.className = "field trail-field trail-field-launcher";

  const trailLauncher = createElement(doc, refs, "button", {
    id: "trailLauncher",
    className: "trail-launcher",
    attrs: { type: "button" }
  });
  const trailBadge = doc.createElement("div");
  trailBadge.className = "trail-launcher-badge";
  const trailLabel = doc.createElement("div");
  trailLabel.className = "trail-launcher-label";
  const trailName = doc.createElement("div");
  trailName.className = "trail-launcher-name";
  trailName.textContent = "Classic";
  const trailAction = doc.createElement("div");
  trailAction.className = "trail-launcher-action";
  trailAction.textContent = "Change trail";
  trailLabel.append(trailName, trailAction);
  trailBadge.append(trailLabel);
  trailLauncher.append(trailBadge);

  const trailOverlay = createElement(doc, refs, "div", {
    id: "trailOverlay",
    className: "trail-overlay modal-layer hidden",
    attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "trailOverlayTitle", "aria-hidden": "true" }
  });
  const trailOverlayPanel = doc.createElement("div");
  trailOverlayPanel.className = "trail-overlay-panel icon-overlay-panel";
  const trailOverlayHeader = doc.createElement("div");
  trailOverlayHeader.className = "trail-overlay-header icon-overlay-header";
  const trailOverlayTitle = doc.createElement("div");
  trailOverlayTitle.id = "trailOverlayTitle";
  trailOverlayTitle.className = "section-title";
  trailOverlayTitle.textContent = "Choose your Trail";
  const trailOverlayClose = createElement(doc, refs, "button", {
    id: "trailOverlayClose",
    className: "trail-overlay-close icon-overlay-close",
    attrs: { type: "button" },
    text: "Close"
  });
  trailOverlayHeader.append(trailOverlayTitle, trailOverlayClose);

  const trailOptions = createElement(doc, refs, "div", {
    id: "trailOptions",
    className: "trail-grid icon-grid",
    attrs: { role: "listbox" }
  });

  const trailHint = createElement(doc, refs, "div", {
    id: "trailHint",
    className: "hint",
    text: "Unlock trails by improving your personal best."
  });

  const achievementsAction = createElement(doc, refs, "label", {
    className: "cta-btn wide card-nav",
    attrs: { for: "viewAchievements", role: "button", tabindex: "0" },
    text: "Achievements"
  });
  const shopLauncher = createElement(doc, refs, "button", {
    id: "shopLauncher",
    className: "cta-btn wide",
    text: "Shop",
    attrs: { type: "button" }
  });
  const actionsRow = doc.createElement("div");
  actionsRow.className = "card-actions center";
  actionsRow.append(achievementsAction, shopLauncher);

  trailOverlayPanel.append(trailOverlayHeader, trailOptions);
  trailOverlay.append(trailOverlayPanel);

  trailField.append(trailLauncher, trailOverlay, trailHint);
  card.append(actions, divider, iconField, pipeTextureField, trailField, actionsRow);
  return card;
}

function createTrailPreviewOverlay(doc, refs) {
  const overlay = doc.createElement("div");
  overlay.className = "trail-preview-overlay";

  const trailGlow = doc.createElement("div");
  trailGlow.className = "trail-preview-glow";

  const trailCanvas = createElement(doc, refs, "canvas", {
    id: "trailPreviewCanvas",
    className: "trail-preview-canvas"
  });

  overlay.append(trailGlow, trailCanvas);
  return overlay;
}

function createStatusCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card settings-utility";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "Status";

  const row = doc.createElement("div");
  row.className = "minirow";
  const pill = createElement(doc, refs, "div", { id: "bootPill", className: "pill" });
  const dot = doc.createElement("span");
  dot.className = "dot";
  const bootText = createElement(doc, refs, "span", { id: "bootText", text: "Loading…" });
  pill.append(dot, bootText);
  row.append(pill);

  card.append(title, row);
  return card;
}

function createSeedCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card settings-utility";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "Level Seed";

  const field = doc.createElement("div");
  field.className = "field";

  const label = doc.createElement("div");
  label.className = "lbl";
  label.textContent = "Seed (optional)";

  const row = doc.createElement("div");
  row.className = "minirow seed-row";
  const input = createElement(doc, refs, "input", {
    id: "seedInput",
    attrs: { type: "text", maxlength: "48", placeholder: "Leave blank for random (share seed to play same level)" }
  });
  const randomBtn = createElement(doc, refs, "button", { id: "seedRandomBtn", text: "Random" });
  row.append(input, randomBtn);

  const hint = createElement(doc, refs, "div", {
    id: "seedHint",
    className: "hint",
    text: "If two players use the same seed, pipe/orb spawns will match."
  });

  field.append(label, row, hint);
  card.append(title, field);
  return card;
}

function createVolumeCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card settings-secondary volume-card";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "Volume";

  const grid = doc.createElement("div");
  grid.className = "volume-grid";

  const musicRow = doc.createElement("div");
  musicRow.className = "slider-row";
  musicRow.append(
    (() => {
      const lbl = doc.createElement("div");
      lbl.className = "lbl";
      lbl.textContent = "Music Volume";
      return lbl;
    })(),
    createElement(doc, refs, "input", {
      id: "musicVolume",
      attrs: { type: "range", min: "0", max: "100", "aria-label": "Music volume" },
      props: { value: 70 }
    })
  );

  const sfxRow = doc.createElement("div");
  sfxRow.className = "slider-row";
  sfxRow.append(
    (() => {
      const lbl = doc.createElement("div");
      lbl.className = "lbl";
      lbl.textContent = "SFX Volume";
      return lbl;
    })(),
    createElement(doc, refs, "input", {
      id: "sfxVolume",
      attrs: { type: "range", min: "0", max: "100", "aria-label": "SFX volume" },
      props: { value: 80 }
    })
  );

  grid.append(musicRow, sfxRow);

  const muteRow = doc.createElement("div");
  muteRow.className = "mute-row";
  const muteCheckbox = createElement(doc, refs, "input", {
    id: "muteToggle",
    attrs: { type: "checkbox", "aria-label": "Mute audio" }
  });
  const muteLabel = doc.createElement("label");
  muteLabel.setAttribute("for", "muteToggle");
  muteLabel.textContent = "Mute everything";
  muteRow.append(muteCheckbox, muteLabel);

  card.append(title, grid, muteRow);
  return card;
}

function createBindCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card settings-feature";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "Skill Keybinds";

  const wrap = createElement(doc, refs, "div", { id: "bindWrap", className: "bindList" });
  const hint = createElement(doc, refs, "div", {
    id: "bindHint",
    className: "hint",
    text: "Click Rebind, then press a key or click a mouse button. Press Esc to cancel."
  });

  card.append(title, wrap, hint);
  return card;
}

function createSkillGlyph(doc, type) {
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("skill-glyph");
  const node = (tag, attrs = {}) => {
    const el = doc.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };

  if (type === "ricochet") {
    svg.append(
      node("rect", { x: "8", y: "12", width: "6", height: "40", rx: "3", class: "skill-glyph-wall" }),
      node("rect", { x: "50", y: "12", width: "6", height: "40", rx: "3", class: "skill-glyph-wall" }),
      node("polyline", { points: "18,44 42,32 18,20", class: "skill-glyph-path" }),
      node("polygon", { points: "16,18 26,20 18,26", class: "skill-glyph-accent" }),
      node("circle", { cx: "42", cy: "32", r: "3.5", class: "skill-glyph-node" })
    );
  } else if (type === "destroy") {
    svg.append(
      node("rect", { x: "25", y: "10", width: "14", height: "44", rx: "6", class: "skill-glyph-wall" }),
      node("rect", { x: "22", y: "12", width: "20", height: "12", rx: "4", class: "skill-glyph-wall" }),
      node("polygon", { points: "18,28 28,30 24,36 32,34 30,44 38,32 44,40 42,28 48,30 42,22 36,24 32,16 30,26 22,22", class: "skill-glyph-accent" }),
      node("path", { d: "M24 48c5-3 11-3 16 0", class: "skill-glyph-crack" })
    );
  } else if (type === "slow") {
    svg.append(
      node("path", { d: "M32 12v26", class: "skill-glyph-path" }),
      node("polygon", { points: "24,32 32,46 40,32", class: "skill-glyph-accent" }),
      node("path", { d: "M18 40c4 4 0 8 4 12", class: "skill-glyph-wave" }),
      node("path", { d: "M46 40c-4 4 0 8-4 12", class: "skill-glyph-wave" })
    );
  } else if (type === "teleport") {
    svg.append(
      node("circle", { cx: "32", cy: "32", r: "11", class: "skill-glyph-fill" }),
      node("circle", { cx: "32", cy: "32", r: "4.5", class: "skill-glyph-node" }),
      node("path", { d: "M18 22c5-6 25-6 30 0", class: "skill-glyph-path" }),
      node("path", { d: "M20 42c4 7 20 7 24 0", class: "skill-glyph-path" }),
      node("polyline", { points: "32,12 32,20 36,16 32,12 28,16 32,20", class: "skill-glyph-accent" }),
      node("polyline", { points: "32,44 32,52 36,48 32,44 28,48 32,52", class: "skill-glyph-accent" })
    );
  } else if (type === "phase") {
    svg.append(
      node("rect", { x: "14", y: "18", width: "36", height: "28", rx: "8", class: "skill-glyph-wall" }),
      node("rect", { x: "18", y: "22", width: "28", height: "20", rx: "6", class: "skill-glyph-fill" }),
      node("path", { d: "M20 32c2-5 8-8 12-8s10 3 12 8", class: "skill-glyph-path" }),
      node("circle", { cx: "26", cy: "32", r: "3", class: "skill-glyph-node" }),
      node("circle", { cx: "38", cy: "32", r: "3", class: "skill-glyph-node" })
    );
  } else {
    svg.append(
      node("circle", { cx: "28", cy: "38", r: "12", class: "skill-glyph-fill" }),
      node("path", { d: "M36 30c2-8 10-10 16-14", class: "skill-glyph-path" }),
      node("polygon", { points: "46,12 50,14 54,12 52,16 54,20 50,18 46,20 48,16", class: "skill-glyph-accent" }),
      node("circle", { cx: "28", cy: "38", r: "6", class: "skill-glyph-node" })
    );
  }

  const wrap = doc.createElement("div");
  wrap.className = "skill-option-icon";
  wrap.append(svg);
  return wrap;
}

function createSkillOptionButton(doc, refs, { value, title, description, cooldownKey, cooldownRef, glyph }) {
  const btn = doc.createElement("button");
  btn.type = "button";
  btn.className = `skill-option behavior-${value}`;
  btn.dataset.value = value;
  btn.setAttribute("aria-pressed", "false");

  const icon = createSkillGlyph(doc, glyph || value);
  const textWrap = doc.createElement("div");
  textWrap.className = "skill-option-text";
  const name = doc.createElement("div");
  name.className = "skill-option-title";
  name.textContent = title;
  const desc = doc.createElement("div");
  desc.className = "skill-option-sub";
  desc.textContent = description;
  textWrap.append(name, desc);

  const meta = doc.createElement("div");
  meta.className = "skill-option-meta";
  const cooldownLabel = doc.createElement("div");
  cooldownLabel.className = "skill-option-meta-label";
  cooldownLabel.textContent = "Cooldown";
  const cooldownValue = createElement(doc, refs, "div", {
    ref: cooldownRef,
    className: "skill-option-meta-value",
    dataset: { cooldownFor: cooldownKey }
  });
  meta.append(cooldownLabel, cooldownValue);

  btn.append(icon, textWrap, meta);
  return btn;
}

function createSkillBehaviorRow(doc, refs, { id, label, options }) {
  const row = createElement(doc, refs, "div", {
    id,
    className: "skill-behavior-row",
    attrs: { role: "group", "aria-label": label }
  });
  const groupLabel = doc.createElement("div");
  groupLabel.className = "skill-row-label";
  groupLabel.textContent = label;

  row.append(groupLabel);
  options.forEach((option) => {
    const btn = createSkillOptionButton(doc, refs, option);
    row.append(btn);
  });
  return row;
}

function createSkillSettingsCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card settings-feature";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "Skill Behaviors";

  const matrix = doc.createElement("div");
  matrix.className = "skill-behavior-matrix";

  const headerRow = doc.createElement("div");
  headerRow.className = "skill-behavior-row skill-behavior-header";
  const spacer = doc.createElement("div");
  spacer.className = "skill-row-label spacer";
  spacer.setAttribute("aria-hidden", "true");
  const lowLabel = doc.createElement("div");
  lowLabel.className = "skill-column-label";
  lowLabel.textContent = "Lower Cooldown";
  const utilityLabel = doc.createElement("div");
  utilityLabel.className = "skill-column-label";
  utilityLabel.textContent = "Better Utility";
  headerRow.append(spacer, lowLabel, utilityLabel);

  const dashRow = createSkillBehaviorRow(doc, refs, {
    id: "dashBehaviorOptions",
    label: "Dash behavior",
    options: [
      {
        value: "ricochet",
        title: "Reflect",
        description: "Bounce off walls to keep the dash alive.",
        cooldownKey: "dash",
        cooldownRef: "dashCooldownValue"
      },
      {
        value: "destroy",
        title: "Break",
        description: "Shatter pipes on impact for a quick escape.",
        cooldownKey: "dashDestroy",
        cooldownRef: "dashDestroyCooldownValue"
      }
    ]
  });

  const slowRow = createSkillBehaviorRow(doc, refs, {
    id: "slowFieldBehaviorOptions",
    label: "Slow Field behavior",
    options: [
      {
        value: "slow",
        title: "Slow Field",
        description: "Drop a slowing air pocket that drags enemies.",
        cooldownKey: "slowField",
        cooldownRef: "slowFieldCooldownValue"
      },
      {
        value: "explosion",
        title: "Explode",
        description: "Launch a bomb that clears nearby pipes.",
        cooldownKey: "slowExplosion",
        cooldownRef: "slowExplosionCooldownValue"
      }
    ]
  });

  const teleportRow = createSkillBehaviorRow(doc, refs, {
    id: "teleportBehaviorOptions",
    label: "Teleport behavior",
    options: [
      {
        value: "normal",
        glyph: "teleport",
        title: "Teleport",
        description: "Blink to your cursor for precise repositioning.",
        cooldownKey: "teleport",
        cooldownRef: "teleportCooldownValue"
      },
      {
        value: "explode",
        glyph: "teleport",
        title: "Exploding Teleport",
        description: "Shatter any pipes you land on. Higher cooldown.",
        cooldownKey: "teleportExplode",
        cooldownRef: "teleportExplodeCooldownValue"
      }
    ]
  });

  const invulnRow = createSkillBehaviorRow(doc, refs, {
    id: "invulnBehaviorOptions",
    label: "Invulnerability behavior",
    options: [
      {
        value: "short",
        glyph: "phase",
        title: "Invulnerability (Short)",
        description: "A quick phase to dodge danger.",
        cooldownKey: "invulnShort",
        cooldownRef: "invulnShortCooldownValue"
      },
      {
        value: "long",
        glyph: "phase",
        title: "Invulnerability (Long)",
        description: "Lasts twice as long but recharges slower.",
        cooldownKey: "invulnLong",
        cooldownRef: "invulnLongCooldownValue"
      }
    ]
  });

  matrix.append(headerRow, dashRow, slowRow, teleportRow, invulnRow);
  card.append(title, matrix);
  refs.updateSkillCooldowns = (cfg) => applySkillCooldowns(refs, cfg);
  refs.updateSkillCooldowns(DEFAULT_CONFIG);
  return card;
}

function createThemeOverlay(doc, refs) {
  const overlay = createElement(doc, refs, "div", {
    id: "themeOverlay",
    className: "theme-overlay modal-layer hidden",
    attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "themeOverlayTitle", "aria-hidden": "true" }
  });

  const panel = doc.createElement("div");
  panel.className = "theme-overlay-panel";

  const header = doc.createElement("div");
  header.className = "theme-overlay-header";
  const title = doc.createElement("div");
  title.id = "themeOverlayTitle";
  title.className = "section-title";
  title.textContent = "Theme Studio";
  const close = createElement(doc, refs, "button", {
    id: "themeOverlayClose",
    className: "theme-overlay-close",
    attrs: { type: "button" },
    text: "Close"
  });
  header.append(title, close);

  const sub = doc.createElement("div");
  sub.className = "hint";
  sub.textContent = "Visual-only themes. Craft your perfect cockpit and watch the game respond instantly.";

  const toolbar = doc.createElement("div");
  toolbar.className = "theme-toolbar";

  const selectWrap = doc.createElement("div");
  selectWrap.className = "theme-select-wrap";
  const selectLabel = doc.createElement("div");
  selectLabel.className = "lbl";
  selectLabel.textContent = "Preset";
  const select = createElement(doc, refs, "select", {
    id: "themePresetSelect",
    className: "theme-select"
  });
  selectWrap.append(selectLabel, select);

  const actions = doc.createElement("div");
  actions.className = "theme-actions";
  actions.append(
    createElement(doc, refs, "button", { id: "themeResetBtn", text: "Reset preset" }),
    createElement(doc, refs, "button", { id: "themeRandomizeBtn", text: "Randomize all" }),
    createElement(doc, refs, "button", { id: "themeRandomAccentBtn", text: "Shuffle accents" })
  );

  toolbar.append(selectWrap, actions);

  const paletteTitle = doc.createElement("div");
  paletteTitle.className = "theme-subtitle";
  paletteTitle.textContent = "Palette capsules";
  const palettes = createElement(doc, refs, "div", { id: "themePaletteRow", className: "theme-palette-row" });

  const editor = createElement(doc, refs, "div", { id: "themeEditor", className: "theme-editor" });

  const exportTitle = doc.createElement("div");
  exportTitle.className = "theme-subtitle";
  exportTitle.textContent = "Export / Import";
  const exportField = createElement(doc, refs, "textarea", {
    id: "themeExportField",
    className: "theme-export-field",
    attrs: {
      rows: "3",
      placeholder: "Paste a base64 theme string here to import, or click Export to generate one."
    }
  });
  const exportActions = doc.createElement("div");
  exportActions.className = "theme-actions";
  exportActions.append(
    createElement(doc, refs, "button", { id: "themeExportBtn", text: "Export theme" }),
    createElement(doc, refs, "button", { id: "themeImportBtn", text: "Import theme" })
  );

  const status = createElement(doc, refs, "div", {
    id: "themeStatus",
    className: "hint good",
    text: "Theme ready."
  });

  panel.append(header, sub, toolbar, paletteTitle, palettes, editor, exportTitle, exportField, exportActions, status);
  overlay.append(panel);
  return overlay;
}

function createShopOverlay(doc, refs) {
  const overlay = createElement(doc, refs, "div", {
    id: "shopOverlay",
    className: "shop-overlay modal-layer hidden",
    attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "shopOverlayTitle", "aria-hidden": "true" }
  });

  const panel = doc.createElement("div");
  panel.className = "shop-overlay-panel";

  const header = doc.createElement("div");
  header.className = "shop-overlay-header";
  const title = doc.createElement("div");
  title.id = "shopOverlayTitle";
  title.className = "section-title";
  title.textContent = "Bustercoin Shop";
  const close = createElement(doc, refs, "button", {
    id: "shopOverlayClose",
    className: "shop-overlay-close",
    attrs: { type: "button" },
    text: "Close"
  });
  header.append(title, close);

  const tabs = createElement(doc, refs, "div", {
    id: "shopTabs",
    className: "shop-tabs"
  });
  [
    { id: "shopTabIcons", label: "Icons", type: "player_texture" },
    { id: "shopTabTrails", label: "Trails", type: "trail" },
    { id: "shopTabPipeTextures", label: "Pipe Textures", type: "pipe_texture" }
  ].forEach(({ id, label, type }, index) => {
    const btn = createElement(doc, refs, "button", {
      id,
      className: `shop-tab-btn${index === 0 ? " selected" : ""}`,
      text: label,
      attrs: { type: "button" },
      dataset: { shopType: type }
    });
    btn.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    tabs.append(btn);
  });

  const items = createElement(doc, refs, "div", {
    id: "shopItems",
    className: "shop-items"
  });

  const hint = createElement(doc, refs, "div", {
    id: "shopHint",
    className: "hint",
    text: "Pick a category to browse purchasable unlockables."
  });

  panel.append(header, tabs, items, hint);
  overlay.append(panel);
  return overlay;
}

function createPurchaseModal(doc, refs) {
  const overlay = createElement(doc, refs, "div", {
    id: "purchaseModal",
    className: "purchase-modal modal-layer hidden",
    attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "purchaseModalTitle", "aria-hidden": "true" }
  });

  const panel = doc.createElement("div");
  panel.className = "purchase-modal-panel";

  const header = doc.createElement("div");
  header.className = "purchase-modal-header";
  const title = doc.createElement("div");
  title.id = "purchaseModalTitle";
  title.className = "section-title";
  title.textContent = "Confirm Purchase";
  const close = createElement(doc, refs, "button", {
    id: "purchaseModalClose",
    className: "purchase-modal-close",
    attrs: { type: "button" },
    text: "Close"
  });
  header.append(title, close);

  const balance = createElement(doc, refs, "div", {
    id: "purchaseModalBalance",
    className: "purchase-modal-line",
    text: "Current Balance: 0"
  });

  const prompt = createElement(doc, refs, "div", {
    id: "purchaseModalPrompt",
    className: "purchase-modal-line",
    text: "Do you want to spend 0 on Item"
  });

  const status = createElement(doc, refs, "div", {
    id: "purchaseModalStatus",
    className: "hint"
  });

  const actions = doc.createElement("div");
  actions.className = "purchase-modal-actions";
  const cancel = createElement(doc, refs, "button", {
    id: "purchaseModalCancel",
    className: "cta-btn",
    attrs: { type: "button" },
    text: "Cancel"
  });
  const confirm = createElement(doc, refs, "button", {
    id: "purchaseModalConfirm",
    className: "cta-btn primary",
    attrs: { type: "button" },
    text: "Purchase"
  });
  actions.append(cancel, confirm);

  panel.append(header, balance, prompt, status, actions);
  overlay.append(panel);
  return overlay;
}

function createReplayModal(doc, refs) {
  const overlay = createElement(doc, refs, "div", {
    id: "replayModal",
    className: "replay-modal modal-layer hidden",
    attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "replayModalTitle", "aria-hidden": "true" }
  });

  const panel = doc.createElement("div");
  panel.className = "replay-modal-panel";

  const header = doc.createElement("div");
  header.className = "replay-modal-header";

  const title = createElement(doc, refs, "div", {
    id: "replayModalTitle",
    className: "section-title",
    text: "Replay"
  });

  const close = createElement(doc, refs, "button", {
    id: "replayModalClose",
    className: "replay-modal-close",
    attrs: { type: "button" },
    text: "Close",
    props: { disabled: true }
  });

  header.append(title, close);

  const status = createElement(doc, refs, "div", {
    id: "replayModalStatus",
    className: "hint replay-modal-line",
    text: "Select a leaderboard entry to view a replay."
  });

  panel.append(header, status);
  overlay.append(panel);
  return overlay;
}

function createAchievementsCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card achievements-card";

  const controls = doc.createElement("div");
  controls.className = "achievement-controls";
  const filters = doc.createElement("div");
  filters.className = "achievement-filter-group";

  const filterLabel = doc.createElement("div");
  filterLabel.className = "achievement-filter-label";
  filterLabel.textContent = "Filter by";

  const filterChecks = [
    { id: "achievementsFilterScore", label: "Score" },
    { id: "achievementsFilterPerfects", label: "Perfect Gaps" },
    { id: "achievementsFilterOrbs", label: "Orb Collection" },
    { id: "achievementsFilterPipes", label: "Pipes" }
  ].map(({ id, label }) => {
    const wrap = createElement(doc, refs, "label", { className: "checkbox pill" });
    const input = createElement(doc, refs, "input", { id, attrs: { type: "checkbox", checked: true } });
    const text = doc.createElement("span");
    text.textContent = label;
    wrap.append(input, text);
    return wrap;
  });

  filters.append(filterLabel, ...filterChecks);

  const hideCompletedToggle = createElement(doc, refs, "label", { className: "checkbox pill" });
  const hideCompletedInput = createElement(doc, refs, "input", {
    id: "achievementsHideCompleted",
    attrs: { type: "checkbox" }
  });
  const hideCompletedText = doc.createElement("span");
  hideCompletedText.textContent = "Hide completed";
  hideCompletedToggle.append(hideCompletedInput, hideCompletedText);

  controls.append(filters, hideCompletedToggle);

  const list = createElement(doc, refs, "div", { id: "achievementsList", className: "achievement-list" });
  list.style.maxHeight = "520px";

  card.append(controls, list);
  return card;
}

function createProfileCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "card card-soft";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "Your Profile";

  const field = doc.createElement("div");
  field.className = "field";
  const label = doc.createElement("div");
  label.className = "lbl";
  label.textContent = "Username";

  const row = doc.createElement("div");
  row.className = "minirow user-row";
  const input = createElement(doc, refs, "input", {
    id: "usernameInput",
    attrs: { type: "text", maxlength: "18", placeholder: "3–18 chars: letters, numbers, space, _ or -" }
  });
  const btn = createElement(doc, refs, "button", { id: "saveUserBtn", text: "Save" });
  row.append(input, btn);

  const userHint = createElement(doc, refs, "div", { id: "userHint", className: "hint warn", text: SIGNED_OUT_TEXT });

  const pills = doc.createElement("div");
  pills.className = "pills-row tight";
  const pbBadge = doc.createElement("div");
  pbBadge.className = "badge";
  pbBadge.textContent = "Personal best ";
  const pbText = createElement(doc, refs, "span", { id: "pbText", className: "kbd", text: "0" });
  pbBadge.append(pbText);

  const trailBadge = doc.createElement("div");
  trailBadge.className = "badge";
  trailBadge.textContent = "Trail ";
  const trailText = createElement(doc, refs, "span", { id: "trailText", className: "kbd", text: "classic" });
  trailBadge.append(trailText);

  const iconBadge = doc.createElement("div");
  iconBadge.className = "badge";
  iconBadge.textContent = "Icon ";
  const iconText = createElement(doc, refs, "span", { id: "iconText", className: "kbd", text: "High-Vis Orange" });
  iconBadge.append(iconText);

  const pipeTextureBadge = doc.createElement("div");
  pipeTextureBadge.className = "badge";
  pipeTextureBadge.textContent = "Pipes ";
  const pipeTextureText = createElement(doc, refs, "span", { id: "pipeTextureText", className: "kbd", text: "Basic" });
  pipeTextureBadge.append(pipeTextureText);

  const busterBadge = doc.createElement("div");
  busterBadge.className = "badge";
  busterBadge.textContent = "Bustercoins ";
  const bustercoinText = createElement(doc, refs, "span", { id: "bustercoinText", className: "kbd", text: "0" });
  busterBadge.append(bustercoinText);

  pills.append(pbBadge, trailBadge, iconBadge, pipeTextureBadge, busterBadge);

  field.append(label, row, userHint, pills);
  card.append(title, field);
  return card;
}

function createHighscoreCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "card hs-card";

  const heading = doc.createElement("div");
  heading.className = "row space-between";
  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "High Scores";
  const link = doc.createElement("a");
  link.className = "accent-link";
  link.href = "/highscores";
  link.textContent = "Full list";
  heading.append(title, link);

  const spacer = doc.createElement("div");
  spacer.className = "spacer-sm";

  const hsWrap = createElement(doc, refs, "div", { id: "hsWrap", className: "hsWrap hint", text: "Loading leaderboard…" });

  card.append(heading, spacer, hsWrap);
  return card;
}

function createMenuParallax(doc, refs) {
  const wrap = doc.createElement("div");
  wrap.className = "menu-parallax";
  const layers = [
    { className: "menu-parallax-layer menu-parallax-stars", depth: 8, tilt: 0.8 },
    { className: "menu-parallax-layer menu-parallax-dust", depth: 14, tilt: 1.1 },
    { className: "menu-parallax-layer menu-parallax-glow", depth: 22, tilt: 1.5 }
  ].map(({ className, depth, tilt }) => {
    const layer = doc.createElement("div");
    layer.className = className;
    layer.dataset.parallaxDepth = String(depth);
    layer.dataset.parallaxTilt = String(tilt);
    return layer;
  });
  wrap.append(...layers);
  refs.menuParallaxLayers = layers;
  refs.menuParallax = wrap;
  return wrap;
}

function createMenuScreen(doc, refs) {
  const screen = createElement(doc, refs, "div", { id: "menu", className: "screen" });
  const defaultView = doc?.defaultView || (typeof window !== "undefined" ? window : null);
  const trailOverlay = createTrailPreviewOverlay(doc, refs);
  const panel = doc.createElement("div");
  panel.className = "panel menu-panel";
  refs.menuPanel = panel;
  const parallax = createMenuParallax(doc, refs);
  const aurora = doc.createElement("div");
  aurora.className = "light-aurora";
  const offlineStatus = createElement(doc, refs, "div", {
    id: "offlineStatus",
    className: "menu-offline-status hidden",
    text: OFFLINE_STATUS_TEXT
  });
  const content = doc.createElement("div");
  content.className = "content-layer";

  const header = doc.createElement("div");
  header.className = "menu-header";
  const titleRow = doc.createElement("div");
  titleRow.className = "menu-title-row";
  const backSlot = doc.createElement("div");
  backSlot.className = "menu-back-slot";

  const achievementsBack = createElement(doc, refs, "label", {
    id: "achievementsHeaderBack",
    className: "menu-back achievements-back",
    attrs: { for: "viewMain", "aria-label": "Back to Main", title: "Back to Main" },
    text: "←"
  });
  achievementsBack.hidden = true;

  const settingsBack = createElement(doc, refs, "label", {
    id: "settingsHeaderBack",
    className: "menu-back settings-back",
    attrs: { for: "viewMain", "aria-label": "Back to Main", title: "Back to Main" },
    text: "←"
  });
  settingsBack.hidden = true;

  backSlot.append(achievementsBack, settingsBack);

  const titleShell = doc.createElement("div");
  titleShell.className = "menu-title-shell";
  const cloud = doc.createElement("div");
  cloud.className = "title-cloud";
  const title = createElement(doc, refs, "div", {
    id: "menuTitle",
    className: "title",
    text: "Flappy Bingus"
  });
  cloud.append(title);
  titleShell.append(cloud);

  const backPlaceholder = doc.createElement("div");
  backPlaceholder.className = "menu-back-slot menu-back-placeholder";
  const backGhost = doc.createElement("div");
  backGhost.className = "menu-back-ghost";
  backGhost.setAttribute("aria-hidden", "true");
  backPlaceholder.append(backGhost);

  titleRow.append(backSlot, titleShell, backPlaceholder);

  let subtitleText = formatWorldwideRuns(0);
  const subtitle = createElement(doc, refs, "p", {
    className: "sub menu-subtitle",
    text: subtitleText,
    ref: "menuSubtitle"
  });

  header.append(titleRow, subtitle);

  const viewMain = createElement(doc, refs, "input", {
    id: "viewMain",
    className: "tab-radio",
    attrs: { type: "radio", name: "view", checked: true }
  });
  const viewSettings = createElement(doc, refs, "input", {
    id: "viewSettings",
    className: "tab-radio",
    attrs: { type: "radio", name: "view" }
  });
  const viewAchievements = createElement(doc, refs, "input", {
    id: "viewAchievements",
    className: "tab-radio",
    attrs: { type: "radio", name: "view" }
  });

  const shell = doc.createElement("div");
  shell.className = "menu-shell";
  shell.dataset.view = "main";

  const mainCard = doc.createElement("div");
  mainCard.className = "card card-soft";
  const viewArea = doc.createElement("div");
  viewArea.className = "view-area";

  const mainPanel = doc.createElement("div");
  mainPanel.className = "panel-main tab-panel";
  const mainGrid = doc.createElement("div");
  mainGrid.className = "info-grid";
  mainGrid.append(createTrailCard(doc, refs), createHowToCard(doc, refs));
  const themeLauncher = createElement(doc, refs, "button", {
    id: "themeLauncher",
    className: "theme-launcher",
    text: "🖌️",
    attrs: { "aria-label": "Customize theme" }
  });
  const themeCallout = createElement(doc, refs, "div", {
    className: "nav-callout theme-callout",
    text: "↘ Change pipe colors and menu theme"
  });
  mainPanel.append(mainGrid);

  const settingsPanel = doc.createElement("div");
  settingsPanel.className = "panel-settings tab-panel";
  const settingsGrid = doc.createElement("div");
  settingsGrid.className = "info-grid settings-grid";
  settingsGrid.append(
    createSkillSettingsCard(doc, refs),
    createBindCard(doc, refs),
    createVolumeCard(doc, refs),
    createSeedCard(doc, refs),
    createStatusCard(doc, refs)
  );
  settingsPanel.append(settingsGrid);

  const achievementsPanel = doc.createElement("div");
  achievementsPanel.className = "panel-achievements tab-panel";
  const achievementsGrid = doc.createElement("div");
  achievementsGrid.className = "info-grid";
  achievementsGrid.append(createAchievementsCard(doc, refs));
  achievementsPanel.append(achievementsGrid);

  viewArea.append(mainPanel, settingsPanel, achievementsPanel);
  mainCard.append(viewArea);

  const menuBody = doc.createElement("div");
  menuBody.className = "menu-body";
  menuBody.append(viewMain, viewSettings, viewAchievements, shell);

  const sideStack = doc.createElement("div");
  sideStack.className = "side-stack";
  sideStack.append(createProfileCard(doc, refs), createHighscoreCard(doc, refs));

  shell.append(mainCard, sideStack, themeLauncher, themeCallout, createThemeOverlay(doc, refs));
  const achievementsHeaderBack = refs.achievementsHeaderBack;
  const settingsHeaderBack = refs.settingsHeaderBack;

  const achievementsNav = mainPanel.querySelector('[for="viewAchievements"]');
  const settingsNav = mainPanel.querySelector('[for="viewSettings"]');

  const updateMenuView = () => {
    const view = viewSettings.checked ? "settings" : viewAchievements.checked ? "achievements" : "main";
    shell.dataset.view = view;
    sideStack.hidden = view !== "main";
    title.textContent = view === "settings" ? "Settings" : view === "achievements" ? "Achievements" : "Flappy Bingus";
    subtitle.hidden = view === "achievements";
    if (achievementsHeaderBack) achievementsHeaderBack.hidden = view !== "achievements";
    if (settingsHeaderBack) settingsHeaderBack.hidden = view !== "settings";
    if (view !== "achievements") subtitle.textContent = subtitleText;
  };

  refs.setMenuSubtitle = (nextText) => {
    if (typeof nextText !== "string" || nextText.trim() === "") return;
    subtitleText = nextText;
    if (!viewAchievements.checked) {
      subtitle.textContent = subtitleText;
    }
  };

  const wireNav = (el, radio) => {
    if (!el || !radio) return;
    const emitChange = () => {
      const EventCtor = defaultView?.Event || (typeof Event === "function" ? Event : null);
      if (EventCtor) {
        radio.dispatchEvent(new EventCtor("change", { bubbles: true }));
      } else if (doc && typeof doc.createEvent === "function") {
        const evt = doc.createEvent("Event");
        evt.initEvent("change", true, true);
        radio.dispatchEvent(evt);
      }
    };
    const activate = () => {
      radio.checked = true;
      emitChange();
    };
    el.addEventListener("click", activate);
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        activate();
      }
    });
  };

  wireNav(achievementsNav, viewAchievements);
  wireNav(settingsNav, viewSettings);

  [viewMain, viewSettings, viewAchievements].forEach(radio => {
    radio.addEventListener("change", updateMenuView);
  });
  updateMenuView();
  content.append(header, menuBody);
  panel.append(parallax, aurora, offlineStatus, content);
  screen.append(
    trailOverlay,
    panel,
    createShopOverlay(doc, refs),
    createPurchaseModal(doc, refs),
    createReplayModal(doc, refs)
  );
  return screen;
}

function createOverScreen(doc, refs) {
  const screen = createElement(doc, refs, "div", { id: "over", className: "screen hidden" });
  const panel = doc.createElement("div");
  panel.className = "panel over-panel";

  const title = doc.createElement("div");
  title.className = "title danger";
  title.textContent = "GAME OVER";

  const subtitle = doc.createElement("p");
  subtitle.className = "sub over-subtitle";
  subtitle.textContent = "";
  subtitle.hidden = true;

  const primaryActions = doc.createElement("div");
  primaryActions.className = "row actions-row over-primary-actions";
  const restartButton = createElement(doc, refs, "button", { id: "restart", text: "Restart" });
  const menuButton = createElement(doc, refs, "button", { id: "toMenu", text: "Main Menu" });
  const retrySeedButton = createElement(doc, refs, "button", { id: "retrySeed", text: "Retry Previous Seed" });
  retrySeedButton.hidden = true;
  primaryActions.append(
    restartButton,
    menuButton,
    retrySeedButton
  );

  const summary = doc.createElement("div");
  summary.className = "over-summary";

  const finalCard = doc.createElement("div");
  finalCard.className = "over-stat-card over-final-card";
  const durationWrap = doc.createElement("div");
  durationWrap.className = "over-duration";
  const durationLabel = createElement(doc, refs, "div", {
    className: "over-stat-label over-duration-label",
    text: "Run duration"
  });
  const durationValue = createElement(doc, refs, "div", {
    id: "overDuration",
    className: "over-duration-value",
    text: "0:00"
  });
  durationWrap.append(durationLabel, durationValue);
  const finalLabel = doc.createElement("div");
  finalLabel.className = "over-stat-label over-final-label";
  finalLabel.textContent = "Final score";
  const final = createElement(doc, refs, "span", { id: "final", className: "over-final-score", text: "0" });
  const bestStack = doc.createElement("div");
  bestStack.className = "over-best-stack";
  const bestLine = doc.createElement("div");
  bestLine.className = "over-best-line";
  const bestLabel = doc.createElement("div");
  bestLabel.className = "over-stat-label over-best-label";
  bestLabel.textContent = "Personal Best:";
  const bestValue = createElement(doc, refs, "span", { id: "overPB", className: "over-personal-best", text: "0" });
  const bestBadge = createElement(doc, refs, "div", {
    id: "overPbBadge",
    className: "over-pb-badge hidden",
    text: "New personal best!"
  });
  bestLine.append(bestLabel, bestValue);
  bestStack.append(bestLine, bestBadge);
  finalCard.append(durationWrap, finalLabel, final, bestStack);

  const orbComboCard = doc.createElement("div");
  orbComboCard.className = "over-stat-card";
  const orbComboLabel = createElement(doc, refs, "div", { id: "overOrbComboLabel", className: "over-stat-label", text: "Best orb combo (this run)" });
  const orbComboValue = createElement(doc, refs, "span", { id: "overOrbCombo", className: "over-stat-value", text: "0" });
  orbComboCard.append(orbComboLabel, orbComboValue);

  const perfectComboCard = doc.createElement("div");
  perfectComboCard.className = "over-stat-card";
  const perfectComboLabel = createElement(doc, refs, "div", { id: "overPerfectComboLabel", className: "over-stat-label", text: "Best perfect combo (this run)" });
  const perfectComboValue = createElement(doc, refs, "span", { id: "overPerfectCombo", className: "over-stat-value", text: "0" });
  perfectComboCard.append(perfectComboLabel, perfectComboValue);

  summary.append(finalCard);

  const pbStatus = createElement(doc, refs, "div", {
    id: "overPbStatus",
    className: "over-pb-status",
    text: ""
  });
  pbStatus.hidden = true;

  const breakdown = doc.createElement("div");
  breakdown.className = "score-breakdown";
  const breakdownTitle = doc.createElement("div");
  breakdownTitle.className = "section-title";
  breakdownTitle.textContent = "Score breakdown";
  const breakdownList = createElement(doc, refs, "div", {
    id: "scoreBreakdown",
    className: "score-breakdown-list"
  });
  breakdown.append(breakdownTitle, breakdownList);

  const stats = doc.createElement("div");
  stats.className = "over-stats";
  const statsHeader = doc.createElement("div");
  statsHeader.className = "over-stats-header";
  const statsTitle = doc.createElement("div");
  statsTitle.className = "section-title";
  statsTitle.textContent = "Stats";
  const statsMode = createElement(doc, refs, "div", { id: "overStatsMode", className: "over-stats-mode", text: "Run stats" });
  const statsToggle = createElement(doc, refs, "button", { id: "overStatsToggle", className: "cta-btn small", text: "Show lifetime stats" });
  statsHeader.append(statsTitle, statsMode, statsToggle);
  const statsGrid = doc.createElement("div");
  statsGrid.className = "over-stats-grid";
  statsGrid.append(orbComboCard, perfectComboCard);

  const skillUsage = doc.createElement("div");
  skillUsage.className = "skill-usage";
  const skillUsageTitle = createElement(doc, refs, "div", { id: "skillUsageTitle", className: "section-title", text: "Skill usage (this run)" });
  const skillUsageList = createElement(doc, refs, "div", {
    id: "skillUsageStats",
    className: "skill-usage-list two-column"
  });
  skillUsage.append(skillUsageTitle, skillUsageList);
  stats.append(statsHeader, statsGrid, skillUsage);

  const details = doc.createElement("div");
  details.className = "over-details";
  const achievements = doc.createElement("div");
  achievements.className = "over-achievements";
  achievements.hidden = true;
  const achievementsTitle = createElement(doc, refs, "div", {
    className: "section-title",
    text: "New achievements"
  });
  const achievementsList = createElement(doc, refs, "div", {
    id: "overAchievementsList",
    className: "over-achievements-list scrollable"
  });
  achievements.append(achievementsTitle, achievementsList);
  refs.overAchievements = achievements;

  details.append(breakdown, stats, achievements);

  const replayStatus = createElement(doc, refs, "div", {
    id: "replayStatus",
    className: "hint space-top replay-hint",
    text: "Replay will be available after a run."
  });

  const replayActions = doc.createElement("div");
  replayActions.className = "row actions-row over-replay-actions";
  const exportMp4Button = createElement(doc, refs, "button", { id: "exportMp4", text: "Export MP4", props: { disabled: true } });
  exportMp4Button.hidden = true;
  replayActions.append(
    createElement(doc, refs, "button", { id: "watchReplay", text: "Watch Replay" }),
    createElement(doc, refs, "button", { id: "exportGif", text: "Export GIF", props: { disabled: true } }),
    exportMp4Button
  );

  const shortcuts = doc.createElement("div");
  shortcuts.className = "stats";
  shortcuts.innerHTML = 'Shortcuts: <span class="kbd">R</span> restart, <span class="kbd">Esc</span> menu.';

  panel.append(title, subtitle, primaryActions, summary, pbStatus, details, replayActions, replayStatus);
  screen.append(panel, shortcuts);
  return screen;
}

export function buildGameUI({ document = window.document, mount } = {}) {
  const doc = document || window.document;
  const target = mount || doc.getElementById("app") || doc.body;
  const refs = {};

  // Refresh host container to avoid duplicate shells when rerunning in tests.
  if (target === doc.body) {
    const existing = target.querySelector("#wrap");
    if (existing) existing.remove();
  } else {
    target.innerHTML = "";
  }

  const wrap = createElement(doc, refs, "div", { id: "wrap" });
  const canvas = createElement(doc, refs, "canvas", { id: "c" });

  const achievementToasts = createElement(doc, refs, "div", {
    id: "achievementToasts",
    className: "achievement-toasts"
  });

  wrap.append(canvas, createMenuScreen(doc, refs), createOverScreen(doc, refs), achievementToasts);
  target.append(wrap);

  return {
    ...refs,
    root: wrap,
    menu: refs.menu || wrap.querySelector("#menu"),
    over: refs.over || wrap.querySelector("#over"),
    canvas
  };
}

export const __testables = {
  createMenuScreen,
  createOverScreen,
  applySkillCooldowns,
  formatCooldownSeconds
};
