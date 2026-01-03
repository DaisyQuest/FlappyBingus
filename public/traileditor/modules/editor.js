import { normalizeParticleMix } from "../../shared/particleLibrary.js";

function createField(labelText, input) {
  const wrap = document.createElement("div");
  wrap.className = "field-row";
  const label = document.createElement("label");
  label.textContent = labelText;
  wrap.append(label, input);
  return wrap;
}

function createTextInput({ value = "", dataset = {}, placeholder = "" } = {}) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = placeholder;
  Object.entries(dataset).forEach(([key, val]) => {
    input.dataset[key] = val;
  });
  return input;
}

function createNumberInput({ value = "", dataset = {}, min = null, max = null, step = null } = {}) {
  const input = document.createElement("input");
  input.type = "number";
  input.value = value;
  if (min !== null) input.min = String(min);
  if (max !== null) input.max = String(max);
  if (step !== null) input.step = String(step);
  Object.entries(dataset).forEach(([key, val]) => {
    input.dataset[key] = val;
  });
  return input;
}

function createSelect({ value = "", options = [], dataset = {} } = {}) {
  const select = document.createElement("select");
  options.forEach(({ value: optValue, label }) => {
    const opt = document.createElement("option");
    opt.value = optValue;
    opt.textContent = label;
    select.appendChild(opt);
  });
  select.value = value;
  Object.entries(dataset).forEach(([key, val]) => {
    select.dataset[key] = val;
  });
  return select;
}

function serializeStyle(style) {
  return JSON.stringify(
    style,
    (key, value) => (typeof value === "function" ? "[Function]" : value),
    2
  );
}

function setParticleTotal(totalEl, mix) {
  const total = mix.reduce((sum, entry) => sum + entry.weight, 0);
  totalEl.textContent = `Mix total: ${total.toFixed(2)}%`;
}

function createParticleGrid({ mix = [], particleEffects = [] } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "particle-grid";
  wrap.dataset.particleMix = "true";

  const entries = new Map(mix.map((entry) => [entry.id, entry.weight]));

  particleEffects.forEach((effect) => {
    const entry = document.createElement("div");
    entry.className = "particle-entry";
    entry.dataset.particleId = effect;

    const label = document.createElement("div");
    label.textContent = effect;
    const input = createNumberInput({ value: entries.get(effect) ?? "", min: 0, max: 100, step: 0.5 });

    entry.append(label, input);
    wrap.appendChild(entry);
  });

  const customEntry = document.createElement("div");
  customEntry.className = "particle-entry";
  const customName = createTextInput({ placeholder: "Custom effect" });
  customName.dataset.customParticle = "name";
  const customWeight = createNumberInput({ min: 0, max: 100, step: 0.5 });
  customWeight.dataset.customParticle = "weight";
  customEntry.append(customName, customWeight);
  wrap.appendChild(customEntry);

  return wrap;
}

function parseFloatField(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseIntField(value) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : null;
}

function collectParticleMix(wrapper) {
  if (!wrapper) return [];
  const entries = [];
  wrapper.querySelectorAll(".particle-entry").forEach((entry) => {
    if (entry.dataset.particleId) {
      const input = entry.querySelector("input[type='number']");
      entries.push({ id: entry.dataset.particleId, weight: Number(input?.value) });
    }
  });

  const customName = wrapper.querySelector("[data-custom-particle='name']");
  const customWeight = wrapper.querySelector("[data-custom-particle='weight']");
  if (customName && customWeight) {
    entries.push({ id: customName.value, weight: Number(customWeight.value) });
  }

  return normalizeParticleMix(entries);
}

export function resolveTrailStyleId(trail = {}, styleIds = []) {
  if (trail.styleId && styleIds.includes(trail.styleId)) return trail.styleId;
  if (trail.id && styleIds.includes(trail.id)) return trail.id;
  return styleIds[0] || "";
}

function stripFunctionPlaceholders(value) {
  if (value === "[Function]" || typeof value === "function") return undefined;
  if (Array.isArray(value)) {
    const next = value
      .map((entry) => stripFunctionPlaceholders(entry))
      .filter((entry) => entry !== undefined);
    return next;
  }
  if (!value || typeof value !== "object") return value;
  const cleaned = {};
  Object.entries(value).forEach(([key, entry]) => {
    const next = stripFunctionPlaceholders(entry);
    if (next === undefined) return;
    cleaned[key] = next;
  });
  return cleaned;
}

