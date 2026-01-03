import { getAchievementConfig, saveAchievementConfig } from "./modules/api.js";
import { collectDefinitions, createAchievementCard } from "./modules/editor.js";

const statusChip = document.getElementById("adminStatus");
const statusText = document.getElementById("adminStatusText");
const nav = document.getElementById("achievementNav");
const main = document.getElementById("achievementMain");
const metaText = document.getElementById("adminMeta");

const state = {
  schema: null,
  definitions: []
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
      await saveAchievementConfig({ definitions });
      setStatus("Achievements saved", "ok");
    } catch (err) {
      setStatus("Failed to save achievements", "error");
      console.error(err);
    }
  });

  refreshList();
}


async function loadConfig() {
  setStatus("Loading achievement configuration…");
  const data = await getAchievementConfig();
  state.schema = data.achievements?.schema || {};
  state.definitions = Array.isArray(data.achievements?.definitions) ? data.achievements.definitions : [];
  setStatus("Achievement editor ready", "ok");
  setMeta(`Config updated ${new Date(data.meta?.lastLoadedAt || Date.now()).toLocaleString()}`);
  renderAchievementEditor();
}

function renderNav() {
  nav.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "nav-item active";
  btn.textContent = "Achievements";
  btn.addEventListener("click", () => renderAchievementEditor());
  nav.appendChild(btn);
}

renderNav();
loadConfig().catch((err) => {
  console.error(err);
  setStatus("Failed to load achievements", "error");
});
