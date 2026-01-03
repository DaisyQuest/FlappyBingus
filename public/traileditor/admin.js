import { getTrailStyleOverrides, saveTrailStyleOverrides } from "./modules/api.js";
import { collectTrailOverrides, createTrailCard } from "./modules/editor.js";
import { TrailPreview } from "/js/trailPreview.js";
import { getTrailStyleDefaults, setTrailStyleOverrides, TRAIL_STYLE_IDS } from "/js/trailStyles.js";

const statusChip = document.getElementById("adminStatus");
const statusText = document.getElementById("adminStatusText");
const nav = document.getElementById("trailNav");
const main = document.getElementById("trailMain");
const metaText = document.getElementById("adminMeta");
const loadingPanel = document.getElementById("trailLoading");

const state = {
  trails: [],
  overrides: {},
  previews: new Map()
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

function buildTrailList(trails = [], overrides = {}) {
  const ids = new Set(TRAIL_STYLE_IDS);
  Object.keys(overrides || {}).forEach((id) => ids.add(id));
  (trails || []).forEach((trail) => {
    if (trail?.id) ids.add(trail.id);
  });
  return Array.from(ids).sort().map((id) => trails.find((trail) => trail.id === id) || { id });
}

function attachPreview(card, id) {
  const canvas = card.querySelector(".trail-preview-canvas");
  if (!canvas) return;
  const preview = new TrailPreview({ canvas });
  preview.setTrail(id);
  preview.start();
  state.previews.set(card, preview);
}

function refreshPreviewsForId(id) {
  state.previews.forEach((preview, card) => {
    const cardId = card.querySelector("[data-field='id']")?.value?.trim() || card.dataset.trailId;
    if (!id || cardId === id) {
      preview.setTrail(cardId || "classic");
    }
  });
}

function renderTrailEditor() {
  clearMain();
  const { panel, actions } = createPanel(
    "Trail Styles",
    "Modify existing trails, combine multiple particle groups, and ship new trails instantly."
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
  grid.className = "trail-grid";
  panel.appendChild(grid);
  main.appendChild(panel);

  function refreshList() {
    grid.innerHTML = "";
    state.previews.forEach((preview) => preview.stop());
    state.previews.clear();
    const trails = buildTrailList(state.trails, state.overrides);

    trails.forEach((trail) => {
      const id = trail.id;
      const override = state.overrides[id] || {};
      const isDefault = TRAIL_STYLE_IDS.includes(id);
      const defaults = getTrailStyleDefaults(isDefault ? id : "classic");
      const card = createTrailCard({
        id,
        defaults,
        override,
        trail,
        allowRemove: !isDefault
      });
      grid.appendChild(card);
      attachPreview(card, id);
      card.addEventListener("input", () => {
        state.overrides = collectTrailOverrides(grid);
        setTrailStyleOverrides(state.overrides);
        refreshPreviewsForId();
      });
    });
  }

  reloadBtn.addEventListener("click", () => loadConfig());
  addBtn.addEventListener("click", () => {
    const defaults = getTrailStyleDefaults("classic");
    const card = createTrailCard({
      id: "",
      defaults,
      override: { ...defaults },
      trail: { name: "", unlock: { type: "free" } },
      allowRemove: true
    });
    grid.prepend(card);
    attachPreview(card, "classic");
    card.addEventListener("input", () => {
      state.overrides = collectTrailOverrides(grid);
      setTrailStyleOverrides(state.overrides);
      refreshPreviewsForId();
    });
  });
  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Saving trail styles…");
      const overrides = collectTrailOverrides(grid);
      await saveTrailStyleOverrides({ overrides });
      state.overrides = overrides;
      setTrailStyleOverrides(state.overrides);
      setStatus("Trail styles saved", "ok");
    } catch (err) {
      console.error(err);
      setStatus("Failed to save trail styles", "error");
    }
  });

  refreshList();
}

async function loadConfig() {
  setStatus("Loading trail styles…");
  try {
    const data = await getTrailStyleOverrides();
    state.overrides = data?.overrides && typeof data.overrides === "object" ? data.overrides : {};
    state.trails = Array.isArray(data?.trails) ? data.trails : [];
    setTrailStyleOverrides(state.overrides);
    renderTrailEditor();
    setMeta(`Last updated: ${new Date().toLocaleString()}`);
    setStatus("Trail editor ready", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load trail styles", "error");
  }
}

function renderNav() {
  nav.innerHTML = "";
  const item = document.createElement("button");
  item.className = "nav-item active";
  item.innerHTML = "<strong>Trails</strong><small>Trail particle styling</small>";
  nav.appendChild(item);
}

renderNav();
if (loadingPanel) loadingPanel.remove();
loadConfig();
