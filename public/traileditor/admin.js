import { DEFAULT_TRAILS } from "/js/trailProgression.js";
import { TRAIL_STYLE_IDS, trailStyleFor } from "/js/trailStyles.js";
import { getBestParticleEffects, getRoundTableAgents } from "/shared/particleLibrary.js";
import { collectTrailDefinitions, createTrailCard } from "./modules/editor.js";

const statusChip = document.getElementById("adminStatus");
const statusText = document.getElementById("adminStatusText");
const nav = document.getElementById("trailNav");
const main = document.getElementById("trailMain");
const metaText = document.getElementById("adminMeta");

const state = {
  trails: [],
  particleEffects: getBestParticleEffects(),
  agents: getRoundTableAgents(),
  styleIds: [...TRAIL_STYLE_IDS]
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

function exportTrails(grid) {
  const styleLookup = Object.fromEntries(state.styleIds.map((id) => [id, trailStyleFor(id)]));
  const payload = collectTrailDefinitions(grid, { styleLookup });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "trail-editor.json";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Exported trail JSON", "ok");
}

async function copyTrails(grid) {
  const styleLookup = Object.fromEntries(state.styleIds.map((id) => [id, trailStyleFor(id)]));
  const payload = JSON.stringify(collectTrailDefinitions(grid, { styleLookup }), null, 2);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(payload);
    setStatus("Copied trail JSON to clipboard", "ok");
    return;
  }
  setStatus("Clipboard unavailable; use export instead", "error");
}

function renderTrailEditor() {
  clearMain();
  const { panel, actions } = createPanel(
    "Trail Catalog",
    "Customize trail animations, particle mixes, and unlock logic."
  );

  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Reload defaults";
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add trail";
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

  function styleMap() {
    return Object.fromEntries(state.styleIds.map((id) => [id, trailStyleFor(id)]));
  }

  function refresh() {
    grid.innerHTML = "";
    const map = styleMap();
    state.trails.forEach((trail) => {
      grid.appendChild(createTrailCard(trail, {
        particleEffects: state.particleEffects,
        styleIds: state.styleIds,
        styleMap: map
      }));
    });
  }

  reloadBtn.addEventListener("click", () => {
    state.trails = DEFAULT_TRAILS.map((trail) => ({ ...trail }));
    refresh();
    setStatus("Reloaded trail defaults", "ok");
  });

  addBtn.addEventListener("click", () => {
    const blank = {
      id: "",
      name: "",
      unlock: null,
      styleId: state.styleIds[0]
    };
    state.trails.push(blank);
    grid.appendChild(createTrailCard(blank, {
      particleEffects: state.particleEffects,
      styleIds: state.styleIds,
      styleMap: styleMap()
    }));
  });

  copyBtn.addEventListener("click", () => copyTrails(grid));
  exportBtn.addEventListener("click", () => exportTrails(grid));

  refresh();
}

function renderParticleLibrary() {
  clearMain();
  const { panel } = createPanel(
    "Particle Research Round Table",
    "Ten agents compared trail particle motifs and selected a top 20 library."
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
    { id: "trails", label: "Trails", render: renderTrailEditor },
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
  state.trails = DEFAULT_TRAILS.map((trail) => ({ ...trail }));
  setStatus("Trail editor ready", "ok");
  setMeta(`Loaded ${state.trails.length} trails · ${new Date().toLocaleString()}`);
}

renderNav();
loadDefaults();
renderTrailEditor();
