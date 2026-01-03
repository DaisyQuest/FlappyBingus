import { getAchievementConfig, saveAchievementConfig } from "./modules/api.js";
import {
  collectDefinitions,
  collectUnlockableOverrides,
  createAchievementCard
} from "./modules/editor.js";

const statusChip = document.getElementById("adminStatus");
const statusText = document.getElementById("adminStatusText");
const nav = document.getElementById("achievementNav");
const main = document.getElementById("achievementMain");
const metaText = document.getElementById("adminMeta");

const state = {
  schema: null,
  definitions: [],
  unlockables: [],
  unlockableOverrides: {},
  loaded: false
};

const UNLOCK_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "achievement", label: "Achievement" },
  { value: "score", label: "Score" },
  { value: "purchase", label: "Purchase" },
  { value: "record", label: "Record holder" }
];

function setStatus(text, tone = "info") {
  statusText.textContent = text;
  statusChip.dataset.tone = tone;
  statusChip.querySelector(".status-dot").style.background =
    tone === "error" ? "#f87171" : tone === "ok" ? "#22c55e" : "#60a5fa";
}

function setMeta(text) {
  metaText.textContent = text;
}

function clearMain() {
  main.innerHTML = "";
}

function createPanel(title, subtitle) {
  const panel = document.createElement("section");
  panel.className = "panel";
  const header = document.createElement("div");
  header.className = "panel-header";
  const heading = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.textContent = title;
  heading.appendChild(h2);
  if (subtitle) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = subtitle;
    heading.appendChild(p);
  }
  const actions = document.createElement("div");
  actions.className = "panel-actions";
  header.append(heading, actions);
  panel.appendChild(header);
  return { panel, actions };
}

function createFieldRow(labelText, input) {
  const row = document.createElement("div");
  row.className = "field-row";
  const label = document.createElement("label");
  label.textContent = labelText;
  row.append(label, input);
  return row;
}

function buildUnlockSummary(unlock, fallback) {
  const type = unlock?.type || fallback?.type || "free";
  const label = unlock?.label || fallback?.label;
  return label ? `${type} · ${label}` : type;
}

function updateUnlockFieldVisibility(card) {
  const current = card.querySelector("[data-unlock-type]")?.value || "free";
  card.querySelectorAll("[data-unlock-field]").forEach((field) => {
    field.hidden = field.dataset.unlockField !== current;
  });
}


async function renderAchievementEditor() {
  if (!state.loaded) await loadConfig();
  clearMain();
  const { panel, actions } = createPanel(
    "Achievements",
    "Edit achievement requirements. Multiple requirement fields can be combined for compound achievements."
  );
  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Reload";
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add achievement";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "primary";
  actions.append(reloadBtn, addBtn, saveBtn);

  const grid = document.createElement("div");
  grid.className = "achievement-grid";
  panel.appendChild(grid);
  main.appendChild(panel);

  function refreshList() {
    grid.innerHTML = "";
    state.definitions.forEach((definition) => {
      grid.appendChild(createAchievementCard(definition, state.schema || {}));
    });
  }

  reloadBtn.addEventListener("click", async () => {
    await loadConfig();
    refreshList();
  });
  addBtn.addEventListener("click", () => {
    const blank = {
      id: "",
      title: "",
      description: "",
      reward: "",
      progressKey: "",
      requirement: {}
    };
    state.definitions.push(blank);
    grid.appendChild(createAchievementCard(blank, state.schema || {}));
  });
  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Saving achievements…");
      const definitions = collectDefinitions(grid);
      const response = await saveAchievementConfig({
        definitions,
        unlockableOverrides: state.unlockableOverrides
      });
      state.definitions = Array.isArray(response?.achievements?.definitions)
        ? response.achievements.definitions
        : definitions;
      state.unlockableOverrides = response?.unlockableOverrides || state.unlockableOverrides;
      setStatus("Achievements saved", "ok");
    } catch (err) {
      setStatus("Failed to save achievements", "error");
      console.error(err);
    }
  });

  refreshList();
}


