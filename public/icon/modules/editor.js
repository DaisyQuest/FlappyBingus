const UNLOCK_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "score", label: "Score" },
  { value: "achievement", label: "Achievement" },
  { value: "purchase", label: "Purchase" },
  { value: "record", label: "Record holder" }
];

const PATTERN_OPTIONS = [
  { value: "", label: "None" },
  { value: "zigzag", label: "Zigzag" },
  { value: "centerline", label: "Centerline" },
  { value: "stripes", label: "Stripes" },
  { value: "honeycomb", label: "Honeycomb" },
  { value: "citrus_slice", label: "Citrus Slice" },
  { value: "cobblestone", label: "Cobblestone" }
];

const ANIMATION_OPTIONS = [
  { value: "", label: "None" },
  { value: "lava", label: "Lava Flow" },
  { value: "cape_flow", label: "Cape Flow" },
  { value: "zigzag_scroll", label: "Zigzag Scroll" }
];

const COLOR_SWATCHES = [
  "#ffffff",
  "#0f172a",
  "#38bdf8",
  "#22c55e",
  "#facc15",
  "#fb7185",
  "#f97316",
  "#a855f7",
  "#f472b6",
  "#94a3b8"
];

function formatDefault(value) {
  if (value === undefined || value === null) return "—";
  if (Array.isArray(value)) return value.map((v) => formatDefault(v)).join(" → ");
  if (typeof value === "object") return "object";
  return String(value);
}

function createFieldRow(labelText, input, defaultValue, options = {}) {
  const row = document.createElement("div");
  row.className = "field-row";
  const label = document.createElement("label");
  label.textContent = labelText;
  row.append(label, input);
  if (options.swatches) {
    row.appendChild(createColorSwatches(input, options.swatches));
  }
  if (defaultValue !== undefined) {
    const hint = document.createElement("small");
    hint.textContent = `Default: ${formatDefault(defaultValue)}`;
    row.appendChild(hint);
  }
  return row;
}

function createTextInput(value = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value ?? "";
  return input;
}

function createNumberInput(value = "") {
  const input = document.createElement("input");
  input.type = "number";
  input.value = value === null || value === undefined ? "" : String(value);
  input.step = "any";
  return input;
}

function createSelect(options, value = "") {
  const select = document.createElement("select");
  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });
  select.value = value ?? "";
  return select;
}

