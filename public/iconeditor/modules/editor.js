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

function createColorField(labelText, value = "", key = "") {
  const row = document.createElement("div");
  row.className = "field-row";
  const label = document.createElement("label");
  label.textContent = labelText;
  const inline = document.createElement("div");
  inline.className = "inline-field";
  const picker = document.createElement("input");
  picker.type = "color";
  picker.value = value || "#000000";
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = "#rrggbb";
  input.dataset.styleField = key;
  picker.addEventListener("input", () => {
    input.value = picker.value;
  });
  inline.append(picker, input);
  row.append(label, inline);
  return row;
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

function buildUnlock(card) {
  const type = card.querySelector("[data-unlock-type]")?.value || "free";
  const label = card.querySelector("[data-unlock-label]")?.value?.trim() || "";
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

function buildAnimation(card) {
  const type = card.querySelector("[data-animation-type]")?.value || "none";
  if (type === "none") return null;
  const animation = { type };
  const speed = parseFloatField(card.querySelector("[data-animation-speed]")?.value);
  if (speed !== null) animation.speed = speed;

  const bands = parseIntField(card.querySelector("[data-animation-bands]")?.value);
  if (bands !== null) animation.bands = bands;

  const embers = parseFloatField(card.querySelector("[data-animation-embers]")?.value);
  if (embers !== null) animation.embers = embers;

  const layers = parseIntField(card.querySelector("[data-animation-layers]")?.value);
  if (layers !== null) animation.layers = layers;

  const smoothness = parseFloatField(card.querySelector("[data-animation-smoothness]")?.value);
  if (smoothness !== null) animation.smoothness = smoothness;

  const palette = {
    base: card.querySelector("[data-animation-base]")?.value?.trim(),
    ash: card.querySelector("[data-animation-ash]")?.value?.trim(),
    ember: card.querySelector("[data-animation-ember]")?.value?.trim(),
    molten: card.querySelector("[data-animation-molten]")?.value?.trim(),
    flare: card.querySelector("[data-animation-flare]")?.value?.trim()
  };
  if (Object.values(palette).some(Boolean)) {
    animation.palette = Object.fromEntries(
      Object.entries(palette).filter(([, val]) => Boolean(val))
    );
  }

  return animation;
}

export function createIconCard(icon = {}, { particleEffects = [] } = {}) {
  const card = document.createElement("div");
  card.className = "editor-card icon-card";
  if (icon.id) card.dataset.iconId = icon.id;

  const header = document.createElement("header");
  const title = document.createElement("h3");
  title.textContent = icon.name || icon.id || "New Icon";
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "Remove";
  removeBtn.className = "danger";
  header.append(title, removeBtn);

  const form = document.createElement("div");
  form.className = "editor-form";

  const idInput = createTextInput({ value: icon.id || "", dataset: { iconField: "id" }, placeholder: "icon_id" });
  const nameInput = createTextInput({ value: icon.name || "", dataset: { iconField: "name" }, placeholder: "Icon name" });
  form.append(createField("Icon ID", idInput), createField("Display name", nameInput));

  const imageUrl = createTextInput({ value: icon.imageSrc || "", dataset: { iconField: "imageSrc" }, placeholder: "Image URL or data URI" });
  const imageUpload = document.createElement("input");
  imageUpload.type = "file";
  imageUpload.accept = "image/*";
  imageUpload.dataset.iconField = "imageUpload";

  const preview = document.createElement("div");
  preview.className = "image-preview";
  const img = document.createElement("img");
  img.alt = "Icon preview";
  if (icon.imageSrc) img.src = icon.imageSrc;
  const previewText = document.createElement("div");
  previewText.className = "muted";
  previewText.textContent = "Upload a custom sprite or paste an image URL.";
  preview.append(img, previewText);

  imageUpload.addEventListener("change", () => {
    const file = imageUpload.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      imageUrl.value = result;
      img.src = result;
    });
    reader.readAsDataURL(file);
  });

  form.append(createField("Image source", imageUrl), createField("Upload image", imageUpload), preview);

  const unlockType = createSelect({
    value: icon.unlock?.type || "free",
    dataset: { unlockType: "true" },
    options: [
      { value: "free", label: "Free" },
      { value: "achievement", label: "Achievement" },
      { value: "score", label: "Score" },
      { value: "purchase", label: "Purchase" },
      { value: "record", label: "Record holder" }
    ]
  });
  const unlockId = createTextInput({ value: icon.unlock?.id || "", dataset: { unlockId: "true" }, placeholder: "Achievement ID" });
  const unlockScore = createNumberInput({ value: icon.unlock?.minScore ?? "", dataset: { unlockScore: "true" }, min: 0 });
  const unlockCost = createNumberInput({ value: icon.unlock?.cost ?? "", dataset: { unlockCost: "true" }, min: 0 });
  const unlockCurrency = createTextInput({ value: icon.unlock?.currencyId || "", dataset: { unlockCurrency: "true" }, placeholder: "currency id" });
  const unlockLabel = createTextInput({ value: icon.unlock?.label || "", dataset: { unlockLabel: "true" }, placeholder: "Unlock label" });

  const unlockGrid = document.createElement("div");
  unlockGrid.className = "field-grid";
  unlockGrid.append(
    createField("Unlock type", unlockType),
    createField("Achievement ID", unlockId),
    createField("Minimum score", unlockScore),
    createField("Purchase cost", unlockCost),
    createField("Currency ID", unlockCurrency),
    createField("Unlock label", unlockLabel)
  );
  form.append(unlockGrid);

  const style = icon.style || {};
  const colorGrid = document.createElement("div");
  colorGrid.className = "color-grid";
  colorGrid.append(
    createColorField("Fill", style.fill || "", "fill"),
    createColorField("Core", style.core || "", "core"),
    createColorField("Rim", style.rim || "", "rim"),
    createColorField("Glow", style.glow || "", "glow")
  );
  form.append(colorGrid);

  const animationType = createSelect({
    value: style.animation?.type || "none",
    dataset: { animationType: "true" },
    options: [
      { value: "none", label: "None" },
      { value: "lava", label: "Lava" },
      { value: "cape_flow", label: "Cape Flow" },
      { value: "zigzag_scroll", label: "Zigzag Scroll" }
    ]
  });
  const animationSpeed = createNumberInput({ value: style.animation?.speed ?? "", dataset: { animationSpeed: "true" }, step: 0.01 });
  const animationBands = createNumberInput({ value: style.animation?.bands ?? "", dataset: { animationBands: "true" }, min: 1 });
  const animationEmbers = createNumberInput({ value: style.animation?.embers ?? "", dataset: { animationEmbers: "true" }, min: 0, max: 1, step: 0.05 });
  const animationLayers = createNumberInput({ value: style.animation?.layers ?? "", dataset: { animationLayers: "true" }, min: 1 });
  const animationSmoothness = createNumberInput({ value: style.animation?.smoothness ?? "", dataset: { animationSmoothness: "true" }, min: 0, max: 1, step: 0.05 });

  const animationGrid = document.createElement("div");
  animationGrid.className = "field-grid";
  animationGrid.append(
    createField("Animation type", animationType),
    createField("Speed", animationSpeed),
    createField("Bands", animationBands),
    createField("Embers", animationEmbers),
    createField("Layers", animationLayers),
    createField("Smoothness", animationSmoothness)
  );
  form.append(animationGrid);

  const paletteGrid = document.createElement("div");
  paletteGrid.className = "field-grid";
  paletteGrid.append(
    createField("Palette base", createTextInput({ value: style.animation?.palette?.base || "", dataset: { animationBase: "true" } })),
    createField("Palette ash", createTextInput({ value: style.animation?.palette?.ash || "", dataset: { animationAsh: "true" } })),
    createField("Palette ember", createTextInput({ value: style.animation?.palette?.ember || "", dataset: { animationEmber: "true" } })),
    createField("Palette molten", createTextInput({ value: style.animation?.palette?.molten || "", dataset: { animationMolten: "true" } })),
    createField("Palette flare", createTextInput({ value: style.animation?.palette?.flare || "", dataset: { animationFlare: "true" } }))
  );
  form.append(paletteGrid);

  const mix = Array.isArray(style.particles?.mix) ? style.particles.mix : [];
  const particleBlock = document.createElement("div");
  particleBlock.className = "field-row";
  const particleLabel = document.createElement("label");
  particleLabel.textContent = "Internal particle mix";
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

export function collectIconDefinitions(root) {
  const cards = Array.from(root.querySelectorAll(".icon-card"));
  return cards
    .map((card) => {
      const id = card.querySelector("[data-icon-field='id']")?.value?.trim();
      if (!id) return null;
      const name = card.querySelector("[data-icon-field='name']")?.value?.trim();
      const imageSrc = card.querySelector("[data-icon-field='imageSrc']")?.value?.trim();
      const unlock = buildUnlock(card);

      const style = {
        fill: card.querySelector("[data-style-field='fill']")?.value?.trim(),
        core: card.querySelector("[data-style-field='core']")?.value?.trim(),
        rim: card.querySelector("[data-style-field='rim']")?.value?.trim(),
        glow: card.querySelector("[data-style-field='glow']")?.value?.trim()
      };

      const animation = buildAnimation(card);
      if (animation) style.animation = animation;

      const mix = collectParticleMix(card.querySelector("[data-particle-mix='true']"));
      if (mix.length) style.particles = { mix };

      const result = { id, name: name || id, unlock, style };
      if (imageSrc) result.imageSrc = imageSrc;

      return result;
    })
    .filter(Boolean);
}