export function parseStyleJson(raw, fallback = {}) {
  if (typeof raw !== "string") return stripFunctionPlaceholders(fallback);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return stripFunctionPlaceholders(fallback);
    return stripFunctionPlaceholders(parsed);
  } catch {
    return stripFunctionPlaceholders(fallback);
  }
}

function buildUnlock(card) {
  const type = card.querySelector("[data-unlock-type]")?.value || "default";
  const label = card.querySelector("[data-unlock-label]")?.value?.trim() || "";
  if (type === "default") return null;
  const unlock = { type };
  if (label) unlock.label = label;

  if (type === "achievement") {
    const id = card.querySelector("[data-unlock-id]")?.value?.trim();
    if (id) unlock.id = id;
  }
  if (type === "score") {
    const minScore = parseIntField(card.querySelector("[data-unlock-score]")?.value);
    if (minScore !== null) unlock.minScore = minScore;
  }
  if (type === "purchase") {
    const cost = parseIntField(card.querySelector("[data-unlock-cost]")?.value);
    if (cost !== null) unlock.cost = cost;
    const currencyId = card.querySelector("[data-unlock-currency]")?.value?.trim();
    if (currencyId) unlock.currencyId = currencyId;
  }

  return unlock;
}

export function createTrailCard(trail = {}, { particleEffects = [], styleIds = [], styleMap = {} } = {}) {
  const card = document.createElement("div");
  card.className = "editor-card trail-card";
  if (trail.id) card.dataset.trailId = trail.id;

  const header = document.createElement("header");
  const title = document.createElement("h3");
  title.textContent = trail.name || trail.id || "New Trail";
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "Remove";
  removeBtn.className = "danger";
  header.append(title, removeBtn);

  const form = document.createElement("div");
  form.className = "editor-form";

  const idInput = createTextInput({ value: trail.id || "", dataset: { trailField: "id" }, placeholder: "trail_id" });
  const nameInput = createTextInput({ value: trail.name || "", dataset: { trailField: "name" }, placeholder: "Trail name" });
  form.append(createField("Trail ID", idInput), createField("Display name", nameInput));

  const minScore = createNumberInput({ value: trail.minScore ?? "", dataset: { trailField: "minScore" }, min: 0 });
  const achievementId = createTextInput({ value: trail.achievementId || "", dataset: { trailField: "achievementId" }, placeholder: "achievement id" });
  const alwaysUnlocked = document.createElement("input");
  alwaysUnlocked.type = "checkbox";
  alwaysUnlocked.checked = Boolean(trail.alwaysUnlocked);
  alwaysUnlocked.dataset.trailField = "alwaysUnlocked";
  const requiresRecord = document.createElement("input");
  requiresRecord.type = "checkbox";
  requiresRecord.checked = Boolean(trail.requiresRecordHolder);
  requiresRecord.dataset.trailField = "requiresRecordHolder";

  const unlockType = createSelect({
    value: trail.unlock?.type || "default",
    dataset: { unlockType: "true" },
    options: [
      { value: "default", label: "Default (achievement)" },
      { value: "free", label: "Free" },
      { value: "achievement", label: "Achievement" },
      { value: "score", label: "Score" },
      { value: "purchase", label: "Purchase" },
      { value: "record", label: "Record holder" }
    ]
  });
  const unlockId = createTextInput({ value: trail.unlock?.id || "", dataset: { unlockId: "true" }, placeholder: "Achievement ID" });
  const unlockScore = createNumberInput({ value: trail.unlock?.minScore ?? "", dataset: { unlockScore: "true" }, min: 0 });
  const unlockCost = createNumberInput({ value: trail.unlock?.cost ?? "", dataset: { unlockCost: "true" }, min: 0 });
  const unlockCurrency = createTextInput({ value: trail.unlock?.currencyId || "", dataset: { unlockCurrency: "true" }, placeholder: "currency id" });
  const unlockLabel = createTextInput({ value: trail.unlock?.label || "", dataset: { unlockLabel: "true" }, placeholder: "Unlock label" });

  const basicGrid = document.createElement("div");
  basicGrid.className = "field-grid";
  basicGrid.append(
    createField("Minimum score", minScore),
    createField("Achievement ID", achievementId),
    createField("Always unlocked", alwaysUnlocked),
    createField("Requires record", requiresRecord)
  );
  form.append(basicGrid);

  const unlockGrid = document.createElement("div");
  unlockGrid.className = "field-grid";
  unlockGrid.append(
    createField("Unlock type", unlockType),
    createField("Unlock achievement", unlockId),
    createField("Unlock min score", unlockScore),
    createField("Purchase cost", unlockCost),
    createField("Currency ID", unlockCurrency),
    createField("Unlock label", unlockLabel)
  );
  form.append(unlockGrid);

  const selectedStyleId = resolveTrailStyleId(trail, styleIds);
  const styleSelect = createSelect({
    value: selectedStyleId,
    dataset: { trailField: "styleId" },
    options: styleIds.map((id) => ({ value: id, label: id }))
  });
  const styleJson = document.createElement("textarea");
  styleJson.className = "style-textarea";
  styleJson.dataset.trailField = "styleJson";
  styleJson.value = serializeStyle(styleMap[selectedStyleId] || {});

  const styleControls = document.createElement("div");
  styleControls.className = "field-grid";
  styleControls.append(createField("Style ID", styleSelect));
  form.append(styleControls);

  const styleBlock = document.createElement("div");
  styleBlock.className = "field-row";
  const styleLabel = document.createElement("label");
  styleLabel.textContent = "Full style JSON";
  styleBlock.append(styleLabel, styleJson);
  form.append(styleBlock);

  styleSelect.addEventListener("change", () => {
    const next = styleMap[styleSelect.value] || {};
    styleJson.value = serializeStyle(next);
  });

  const mix = Array.isArray(trail.particles?.mix) ? trail.particles.mix : [];
  const particleBlock = document.createElement("div");
  particleBlock.className = "field-row";
  const particleLabel = document.createElement("label");
  particleLabel.textContent = "Particle mix percentages";
  const particleGrid = createParticleGrid({ mix, particleEffects });
  const total = document.createElement("div");
  total.className = "particle-total";
  setParticleTotal(total, normalizeParticleMix(mix));

  particleGrid.addEventListener("input", () => {
    setParticleTotal(total, collectParticleMix(particleGrid));
  });

  particleBlock.append(particleLabel, particleGrid, total);
  form.append(particleBlock);

  card.append(header, form);

  removeBtn.addEventListener("click", () => {
    card.remove();
  });

  return card;
}