function createColorSwatches(input, { isListMode, onSelect } = {}) {
  const row = document.createElement("div");
  row.className = "color-swatch-row";
  const swatches = document.createElement("div");
  swatches.className = "color-swatches";
  COLOR_SWATCHES.forEach((hex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-swatch";
    button.dataset.color = hex;
    button.setAttribute("aria-label", `Set color ${hex}`);
    button.style.background = hex;
    button.addEventListener("click", () => {
      if (typeof onSelect === "function") {
        onSelect(hex);
        return;
      }
      const listMode = typeof isListMode === "function"
        ? isListMode()
        : input.dataset.colorList === "true";
      if (listMode) {
        const values = input.value.split(",").map((entry) => entry.trim()).filter(Boolean);
        values.push(hex);
        input.value = values.join(", ");
      } else {
        input.value = hex;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    swatches.appendChild(button);
  });
  row.appendChild(swatches);
  return row;
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseText(value) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : undefined;
}

function parseColorList(value) {
  const text = parseText(value);
  if (!text) return undefined;
  return text.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function createPatternGroup(type, fields, values = {}, defaults = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "field-grid";
  wrapper.dataset.patternGroup = type;
  fields.forEach(({ key, label, type: inputType, isColor = false, isColorList = false }) => {
    const input = inputType === "number"
      ? createNumberInput(values?.[key])
      : createTextInput(values?.[key] ?? "");
    input.dataset.field = `pattern.${key}`;
    if (isColorList) input.dataset.colorList = "true";
    wrapper.appendChild(createFieldRow(
      label,
      input,
      defaults?.[key],
      isColor || isColorList ? { swatches: {} } : {}
    ));
  });
  return wrapper;
}

function createAnimationGroup(type, fields, values = {}, defaults = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "field-grid";
  wrapper.dataset.animationGroup = type;
  fields.forEach(({ key, label, type: inputType, isColor = false }) => {
    const input = inputType === "number"
      ? createNumberInput(values?.[key])
      : createTextInput(values?.[key] ?? "");
    input.dataset.field = `animation.${key}`;
    wrapper.appendChild(createFieldRow(
      label,
      input,
      defaults?.[key],
      isColor ? { swatches: {} } : {}
    ));
  });
  return wrapper;
}

function updatePatternVisibility(card) {
  const select = card.querySelector("[data-field='patternType']");
  if (!select) return;
  card.querySelectorAll("[data-pattern-group]").forEach((group) => {
    group.classList.toggle("hidden", group.dataset.patternGroup !== select.value);
  });
}

function updateAnimationVisibility(card) {
  const select = card.querySelector("[data-field='animationType']");
  if (!select) return;
  card.querySelectorAll("[data-animation-group]").forEach((group) => {
    group.classList.toggle("hidden", group.dataset.animationGroup !== select.value);
  });
}

function createIconCard({ icon, allowRemove = false } = {}) {
  const card = document.createElement("section");
  card.className = "icon-card";
  card.dataset.iconCard = "true";

  const header = document.createElement("header");
  const titleWrap = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = icon?.name || icon?.id || "New icon";
  titleWrap.append(heading);

  header.append(titleWrap);
  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "icon-card-body";

  const preview = document.createElement("div");
  preview.className = "icon-preview";
  const previewWrap = document.createElement("div");
  previewWrap.dataset.iconPreview = "true";
  preview.append(previewWrap);
  body.appendChild(preview);

  const controls = document.createElement("div");
  controls.className = "icon-controls";

  const basic = document.createElement("section");
  basic.className = "section-card";
  basic.innerHTML = "<strong>Basics</strong>";
  const basicGrid = document.createElement("div");
  basicGrid.className = "field-grid";
  const idInput = createTextInput(icon?.id || "");
  idInput.dataset.field = "id";
  const nameInput = createTextInput(icon?.name || "");
  nameInput.dataset.field = "name";
  const imageInput = createTextInput(icon?.imageSrc || "");
  imageInput.dataset.field = "imageSrc";
  basicGrid.append(
    createFieldRow("ID", idInput),
    createFieldRow("Name", nameInput),
    createFieldRow("Image src", imageInput)
  );
  basic.appendChild(basicGrid);

  const unlock = document.createElement("section");
  unlock.className = "section-card";
  unlock.innerHTML = "<strong>Unlock</strong>";
  const unlockGrid = document.createElement("div");
  unlockGrid.className = "field-grid";
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

  const colors = document.createElement("section");
  colors.className = "section-card";
  colors.innerHTML = "<strong>Style</strong>";
  const colorGrid = document.createElement("div");
  colorGrid.className = "field-grid";
  const fill = createTextInput(icon?.style?.fill || "");
  fill.dataset.field = "fill";
  const core = createTextInput(icon?.style?.core || "");
  core.dataset.field = "core";
  const rim = createTextInput(icon?.style?.rim || "");
  rim.dataset.field = "rim";
  const glow = createTextInput(icon?.style?.glow || "");
  glow.dataset.field = "glow";
  colorGrid.append(
    createFieldRow("Fill", fill, undefined, { swatches: {} }),
    createFieldRow("Core", core, undefined, { swatches: {} }),
    createFieldRow("Rim", rim, undefined, { swatches: {} }),
    createFieldRow("Glow", glow, undefined, { swatches: {} })
  );
  colors.appendChild(colorGrid);

  const patternSection = document.createElement("section");
  patternSection.className = "section-card";
  patternSection.innerHTML = "<strong>Pattern</strong>";
  const patternSelect = createSelect(PATTERN_OPTIONS, icon?.style?.pattern?.type || "");
  patternSelect.dataset.field = "patternType";
  patternSection.appendChild(createFieldRow("Pattern", patternSelect));

  const patternFields = [
    createPatternGroup("zigzag", [
      { key: "stroke", label: "Stroke", type: "text", isColor: true },
      { key: "background", label: "Background", type: "text", isColor: true },
      { key: "amplitude", label: "Amplitude", type: "number" },
      { key: "waves", label: "Waves", type: "number" },
      { key: "spacing", label: "Spacing", type: "number" }
    ], icon?.style?.pattern || {}),
    createPatternGroup("centerline", [
      { key: "stroke", label: "Stroke", type: "text", isColor: true },
      { key: "accent", label: "Accent", type: "text", isColor: true },
      { key: "glow", label: "Glow", type: "text", isColor: true }
    ], icon?.style?.pattern || {}),
    createPatternGroup("stripes", [
      { key: "colors", label: "Colors (comma)", type: "text", isColorList: true },
      { key: "stripeWidth", label: "Stripe width", type: "number" },
      { key: "angle", label: "Angle", type: "number" },
      { key: "glow", label: "Glow", type: "text", isColor: true }
    ], icon?.style?.pattern || {}),
    createPatternGroup("honeycomb", [
      { key: "stroke", label: "Stroke", type: "text", isColor: true },
      { key: "lineWidth", label: "Line width", type: "number" },
      { key: "cellSize", label: "Cell size", type: "number" },
      { key: "glow", label: "Glow", type: "text", isColor: true }
    ], icon?.style?.pattern || {}),
    createPatternGroup("citrus_slice", [
      { key: "stroke", label: "Stroke", type: "text", isColor: true },
      { key: "lineWidth", label: "Line width", type: "number" },
      { key: "segments", label: "Segments", type: "number" },
      { key: "centerRadius", label: "Center radius", type: "number" },
      { key: "glow", label: "Glow", type: "text", isColor: true },
      { key: "rindStroke", label: "Rind stroke", type: "text", isColor: true },
      { key: "segmentStroke", label: "Segment stroke", type: "text", isColor: true },
      { key: "segmentWidth", label: "Segment width", type: "number" }
    ], icon?.style?.pattern || {}),
    createPatternGroup("cobblestone", [
      { key: "base", label: "Base", type: "text", isColor: true },
      { key: "highlight", label: "Highlight", type: "text", isColor: true },
      { key: "stroke", label: "Stroke", type: "text", isColor: true },
      { key: "glow", label: "Glow", type: "text", isColor: true },
      { key: "lineWidth", label: "Line width", type: "number" },
      { key: "stoneSize", label: "Stone size", type: "number" },
      { key: "gap", label: "Gap", type: "number" }
    ], icon?.style?.pattern || {})
  ];
  patternFields.forEach((group) => patternSection.appendChild(group));

  const animationSection = document.createElement("section");
  animationSection.className = "section-card";
  animationSection.innerHTML = "<strong>Animation</strong>";
  const animationSelect = createSelect(ANIMATION_OPTIONS, icon?.style?.animation?.type || "");
  animationSelect.dataset.field = "animationType";
  animationSection.appendChild(createFieldRow("Animation", animationSelect));

  const animationFields = [
    createAnimationGroup("lava", [
      { key: "speed", label: "Speed", type: "number" },
      { key: "layers", label: "Layers", type: "number" },
      { key: "smoothness", label: "Smoothness", type: "number" },
      { key: "fallback", label: "Fallback", type: "text", isColor: true },
      { key: "paletteBase", label: "Palette base", type: "text", isColor: true },
      { key: "paletteEmber", label: "Palette ember", type: "text", isColor: true },
      { key: "paletteMolten", label: "Palette molten", type: "text", isColor: true },
      { key: "paletteFlare", label: "Palette flare", type: "text", isColor: true }
    ], {
      speed: icon?.style?.animation?.speed,
      layers: icon?.style?.animation?.layers,
      smoothness: icon?.style?.animation?.smoothness,
      fallback: icon?.style?.animation?.fallback,
      paletteBase: icon?.style?.animation?.palette?.base,
      paletteEmber: icon?.style?.animation?.palette?.ember,
      paletteMolten: icon?.style?.animation?.palette?.molten,
      paletteFlare: icon?.style?.animation?.palette?.flare
    }),
    createAnimationGroup("cape_flow", [
      { key: "speed", label: "Speed", type: "number" },
      { key: "bands", label: "Bands", type: "number" },
      { key: "embers", label: "Embers", type: "number" },
      { key: "paletteBase", label: "Palette base", type: "text", isColor: true },
      { key: "paletteAsh", label: "Palette ash", type: "text", isColor: true },
      { key: "paletteEmber", label: "Palette ember", type: "text", isColor: true },
      { key: "paletteMolten", label: "Palette molten", type: "text", isColor: true },
      { key: "paletteFlare", label: "Palette flare", type: "text", isColor: true }
    ], {
      speed: icon?.style?.animation?.speed,
      bands: icon?.style?.animation?.bands,
      embers: icon?.style?.animation?.embers,
      paletteBase: icon?.style?.animation?.palette?.base,
      paletteAsh: icon?.style?.animation?.palette?.ash,
      paletteEmber: icon?.style?.animation?.palette?.ember,
      paletteMolten: icon?.style?.animation?.palette?.molten,
      paletteFlare: icon?.style?.animation?.palette?.flare
    }),
    createAnimationGroup("zigzag_scroll", [
      { key: "speed", label: "Speed", type: "number" }
    ], {
      speed: icon?.style?.animation?.speed
    })
  ];
  animationFields.forEach((group) => animationSection.appendChild(group));

  controls.append(basic, unlock, colors, patternSection, animationSection);
  body.appendChild(controls);
  card.appendChild(body);

  if (allowRemove) {
    const actions = document.createElement("div");
    actions.className = "icon-actions";
    const disableBtn = document.createElement("button");
    disableBtn.type = "button";
    disableBtn.textContent = "Clear unlock to free";
    disableBtn.addEventListener("click", () => {
      unlockType.value = "free";
      unlockLabel.value = "";
      unlockId.value = "";
      unlockScore.value = "";
      unlockCost.value = "";
      unlockCurrency.value = "";
    });
    actions.append(disableBtn);
    card.appendChild(actions);
  }

  patternSelect.addEventListener("change", () => updatePatternVisibility(card));
  animationSelect.addEventListener("change", () => updateAnimationVisibility(card));
  updatePatternVisibility(card);
  updateAnimationVisibility(card);

  return card;
}

function readIconDefinition(card) {
  const id = parseText(card.querySelector("[data-field='id']")?.value);
  if (!id) return null;
  const icon = { id };
  const name = parseText(card.querySelector("[data-field='name']")?.value);
  if (name) icon.name = name;
  const imageSrcRaw = card.querySelector("[data-field='imageSrc']")?.value;
  if (imageSrcRaw !== undefined) {
    const imageSrc = String(imageSrcRaw).trim();
    if (imageSrc.length) icon.imageSrc = imageSrc;
    else icon.imageSrc = "";
  }

  const unlockType = card.querySelector("[data-field='unlockType']")?.value || "free";
  const unlock = { type: unlockType };
  const unlockLabel = parseText(card.querySelector("[data-field='unlockLabel']")?.value);
  if (unlockLabel) unlock.label = unlockLabel;
  if (unlockType === "score") {
    const minScore = parseNumber(card.querySelector("[data-field='unlockScore']")?.value);
    if (minScore !== undefined) unlock.minScore = minScore;
  } else if (unlockType === "achievement") {
    const unlockId = parseText(card.querySelector("[data-field='unlockId']")?.value);
    if (unlockId) unlock.id = unlockId;
  } else if (unlockType === "purchase") {
    const cost = parseNumber(card.querySelector("[data-field='unlockCost']")?.value);
    if (cost !== undefined) unlock.cost = cost;
    const currencyId = parseText(card.querySelector("[data-field='unlockCurrency']")?.value);
    if (currencyId) unlock.currencyId = currencyId;
  }
  icon.unlock = unlock;

  const style = {};
  let hasStyle = false;
  const fill = parseText(card.querySelector("[data-field='fill']")?.value);
  const core = parseText(card.querySelector("[data-field='core']")?.value);
  const rim = parseText(card.querySelector("[data-field='rim']")?.value);
  const glow = parseText(card.querySelector("[data-field='glow']")?.value);
  if (fill) {
    style.fill = fill;
    hasStyle = true;
  }
  if (core) {
    style.core = core;
    hasStyle = true;
  }
  if (rim) {
    style.rim = rim;
    hasStyle = true;
  }
  if (glow) {
    style.glow = glow;
    hasStyle = true;
  }

  const patternType = card.querySelector("[data-field='patternType']")?.value || "";
  if (patternType) {
    const pattern = { type: patternType };
    card.querySelectorAll("[data-field^='pattern.']").forEach((input) => {
      const key = input.dataset.field.replace("pattern.", "");
      const value = key === "colors" ? parseColorList(input.value) : parseText(input.value);
      const numberValue = ["amplitude", "waves", "spacing", "stripeWidth", "angle", "lineWidth", "cellSize", "segments", "centerRadius", "segmentWidth", "stoneSize", "gap"].includes(key)
        ? parseNumber(input.value)
        : value;
      if (numberValue !== undefined) pattern[key] = numberValue;
    });
    style.pattern = pattern;
    hasStyle = true;
  } else {
    style.pattern = null;
    hasStyle = true;
  }

  const animationType = card.querySelector("[data-field='animationType']")?.value || "";
  if (animationType) {
    const animation = { type: animationType };
    card.querySelectorAll("[data-field^='animation.']").forEach((input) => {
      const key = input.dataset.field.replace("animation.", "");
      if (key.startsWith("palette")) {
        const paletteKey = key.replace("palette", "").toLowerCase();
        const value = parseText(input.value);
        if (value) {
          animation.palette = animation.palette || {};
          animation.palette[paletteKey] = value;
        }
      } else {
        const num = parseNumber(input.value);
        if (num !== undefined) animation[key] = num;
        else {
          const value = parseText(input.value);
          if (value) animation[key] = value;
        }
      }
    });
    style.animation = animation;
    hasStyle = true;
  } else {
    style.animation = null;
    hasStyle = true;
  }

  if (hasStyle) icon.style = style;
  return icon;
}

function collectIconOverrides(root) {
  const overrides = {};
  const cards = root.querySelectorAll("[data-icon-card]");
  cards.forEach((card) => {
    const icon = readIconDefinition(card);
    if (!icon?.id) return;
    const override = { ...icon };
    delete override.id;
    overrides[icon.id] = override;
  });
  return overrides;
}

export {
  createIconCard,
  collectIconOverrides,
  readIconDefinition
};