async function renderUnlockableEditor() {
  if (!state.loaded) await loadConfig();
  clearMain();
  const { panel, actions } = createPanel(
    "Unlockables",
    "Choose how each trail, icon, or pipe texture is unlocked."
  );
  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Reload";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "primary";
  actions.append(reloadBtn, saveBtn);

  const grid = document.createElement("div");
  grid.className = "unlockable-grid";
  panel.appendChild(grid);
  main.appendChild(panel);

  reloadBtn.addEventListener("click", async () => {
    await loadConfig();
    renderUnlockableEditor();
  });
  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Saving unlockables…");
      const overrides = collectUnlockableOverrides({ unlockableOverrides: state.unlockableOverrides, root: grid });
      const response = await saveAchievementConfig({ definitions: state.definitions, unlockableOverrides: overrides });
      state.unlockableOverrides = response?.unlockableOverrides || overrides;
      setStatus("Unlockables saved", "ok");
    } catch (err) {
      setStatus("Failed to save unlockables", "error");
      console.error(err);
    }
  });

  const grouped = state.unlockables.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  const achievementOptions = state.definitions.map((def) => ({
    id: def.id,
    label: `${def.id} — ${def.title || "Untitled"}`
  }));

  Object.entries(grouped).forEach(([type, items]) => {
    const section = document.createElement("div");
    section.className = "list-card";
    const header = document.createElement("div");
    header.className = "panel-header";
    header.innerHTML = `<strong>${type}</strong> <span class="badge">${items.length} items</span>`;
    section.appendChild(header);

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "unlockable-card";
      card.dataset.unlockableId = item.id;
      card.dataset.unlockableType = type;

      const name = document.createElement("div");
      name.innerHTML = `<strong>${item.name || item.id}</strong>`;
      const meta = document.createElement("div");
      meta.className = "muted";
      meta.textContent = item.id;

      const currentOverride = state.unlockableOverrides?.[type]?.[item.id];
      const baseUnlock = item.unlock || { type: "free" };
      const resolvedUnlock = currentOverride || baseUnlock;

      const summary = document.createElement("div");
      summary.className = "muted";
      summary.textContent = `Current: ${buildUnlockSummary(resolvedUnlock, baseUnlock)}`;

      const fields = document.createElement("div");
      fields.className = "unlockable-fields";

      const typeSelect = document.createElement("select");
      typeSelect.dataset.unlockType = "true";
      UNLOCK_OPTIONS.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        typeSelect.appendChild(option);
      });
      typeSelect.value = resolvedUnlock?.type || "free";

      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.dataset.unlockLabel = "true";
      labelInput.placeholder = baseUnlock?.label || "Optional label";
      labelInput.value = currentOverride?.label || "";

      fields.append(
        createFieldRow("Unlock type", typeSelect),
        createFieldRow("Label (optional)", labelInput)
      );

      const achievementWrap = document.createElement("div");
      achievementWrap.dataset.unlockField = "achievement";
      const achievementInput = document.createElement("input");
      achievementInput.type = "text";
      achievementInput.dataset.unlockAchievement = "true";
      achievementInput.placeholder = "Achievement ID";
      achievementInput.value = resolvedUnlock?.id || baseUnlock?.id || "";
      if (achievementOptions.length) {
        const listId = `unlockable-achievement-${type}-${item.id}`;
        achievementInput.setAttribute("list", listId);
        const dataList = document.createElement("datalist");
        dataList.id = listId;
        achievementOptions.forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt.id;
          option.label = opt.label;
          dataList.appendChild(option);
        });
        achievementWrap.appendChild(dataList);
      }
      achievementWrap.appendChild(createFieldRow("Achievement ID", achievementInput));

      const scoreWrap = document.createElement("div");
      scoreWrap.dataset.unlockField = "score";
      const scoreInput = document.createElement("input");
      scoreInput.type = "number";
      scoreInput.min = "0";
      scoreInput.step = "1";
      scoreInput.dataset.unlockScore = "true";
      scoreInput.value = resolvedUnlock?.minScore ?? baseUnlock?.minScore ?? "";
      scoreWrap.appendChild(createFieldRow("Minimum score", scoreInput));

      const purchaseWrap = document.createElement("div");
      purchaseWrap.dataset.unlockField = "purchase";
      const costInput = document.createElement("input");
      costInput.type = "number";
      costInput.min = "0";
      costInput.step = "1";
      costInput.dataset.unlockCost = "true";
      costInput.value = resolvedUnlock?.cost ?? baseUnlock?.cost ?? "";
      const currencyInput = document.createElement("input");
      currencyInput.type = "text";
      currencyInput.dataset.unlockCurrency = "true";
      currencyInput.value = resolvedUnlock?.currencyId ?? baseUnlock?.currencyId ?? "";
      purchaseWrap.append(
        createFieldRow("Cost", costInput),
        createFieldRow("Currency ID", currencyInput)
      );

      fields.append(achievementWrap, scoreWrap, purchaseWrap);
      card.append(name, meta, summary, fields);
      section.appendChild(card);

      typeSelect.addEventListener("change", () => updateUnlockFieldVisibility(card));
      updateUnlockFieldVisibility(card);
    });

    grid.appendChild(section);
  });
}


async function loadConfig() {
  setStatus("Loading achievement configuration…");
  const data = await getAchievementConfig();
  state.schema = data.achievements?.schema || {};
  state.definitions = Array.isArray(data.achievements?.definitions) ? data.achievements.definitions : [];
  state.unlockables = Array.isArray(data.unlockables) ? data.unlockables : [];
  state.unlockableOverrides = data.unlockableOverrides || {};
  state.loaded = true;
  setStatus("Achievement editor ready", "ok");
  setMeta(`Config updated ${new Date(data.meta?.lastLoadedAt || Date.now()).toLocaleString()}`);
}

function renderNav() {
  const items = [
    { id: "achievements", label: "Achievements", render: renderAchievementEditor },
    { id: "unlockables", label: "Unlockables", render: renderUnlockableEditor }
  ];
  nav.innerHTML = "";
  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "nav-item";
    btn.textContent = item.label;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      Promise.resolve(item.render()).catch((err) => {
        console.error(err);
        setStatus("Failed to load view", "error");
      });
    });
    nav.appendChild(btn);
  });
  const first = nav.querySelector(".nav-item");
  if (first) first.classList.add("active");
}

renderNav();
renderAchievementEditor().catch((err) => {
  console.error(err);
  setStatus("Failed to load achievements", "error");
});
