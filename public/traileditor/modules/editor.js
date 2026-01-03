const SHAPE_OPTIONS = [
  { value: "", label: "Inherit" },
  { value: "circle", label: "Circle" },
  { value: "star", label: "Star" },
  { value: "heart", label: "Heart" },
  { value: "hexagon", label: "Honeycomb Hex" },
  { value: "pixel", label: "Pixel" },
  { value: "lemon_slice", label: "Lemon Slice" },
  { value: "petal", label: "Petal" },
  { value: "leaf", label: "Leaf" }
];

const MODE_OPTIONS = [
  { value: "trail", label: "Trail" },
  { value: "sparkle", label: "Sparkle" },
  { value: "glint", label: "Glint" },
  { value: "aura", label: "Aura" }
];

const BOOL_OPTIONS = [
  { value: "", label: "Inherit" },
  { value: "true", label: "On" },
  { value: "false", label: "Off" }
];

const COLOR_MODE_OPTIONS = [
  { value: "", label: "Inherit" },
  { value: "fixed", label: "Fixed" },
  { value: "palette", label: "Palette" }
];

function formatDefault(value) {
  if (value === undefined || value === null) return "—";
  if (Array.isArray(value)) return value.map((v) => formatDefault(v)).join(" → ");
  if (typeof value === "function") return "function";
  if (typeof value === "object") return "object";
  return String(value);
}

