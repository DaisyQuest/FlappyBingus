export function createAchievementCard(definition = {}, schema = {}) {
  const card = document.createElement("div");
  card.className = "achievement-card";

  const header = document.createElement("header");
  const title = document.createElement("h3");
  title.textContent = definition.title || definition.id || "New Achievement";
  const remove = document.createElement("button");
  remove.textContent = "Remove";
  remove.className = "danger";
  remove.type = "button";
  remove.addEventListener("click", () => {
    card.remove();
  });
  header.append(title, remove);

  const form = document.createElement("div");
  form.className = "achievement-form";

  const idInput = createTextInput(definition.id || "");
  idInput.dataset.field = "id";
  form.append(createInputRow(schema.fields?.id?.label || "ID", idInput));

  const titleInput = createTextInput(definition.title || "");
  titleInput.dataset.field = "title";
  form.append(createInputRow(schema.fields?.title?.label || "Title", titleInput));

  const descriptionInput = createTextarea(definition.description || "");
  descriptionInput.dataset.field = "description";
  form.append(createInputRow(schema.fields?.description?.label || "Description", descriptionInput));

  const rewardInput = createTextInput(definition.reward || "");
  rewardInput.dataset.field = "reward";
  form.append(createInputRow(schema.fields?.reward?.label || "Reward", rewardInput));

  const progressKeyInput = createTextInput(definition.progressKey || "");
  progressKeyInput.dataset.field = "progressKey";
  form.append(createInputRow(schema.fields?.progressKey?.label || "Progress Key", progressKeyInput));

  const requirementWrap = document.createElement("div");
  requirementWrap.className = "achievement-requirements";
  const reqHeader = document.createElement("label");
  reqHeader.textContent = "Requirements";
  requirementWrap.appendChild(reqHeader);

  const requirementGrid = document.createElement("div");
  requirementGrid.className = "requirement-grid";
  const requirement = definition.requirement || {};

  (schema.requirementFields || []).forEach((field) => {
    if (field.type === "skills") return;
    const input = createNumberInput(requirement[field.key]);
    input.dataset.reqKey = field.key;
    requirementGrid.append(createInputRow(field.label || field.key, input));
  });
  requirementWrap.appendChild(requirementGrid);

  const skillField = (schema.requirementFields || []).find((field) => field.type === "skills");
  if (skillField) {
    const skillBlock = document.createElement("div");
    skillBlock.className = "requirement-skills";
    (schema.skillIds || []).forEach((skillId) => {
      const input = createNumberInput(requirement.minSkillUses?.[skillId]);
      input.dataset.reqSkill = skillId;
      skillBlock.append(createInputRow(`Use ${skillId}`, input));
    });
    requirementWrap.appendChild(skillBlock);
  }

  form.appendChild(requirementWrap);

  card.append(header, form);
  return card;
}

export function collectDefinitions(grid) {
  const cards = Array.from(grid.querySelectorAll(".achievement-card"));
  return cards.map((card) => {
    const definition = {
      id: "",
      title: "",
      description: "",
      reward: "",
      progressKey: "",
      requirement: {}
    };
    card.querySelectorAll("[data-field]").forEach((input) => {
      const key = input.dataset.field;
      definition[key] = input.value.trim();
    });
    const requirement = {};
    card.querySelectorAll("[data-req-key]").forEach((input) => {
      const key = input.dataset.reqKey;
      if (input.value === "") return;
      requirement[key] = Number.parseInt(input.value, 10);
    });
    const skillUses = {};
    card.querySelectorAll("[data-req-skill]").forEach((input) => {
      if (input.value === "") return;
      skillUses[input.dataset.reqSkill] = Number.parseInt(input.value, 10);
    });
    if (Object.keys(skillUses).length) requirement.minSkillUses = skillUses;
    definition.requirement = requirement;
    definition.progressKey = definition.progressKey || null;
    definition.reward = definition.reward || "";
    return definition;
  });
}

export function collectUnlockableOverrides({ unlockableOverrides = {}, root = document } = {}) {
  const base = structuredClone(unlockableOverrides || {});
  const cards = Array.from(root.querySelectorAll(".unlockable-card"));
  cards.forEach((card) => {
    const type = card.dataset.unlockableType;
    const id = card.dataset.unlockableId;
    if (!type || !id) return;
    const existing = base?.[type]?.[id];
    if (existing && existing.type !== "achievement") return;
    const select = card.querySelector("select[data-unlockable-select]");
    if (!select) return;
    const value = select.value;
    if (!base[type]) base[type] = {};
    if (!value) {
      if (base[type]) delete base[type][id];
      return;
    }
    base[type][id] = { type: "achievement", id: value };
  });
  return base;
}

function createInputRow(labelText, input) {
  const row = document.createElement("div");
  row.className = "field-row";
  const label = document.createElement("label");
  label.textContent = labelText;
  row.append(label, input);
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
  input.min = "0";
  input.step = "1";
  input.value = value === null || value === undefined ? "" : String(value);
  return input;
}

function createTextarea(value = "") {
  const input = document.createElement("textarea");
  input.rows = 2;
  input.value = value;
  return input;
}
