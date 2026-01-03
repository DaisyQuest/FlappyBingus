import { clearCustomTrailStyles, getTrailStyleIds, registerTrailStyles, trailStyleFor } from "/js/trailStyles.js";
import { getBestParticleEffects, getRoundTableAgents } from "/shared/particleLibrary.js";
import { getCosmeticsConfig, saveCosmeticsConfig } from "/shared/adminCosmeticsApi.js";
import { collectTrailDefinitions, createTrailCard } from "./modules/editor.js";

const statusChip = document.getElementById("adminStatus");
const statusText = document.getElementById("adminStatusText");
const nav = document.getElementById("trailNav");
const main = document.getElementById("trailMain");
const metaText = document.getElementById("adminMeta");

const state = {
  cosmetics: {},
  trails: [],
  particleEffects: getBestParticleEffects(),
  agents: getRoundTableAgents(),
  styleIds: []
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

function renderTrailEditor() {
  clearMain();
  const { panel, actions } = createPanel(
    "Trail Catalog",
    "Customize trail animations, particle mixes, and unlock logic."
  );

  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Reload";
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add trail";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "primary";
  actions.append(reloadBtn, addBtn, saveBtn);

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

  reloadBtn.addEventListener("click", () => loadConfig());

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

  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Saving trails…");
      const payload = collectTrailDefinitions(grid, { styleLookup: styleMap() });
      const icons = state.cosmetics?.icons ?? null;
      const res = await saveCosmeticsConfig({ icons, trails: payload.trails, trailStyles: payload.styles });
      const nextTrails = Array.isArray(res.catalog?.trails) ? res.catalog.trails : payload.trails;
      const nextTrailStyles = res.catalog?.trailStyles || payload.styles || {};
      state.cosmetics = { ...(state.cosmetics || {}), trails: nextTrails, trailStyles: nextTrailStyles };
      clearCustomTrailStyles();
      registerTrailStyles(nextTrailStyles);
      state.styleIds = getTrailStyleIds();
      state.trails = nextTrails.map((trail) => ({ ...trail }));
      refresh();
      setStatus("Trails saved", "ok");
    } catch (err) {
      console.error(err);
      setStatus("Failed to save trails", "error");
    }
  });

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

async function loadConfig() {
  setStatus("Loading trail configuration…");
  const data = await getCosmeticsConfig();
  state.cosmetics = data.cosmetics || {};
  const fromConfig = Array.isArray(state.cosmetics.trails) ? state.cosmetics.trails : null;
  const fromCatalog = Array.isArray(data.catalog?.trails) ? data.catalog.trails : [];
  const trailStyles = state.cosmetics?.trailStyles || data.catalog?.trailStyles || {};
  clearCustomTrailStyles();
  registerTrailStyles(trailStyles);
  state.styleIds = getTrailStyleIds();
  state.trails = (fromConfig || fromCatalog).map((trail) => ({ ...trail }));
  setStatus("Trail editor ready", "ok");
  setMeta(`Config updated ${new Date(data.meta?.lastLoadedAt || Date.now()).toLocaleString()}`);
  renderTrailEditor();
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

renderNav();
loadConfig().catch((err) => {
  console.error(err);
  setStatus("Failed to load trails", "error");
});
