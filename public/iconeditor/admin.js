import { DEFAULT_PLAYER_ICONS } from "/js/playerIcons.js";
import { getBestParticleEffects, getRoundTableAgents } from "/shared/particleLibrary.js";
import { collectIconDefinitions, createIconCard } from "./modules/editor.js";

const statusChip = document.getElementById("adminStatus");
const statusText = document.getElementById("adminStatusText");
const nav = document.getElementById("iconNav");
const main = document.getElementById("iconMain");
const metaText = document.getElementById("adminMeta");

const state = {
  icons: [],
  particleEffects: getBestParticleEffects(),
  agents: getRoundTableAgents()
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

function exportIcons(grid) {
  const icons = collectIconDefinitions(grid);
  const payload = { icons };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "icon-editor.json";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Exported icon JSON", "ok");
}

async function copyIcons(grid) {
  const icons = collectIconDefinitions(grid);
  const payload = JSON.stringify({ icons }, null, 2);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(payload);
    setStatus("Copied icon JSON to clipboard", "ok");
    return;
  }
  setStatus("Clipboard unavailable; use export instead", "error");
}

function renderIconEditor() {
  clearMain();
  const { panel, actions } = createPanel(
    "Icon Catalog",
    "Customize player icons, their animations, and internal particle mixes."
  );

  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Reload defaults";
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add icon";
  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy JSON";
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export JSON";
  exportBtn.className = "primary";
  actions.append(reloadBtn, addBtn, copyBtn, exportBtn);

  const grid = document.createElement("div");
  grid.className = "editor-grid";
  panel.appendChild(grid);
  main.appendChild(panel);

  function refresh() {
    grid.innerHTML = "";
    state.icons.forEach((icon) => {
      grid.appendChild(createIconCard(icon, { particleEffects: state.particleEffects }));
    });
  }

  reloadBtn.addEventListener("click", () => {
    state.icons = DEFAULT_PLAYER_ICONS.map((icon) => ({ ...icon }));
    refresh();
    setStatus("Reloaded icon defaults", "ok");
  });

  addBtn.addEventListener("click", () => {
    const blank = {
      id: "",
      name: "",
      unlock: { type: "free", label: "Free" },
      style: { fill: "", core: "", rim: "", glow: "" }
    };
    state.icons.push(blank);
    grid.appendChild(createIconCard(blank, { particleEffects: state.particleEffects }));
  });

  copyBtn.addEventListener("click", () => copyIcons(grid));
  exportBtn.addEventListener("click", () => exportIcons(grid));

  refresh();
}

function renderParticleLibrary() {
  clearMain();
  const { panel } = createPanel(
    "Particle Research Round Table",
    "Ten agents compared particle styles and selected a top 20 library for icon and trail effects."
  );
  const agentGrid = document.createElement("div");
  agentGrid.className = "agent-grid";

  state.agents.forEach((agent) => {
    const card = document.createElement("div");
    card.className = "agent-card";
    const title = document.createElement("strong");
    title.textContent = `${agent.name} — ${agent.focus}`;
    const list = document.createElement("div");
    list.className = "effect-list";
    agent.suggestions.forEach((suggestion) => {
      const pill = document.createElement("span");
      pill.className = "effect-pill";
      pill.textContent = suggestion;
      list.appendChild(pill);
    });
    card.append(title, list);
    agentGrid.appendChild(card);
  });

  const bestSection = document.createElement("div");
  bestSection.className = "list-card";
  const bestHeader = document.createElement("div");
  bestHeader.className = "panel-header";
  bestHeader.innerHTML = `<strong>Best 20 Particle Effects</strong> <span class="badge">${state.particleEffects.length}</span>`;
  const bestList = document.createElement("div");
  bestList.className = "effect-list";
  state.particleEffects.forEach((effect) => {
    const pill = document.createElement("span");
    pill.className = "effect-pill";
    pill.textContent = effect;
    bestList.appendChild(pill);
  });
  bestSection.append(bestHeader, bestList);

  panel.append(agentGrid, bestSection);
  main.appendChild(panel);
}

function renderNav() {
  const items = [
    { id: "icons", label: "Icons", render: renderIconEditor },
    { id: "particles", label: "Particle Library", render: renderParticleLibrary }
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

function loadDefaults() {
  state.icons = DEFAULT_PLAYER_ICONS.map((icon) => ({ ...icon }));
  setStatus("Icon editor ready", "ok");
  setMeta(`Loaded ${state.icons.length} icons · ${new Date().toLocaleString()}`);
}

renderNav();
loadDefaults();
renderIconEditor();
