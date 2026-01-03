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
  unlockableOverrides: {}
};

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


function renderAchievementEditor() {
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

  reloadBtn.addEventListener("click", () => loadConfig());
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
      const overrides = collectUnlockableOverrides({ unlockableOverrides: state.unlockableOverrides, root: document });
      await saveAchievementConfig({ definitions, unlockableOverrides: overrides });
      setStatus("Achievements saved", "ok");
    } catch (err) {
      setStatus("Failed to save achievements", "error");
      console.error(err);
    }
  });

  refreshList();
}


function renderUnlockableEditor() {
  clearMain();
  const { panel, actions } = createPanel(
    "Unlockable Mappings",
    "Map trails, icons, and pipe textures to achievement unlocks."
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

  reloadBtn.addEventListener("click", () => loadConfig());
  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Saving unlockable mappings…");
      const overrides = collectUnlockableOverrides({ unlockableOverrides: state.unlockableOverrides, root: document });
      await saveAchievementConfig({ definitions: state.definitions, unlockableOverrides: overrides });
      setStatus("Unlockable mappings saved", "ok");
    } catch (err) {
      setStatus("Failed to save mappings", "error");
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

      const selectWrap = document.createElement("div");
      selectWrap.className = "unlockable-select";
      const label = document.createElement("label");
      label.textContent = "Achievement unlock";
      const select = document.createElement("select");
      select.dataset.unlockableSelect = "true";
      select.innerHTML = `<option value="">Use default (${item.unlock?.label || "Free"})</option>`;

      achievementOptions.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.id;
        option.textContent = opt.label;
        select.appendChild(option);
      });

      const override = state.unlockableOverrides?.[type]?.[item.id];
      if (override?.type === "achievement") {
        select.value = override.id;
      }
      if (override && override.type !== "achievement") {
        select.disabled = true;
        const note = document.createElement("div");
        note.className = "muted";
        note.textContent = `Override locked: ${override.type}`;
        selectWrap.appendChild(note);
      }

      selectWrap.append(label, select);
      card.append(name, meta, selectWrap);
      section.appendChild(card);
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
  setStatus("Achievement editor ready", "ok");
  setMeta(`Config updated ${new Date(data.meta?.lastLoadedAt || Date.now()).toLocaleString()}`);
  renderAchievementEditor();
}

function renderNav() {
  const items = [
    { id: "achievements", label: "Achievements", render: renderAchievementEditor },
    { id: "unlockables", label: "Unlockable Mappings", render: renderUnlockableEditor }
  ];
  nav.innerHTML = "";
  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "nav-item";
    btn.textContent = item.label;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      item.render();
    });
    nav.appendChild(btn);
  });
  const first = nav.querySelector(".nav-item");
  if (first) first.classList.add("active");
}

renderNav();
loadConfig().catch((err) => {
  console.error(err);
  setStatus("Failed to load achievements", "error");
});