function createFieldRow(labelText, input, defaultValue) {
  const row = document.createElement("div");
  row.className = "field-row";
  const label = document.createElement("label");
  label.textContent = labelText;
  row.append(label, input);
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
  input.value = value;
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

function createRangeFields({ label, key, value, defaults }) {
  const wrapper = document.createElement("div");
  wrapper.className = "field-grid";
  const minInput = createNumberInput(value?.[0] ?? "");
  minInput.dataset.field = `${key}Min`;
  const maxInput = createNumberInput(value?.[1] ?? "");
  maxInput.dataset.field = `${key}Max`;
  wrapper.append(
    createFieldRow(`${label} min`, minInput, defaults?.[0]),
    createFieldRow(`${label} max`, maxInput, defaults?.[1])
  );
  return wrapper;
}

function createColorFields({ group, defaults }) {
  const mode = Array.isArray(group?.color)
    ? "palette"
    : (typeof group?.color === "string" ? "fixed" : "");
  const value = Array.isArray(group?.color)
    ? group.color.join(", ")
    : (typeof group?.color === "string" ? group.color : "");
  const modeSelect = createSelect(COLOR_MODE_OPTIONS, mode);
  modeSelect.dataset.field = "colorMode";
  const valueInput = createTextInput(value);
  valueInput.dataset.field = "colorValue";
  const defaultValue = defaults?.color;
  const wrapper = document.createElement("div");
  wrapper.className = "field-grid";
  wrapper.append(
    createFieldRow("Color mode", modeSelect, defaultValue ? formatDefault(defaultValue) : "inherit"),
    createFieldRow("Color value", valueInput)
  );
  return wrapper;
}

function createGroupSection({
  title,
  groupKey,
  group = {},
  defaults = {},
  includeMode = false,
  includeOrbit = false,
  includeTwinkle = false,
  includeHueRate = false,
  includeBanding = false
} = {}) {
  const section = document.createElement("section");
  section.className = "trail-group";
  section.dataset.group = groupKey;
  const heading = document.createElement("h4");
  heading.textContent = title;
  section.appendChild(heading);

  const basic = document.createElement("div");
  basic.className = "field-grid";
  const rate = createNumberInput(group.rate ?? "");
  rate.dataset.field = "rate";
  basic.appendChild(createFieldRow("Rate", rate, defaults.rate));

  const drag = createNumberInput(group.drag ?? "");
  drag.dataset.field = "drag";
  basic.appendChild(createFieldRow("Drag", drag, defaults.drag));

  const add = createSelect(BOOL_OPTIONS, group.add === true ? "true" : group.add === false ? "false" : "");
  add.dataset.field = "add";
  basic.appendChild(createFieldRow("Additive", add, defaults.add));

  const particleShape = createSelect(SHAPE_OPTIONS, group.particleShape ?? "");
  particleShape.dataset.field = "particleShape";
  basic.appendChild(createFieldRow("Particle shape", particleShape, defaults.particleShape));

  section.appendChild(basic);
  section.appendChild(createRangeFields({
    label: "Life",
    key: "life",
    value: group.life,
    defaults: defaults.life
  }));
  section.appendChild(createRangeFields({
    label: "Size",
    key: "size",
    value: group.size,
    defaults: defaults.size
  }));
  section.appendChild(createRangeFields({
    label: "Speed",
    key: "speed",
    value: group.speed,
    defaults: defaults.speed
  }));
  section.appendChild(createColorFields({ group, defaults }));

  if (includeMode) {
    const modeSelect = createSelect(MODE_OPTIONS, group.mode ?? MODE_OPTIONS[0].value);
    modeSelect.dataset.field = "mode";
    section.appendChild(createFieldRow("Group mode", modeSelect));
  }

  const advanced = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Advanced fields";
  advanced.appendChild(summary);

  const advancedGrid = document.createElement("div");
  advancedGrid.className = "field-grid";

  if (includeOrbit) {
    const orbitWrapper = createRangeFields({
      label: "Orbit",
      key: "orbit",
      value: group.orbit,
      defaults: defaults.orbit
    });
    advanced.appendChild(orbitWrapper);
  }

  const lifeScale = createNumberInput(group.lifeScale ?? "");
  lifeScale.dataset.field = "lifeScale";
  advancedGrid.appendChild(createFieldRow("Life scale", lifeScale, defaults.lifeScale));

  const distanceScale = createNumberInput(group.distanceScale ?? "");
  distanceScale.dataset.field = "distanceScale";
  advancedGrid.appendChild(createFieldRow("Distance scale", distanceScale, defaults.distanceScale));

  const sizeScale = createNumberInput(group.sizeScale ?? "");
  sizeScale.dataset.field = "sizeScale";
  advancedGrid.appendChild(createFieldRow("Size scale", sizeScale, defaults.sizeScale));

  const jitterScale = createNumberInput(group.jitterScale ?? "");
  jitterScale.dataset.field = "jitterScale";
  advancedGrid.appendChild(createFieldRow("Jitter scale", jitterScale, defaults.jitterScale));

  if (includeTwinkle) {
    const twinkle = createSelect(BOOL_OPTIONS, group.twinkle === true ? "true" : group.twinkle === false ? "false" : "");
    twinkle.dataset.field = "twinkle";
    advancedGrid.appendChild(createFieldRow("Twinkle", twinkle, defaults.twinkle));
  }

  if (includeHueRate) {
    const hueRate = createNumberInput(group.hueRate ?? "");
    hueRate.dataset.field = "hueRate";
    advancedGrid.appendChild(createFieldRow("Hue rate", hueRate, defaults.hueRate));
  }

  if (includeBanding) {
    const bandingCount = createNumberInput(group.banding?.count ?? "");
    bandingCount.dataset.field = "bandingCount";
    advancedGrid.appendChild(createFieldRow("Banding count", bandingCount, defaults?.banding?.count));

    const bandingSpread = createNumberInput(group.banding?.spreadScale ?? "");
    bandingSpread.dataset.field = "bandingSpreadScale";
    advancedGrid.appendChild(createFieldRow("Banding spread", bandingSpread, defaults?.banding?.spreadScale));

    const bandingJitter = createNumberInput(group.banding?.jitterScale ?? "");
    bandingJitter.dataset.field = "bandingJitterScale";
    advancedGrid.appendChild(createFieldRow("Banding jitter", bandingJitter, defaults?.banding?.jitterScale));
  }

  const hexStroke = createTextInput(group.hexStyle?.stroke ?? "");
  hexStroke.dataset.field = "hexStroke";
  advancedGrid.appendChild(createFieldRow("Hex stroke", hexStroke, defaults.hexStyle?.stroke));

  const hexFill = createTextInput(group.hexStyle?.fill ?? "");
  hexFill.dataset.field = "hexFill";
  advancedGrid.appendChild(createFieldRow("Hex fill", hexFill, defaults.hexStyle?.fill));

  const hexLineWidth = createNumberInput(group.hexStyle?.lineWidth ?? "");
  hexLineWidth.dataset.field = "hexLineWidth";
  advancedGrid.appendChild(createFieldRow("Hex line width", hexLineWidth, defaults.hexStyle?.lineWidth));

  const sliceRind = createTextInput(group.sliceStyle?.rind ?? "");
  sliceRind.dataset.field = "sliceRind";
  advancedGrid.appendChild(createFieldRow("Slice rind", sliceRind, defaults.sliceStyle?.rind));

  const slicePith = createTextInput(group.sliceStyle?.pith ?? "");
  slicePith.dataset.field = "slicePith";
  advancedGrid.appendChild(createFieldRow("Slice pith", slicePith, defaults.sliceStyle?.pith));

  const sliceSegment = createTextInput(group.sliceStyle?.segment ?? "");
  sliceSegment.dataset.field = "sliceSegment";
  advancedGrid.appendChild(createFieldRow("Slice segment", sliceSegment, defaults.sliceStyle?.segment));

  const sliceSegments = createNumberInput(group.sliceStyle?.segments ?? "");
  sliceSegments.dataset.field = "sliceSegments";
  advancedGrid.appendChild(createFieldRow("Slice segments", sliceSegments, defaults.sliceStyle?.segments));

  const sliceSegmentGap = createNumberInput(group.sliceStyle?.segmentGap ?? "");
  sliceSegmentGap.dataset.field = "sliceSegmentGap";
  advancedGrid.appendChild(createFieldRow("Slice segment gap", sliceSegmentGap, defaults.sliceStyle?.segmentGap));

  advanced.appendChild(advancedGrid);
  section.appendChild(advanced);

  return section;
}

export function createExtraGroup({ group = {}, defaults = {} } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "trail-group extra-group";
  wrapper.dataset.group = "extra";
  const header = document.createElement("div");
  header.className = "trail-extra-header";
  const title = document.createElement("strong");
  title.textContent = "Extra particle group";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remove";
  remove.className = "danger";
  remove.addEventListener("click", () => wrapper.remove());
  header.append(title, remove);
  wrapper.appendChild(header);
  wrapper.appendChild(createGroupSection({
    title: "Settings",
    groupKey: "extra",
    group,
    defaults,
    includeMode: true,
    includeOrbit: true,
    includeTwinkle: true
  }));
  return wrapper;
}

export function createTrailCard({ id, defaults = {}, override = {}, allowRemove = true } = {}) {
  const card = document.createElement("div");
  card.className = "trail-card";
  card.dataset.trailId = id || "";

  const header = document.createElement("header");
  const title = document.createElement("h3");
  title.textContent = id || "New trail";
  const badge = document.createElement("span");
  badge.className = "pill";
  badge.textContent = allowRemove ? "customizable" : "default";
  const remove = document.createElement("button");
  remove.textContent = "Remove";
  remove.type = "button";
  remove.className = "danger";
  remove.disabled = !allowRemove;
  if (allowRemove) {
    remove.addEventListener("click", () => card.remove());
  }
  header.append(title, badge, remove);
  card.appendChild(header);

  const idInput = createTextInput(id || "");
  idInput.dataset.field = "id";
  idInput.disabled = !allowRemove && Boolean(id);
  card.appendChild(createFieldRow("Trail ID", idInput, id || "required for new trails"));

  const body = document.createElement("div");
  body.className = "trail-card-body";

  const preview = document.createElement("div");
  preview.className = "trail-preview";
  const previewLabel = document.createElement("strong");
  previewLabel.textContent = "Preview";
  const canvas = document.createElement("canvas");
  canvas.className = "trail-preview-canvas";
  preview.append(previewLabel, canvas);

  const groups = document.createElement("div");
  groups.className = "trail-groups";

  groups.appendChild(createGroupSection({
    title: "Base trail",
    groupKey: "base",
    group: override,
    defaults,
    includeHueRate: true,
    includeBanding: true
  }));
  groups.appendChild(createGroupSection({
    title: "Sparkle",
    groupKey: "sparkle",
    group: override.sparkle || {},
    defaults: defaults.sparkle || {},
    includeOrbit: true,
    includeTwinkle: true
  }));
  groups.appendChild(createGroupSection({
    title: "Glint",
    groupKey: "glint",
    group: override.glint || {},
    defaults: defaults.glint || {}
  }));
  groups.appendChild(createGroupSection({
    title: "Aura",
    groupKey: "aura",
    group: override.aura || {},
    defaults: defaults.aura || {},
    includeOrbit: true,
    includeTwinkle: true
  }));

  const extrasWrap = document.createElement("div");
  extrasWrap.className = "trail-extras";
  const extrasHeader = document.createElement("div");
  extrasHeader.className = "trail-extra-controls";
  const extrasTitle = document.createElement("strong");
  extrasTitle.textContent = "Extra particle groups";
  const addExtra = document.createElement("button");
  addExtra.type = "button";
  addExtra.textContent = "Add group";
  extrasHeader.append(extrasTitle, addExtra);
  extrasWrap.appendChild(extrasHeader);

  (override.extras || []).forEach((extra) => {
    extrasWrap.appendChild(createExtraGroup({ group: extra, defaults: defaults }));
  });

  addExtra.addEventListener("click", () => {
    extrasWrap.appendChild(createExtraGroup({ defaults }));
  });

  groups.appendChild(extrasWrap);

  body.append(preview, groups);
  card.appendChild(body);

  return card;
}

function parseNumber(input) {
  if (!input) return null;
  const val = input.value.trim();
  if (!val) return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function parseRange(root, key) {
  const minInput = root.querySelector(`[data-field='${key}Min']`);
  const maxInput = root.querySelector(`[data-field='${key}Max']`);
  const min = parseNumber(minInput);
  const max = parseNumber(maxInput);
  if (min === null || max === null) return null;
  return [min, max];
}

function parseBooleanSelect(select) {
  if (!select) return null;
  if (select.value === "true") return true;
  if (select.value === "false") return false;
  return null;
}

function parseColor(root) {
  const mode = root.querySelector("[data-field='colorMode']")?.value || "";
  const raw = root.querySelector("[data-field='colorValue']")?.value || "";
  if (!mode || !raw.trim()) return null;
  if (mode === "palette") {
    const values = raw.split(",").map((entry) => entry.trim()).filter(Boolean);
    return values.length ? values : null;
  }
  return raw.trim();
}

function parseHexStyle(root) {
  const stroke = root.querySelector("[data-field='hexStroke']")?.value?.trim();
  const fill = root.querySelector("[data-field='hexFill']")?.value?.trim();
  const lineWidth = parseNumber(root.querySelector("[data-field='hexLineWidth']"));
  const hexStyle = {};
  if (stroke) hexStyle.stroke = stroke;
  if (fill) hexStyle.fill = fill;
  if (lineWidth !== null) hexStyle.lineWidth = lineWidth;
  return Object.keys(hexStyle).length ? hexStyle : null;
}

function parseSliceStyle(root) {
  const rind = root.querySelector("[data-field='sliceRind']")?.value?.trim();
  const pith = root.querySelector("[data-field='slicePith']")?.value?.trim();
  const segment = root.querySelector("[data-field='sliceSegment']")?.value?.trim();
  const segments = parseNumber(root.querySelector("[data-field='sliceSegments']"));
  const segmentGap = parseNumber(root.querySelector("[data-field='sliceSegmentGap']"));
  const sliceStyle = {};
  if (rind) sliceStyle.rind = rind;
  if (pith) sliceStyle.pith = pith;
  if (segment) sliceStyle.segment = segment;
  if (segments !== null) sliceStyle.segments = segments;
  if (segmentGap !== null) sliceStyle.segmentGap = segmentGap;
  return Object.keys(sliceStyle).length ? sliceStyle : null;
}

function parseBanding(root) {
  const count = parseNumber(root.querySelector("[data-field='bandingCount']"));
  const spreadScale = parseNumber(root.querySelector("[data-field='bandingSpreadScale']"));
  const jitterScale = parseNumber(root.querySelector("[data-field='bandingJitterScale']"));
  const banding = {};
  if (count !== null) banding.count = count;
  if (spreadScale !== null) banding.spreadScale = spreadScale;
  if (jitterScale !== null) banding.jitterScale = jitterScale;
  return Object.keys(banding).length ? banding : null;
}

function collectGroupOverrides(root, { includeMode = false, includeBanding = false } = {}) {
  if (!root) return null;
  const data = {};

  if (includeMode) {
    const mode = root.querySelector("[data-field='mode']")?.value;
    if (mode) data.mode = mode;
  }

  const rate = parseNumber(root.querySelector("[data-field='rate']"));
  if (rate !== null) data.rate = rate;
  const drag = parseNumber(root.querySelector("[data-field='drag']"));
  if (drag !== null) data.drag = drag;
  const add = parseBooleanSelect(root.querySelector("[data-field='add']"));
  if (add !== null) data.add = add;
  const particleShape = root.querySelector("[data-field='particleShape']")?.value || "";
  if (particleShape) data.particleShape = particleShape;

  const ranges = {
    life: parseRange(root, "life"),
    size: parseRange(root, "size"),
    speed: parseRange(root, "speed"),
    orbit: parseRange(root, "orbit")
  };
  Object.entries(ranges).forEach(([key, value]) => {
    if (value) data[key] = value;
  });

  const lifeScale = parseNumber(root.querySelector("[data-field='lifeScale']"));
  if (lifeScale !== null) data.lifeScale = lifeScale;
  const distanceScale = parseNumber(root.querySelector("[data-field='distanceScale']"));
  if (distanceScale !== null) data.distanceScale = distanceScale;
  const sizeScale = parseNumber(root.querySelector("[data-field='sizeScale']"));
  if (sizeScale !== null) data.sizeScale = sizeScale;
  const jitterScale = parseNumber(root.querySelector("[data-field='jitterScale']"));
  if (jitterScale !== null) data.jitterScale = jitterScale;
  const hueRate = parseNumber(root.querySelector("[data-field='hueRate']"));
  if (hueRate !== null) data.hueRate = hueRate;
  const twinkle = parseBooleanSelect(root.querySelector("[data-field='twinkle']"));
  if (twinkle !== null) data.twinkle = twinkle;

  const color = parseColor(root);
  if (color) data.color = color;

  const hexStyle = parseHexStyle(root);
  if (hexStyle) data.hexStyle = hexStyle;

  const sliceStyle = parseSliceStyle(root);
  if (sliceStyle) data.sliceStyle = sliceStyle;

  if (includeBanding) {
    const banding = parseBanding(root);
    if (banding) data.banding = banding;
  }

  return Object.keys(data).length ? data : null;
}

export function collectTrailOverrides(root) {
  const cards = Array.from(root.querySelectorAll(".trail-card"));
  const overrides = {};
  cards.forEach((card) => {
    const idInput = card.querySelector("[data-field='id']");
    const id = idInput?.value?.trim();
    if (!id) return;
    const baseGroup = card.querySelector("[data-group='base']");
    const sparkleGroup = card.querySelector("[data-group='sparkle']");
    const glintGroup = card.querySelector("[data-group='glint']");
    const auraGroup = card.querySelector("[data-group='aura']");
    const extrasGroups = Array.from(card.querySelectorAll(".extra-group"));

    const override = collectGroupOverrides(baseGroup, { includeBanding: true }) || {};
    const sparkle = collectGroupOverrides(sparkleGroup);
    if (sparkle) override.sparkle = sparkle;
    const glint = collectGroupOverrides(glintGroup);
    if (glint) override.glint = glint;
    const aura = collectGroupOverrides(auraGroup);
    if (aura) override.aura = aura;

    const extras = extrasGroups
      .map((group) => collectGroupOverrides(group, { includeMode: true }))
      .filter(Boolean);
    if (extras.length) override.extras = extras;

    if (Object.keys(override).length) overrides[id] = override;
  });
  return overrides;
}