export function collectTrailDefinitions(root, { styleLookup = {} } = {}) {
  const cards = Array.from(root.querySelectorAll(".trail-card"));
  const trails = [];
  const styles = {};

  cards.forEach((card) => {
    const id = card.querySelector("[data-trail-field='id']")?.value?.trim();
    if (!id) return;
    const name = card.querySelector("[data-trail-field='name']")?.value?.trim();
    const minScore = parseIntField(card.querySelector("[data-trail-field='minScore']")?.value);
    const achievementId = card.querySelector("[data-trail-field='achievementId']")?.value?.trim();
    const alwaysUnlocked = Boolean(card.querySelector("[data-trail-field='alwaysUnlocked']")?.checked);
    const requiresRecordHolder = Boolean(card.querySelector("[data-trail-field='requiresRecordHolder']")?.checked);

    const styleId = card.querySelector("[data-trail-field='styleId']")?.value || "";
    const styleRaw = card.querySelector("[data-trail-field='styleJson']")?.value || "";
    const fallback = styleLookup[styleId] || {};
    const style = parseStyleJson(styleRaw, fallback);

    const mix = collectParticleMix(card.querySelector("[data-particle-mix='true']"));
    const unlock = buildUnlock(card);

    const trail = {
      id,
      name: name || id,
      styleId,
      style,
      unlock,
      particles: mix.length ? { mix } : undefined,
      alwaysUnlocked,
      requiresRecordHolder
    };

    if (minScore !== null) trail.minScore = minScore;
    if (achievementId) trail.achievementId = achievementId;
    if (!unlock) delete trail.unlock;
    if (!trail.particles) delete trail.particles;

    trails.push(trail);
    if (styleId) styles[styleId] = style;
  });

  return { trails, styles };
}
