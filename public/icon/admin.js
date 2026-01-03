import { getIconStyleOverrides, saveIconStyleOverrides } from "./modules/api.js";
import { collectIconOverrides, createIconCard, readIconDefinition } from "./modules/editor.js";
import { createPlayerIconSprite } from "/js/playerIconSprites.js";

const statusChip = document.getElementById("adminStatus");
const statusText = document.getElementById("adminStatusText");
const nav = document.getElementById("iconNav");
const main = document.getElementById("iconMain");
const metaText = document.getElementById("adminMeta");
const loadingPanel = document.getElementById("iconLoading");

const state = {
  icons: [],
  defaults: [],
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

function buildDefaultsMap() {
  const map = new Map();
  (state.defaults || []).forEach((icon) => {
    if (icon?.id) map.set(icon.id, icon);
  });
  return map;
}

function stopPreview(canvas) {
  if (canvas?.__animation?.stop) canvas.__animation.stop();
}

function updatePreview(card, defaultsMap) {
  const previewWrap = card.querySelector("[data-icon-preview]");
  if (!previewWrap) return;
  const icon = readIconDefinition(card);
  const fallbackId = card.querySelector("[data-field='id']")?.value?.trim();
  const fallback = defaultsMap.get(fallbackId);
  const resolved = icon || fallback;
  if (!resolved) return;

  const previous = previewWrap.querySelector("canvas");
  if (previous) stopPreview(previous);
  previewWrap.innerHTML = "";
  const canvas = createPlayerIconSprite(resolved, { size: 96 });
  canvas.classList.add("icon-preview-canvas");
  previewWrap.appendChild(canvas);
}

function updateHeading(card) {
  const heading = card.querySelector("header h3");
  if (!heading) return;
  const name = card.querySelector("[data-field='name']")?.value?.trim();
  const id = card.querySelector("[data-field='id']")?.value?.trim();
  heading.textContent = name || id || "New icon";
}

function renderIconEditor() {
  clearMain();
  const { panel, actions } = createPanel(
    "Player Icons",
    "Modify icon styles, combine animations with PNGs, and publish new icons instantly."
  );
  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Reload";
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add icon";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "primary";
  actions.append(reloadBtn, addBtn, saveBtn);

  const grid = document.createElement("div");
  grid.className = "icon-grid";
  panel.appendChild(grid);
  main.appendChild(panel);

  const defaultsMap = buildDefaultsMap();

  function attachCard(card) {
    grid.appendChild(card);
    updatePreview(card, defaultsMap);
    card.addEventListener("input", () => {
      updateHeading(card);
      updatePreview(card, defaultsMap);
    });
  }

  function refreshList() {
    grid.innerHTML = "";
    state.previews.forEach((preview) => stopPreview(preview));
    state.previews.clear();
    state.icons.forEach((icon) => {
      if (!icon?.id) return;
      const defaults = defaultsMap.get(icon.id);
      const card = createIconCard({
        icon,
        defaults,
        allowRemove: Boolean(defaults)
      });
      attachCard(card);
    });
  }

  reloadBtn.addEventListener("click", () => loadConfig());
  addBtn.addEventListener("click", () => {
    const card = createIconCard({
      icon: { id: "", name: "", unlock: { type: "free" }, style: {} },
      defaults: {},
      allowRemove: false
    });
    grid.prepend(card);
    updatePreview(card, defaultsMap);
    card.addEventListener("input", () => {
      updateHeading(card);
      updatePreview(card, defaultsMap);
    });
  });
  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Saving icon styles…");
      const overrides = collectIconOverrides(grid);
      await saveIconStyleOverrides({ overrides });
      state.overrides = overrides;
      setStatus("Icon styles saved", "ok");
    } catch (err) {
      console.error(err);
      setStatus("Failed to save icon styles", "error");
    }
  });

  refreshList();
}

async function loadConfig() {
  setStatus("Loading icon styles…");
  try {
    const data = await getIconStyleOverrides();
    state.icons = Array.isArray(data?.icons) ? data.icons : [];
    state.defaults = Array.isArray(data?.defaults) ? data.defaults : [];
    state.overrides = data?.overrides && typeof data.overrides === "object" ? data.overrides : {};
    renderIconEditor();
    setMeta(`Last updated: ${new Date(data.meta?.lastLoadedAt || Date.now()).toLocaleString()}`);
    setStatus("Icon editor ready", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load icon styles", "error");
  }
}

function renderNav() {
  nav.innerHTML = "";
  const item = document.createElement("button");
  item.className = "nav-item active";
  item.innerHTML = "<strong>Icons</strong><small>Player icon styling</small>";
  nav.appendChild(item);
}

renderNav();
if (loadingPanel) loadingPanel.remove();
loadConfig();
