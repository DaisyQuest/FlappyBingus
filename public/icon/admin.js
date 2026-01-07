import { getIconRegistry, saveIconRegistry } from "./modules/api.js";
import {
  collectIconDefinitions,
  createIconCard,
  readIconDefinition,
  wirePresetPanel,
  wireAdvancedPanel,
  validateIconCard
} from "./modules/editor.js";
import { createPlayerIconSprite } from "/js/playerIconSprites.js";

const statusChip = document.getElementById("adminStatus");
const statusText = document.getElementById("adminStatusText");
const nav = document.getElementById("iconNav");
const main = document.getElementById("iconMain");
const metaText = document.getElementById("adminMeta");
const loadingPanel = document.getElementById("iconLoading");

const state = {
  icons: [],
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

function stopPreview(canvas) {
  if (canvas?.__animation?.stop) canvas.__animation.stop();
}

function updatePreview(card) {
  const previewWrap = card.querySelector("[data-icon-preview]");
  if (!previewWrap) return;
  const icon = readIconDefinition(card);
  if (!icon) return;
  previewWrap.querySelectorAll("canvas").forEach((canvas) => stopPreview(canvas));
  previewWrap.innerHTML = "";

  const reducedMotion = Boolean(card.querySelector("[data-preview-reduce-motion]")?.checked);
  const showMask = Boolean(card.querySelector("[data-preview-mask]")?.checked);
  const bg = card.querySelector("[data-preview-bg]")?.value || "dark";
  previewWrap.dataset.previewBg = bg;

  const events = card.__previewEvents || [];
  [64, 128, 256].forEach((size) => {
    const canvas = createPlayerIconSprite(icon, { size, reducedMotion, events, showMask });
    canvas.classList.add("icon-preview-canvas");
    canvas.dataset.previewSize = String(size);
    previewWrap.appendChild(canvas);
  });
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
    "Edit the player icon registry, including each icon variant and its style."
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

  function attachCard(card) {
    grid.appendChild(card);
    wirePresetPanel(card);
    wireAdvancedPanel(card);
    updatePreview(card);
    const schedulePreview = () => {
      if (card.__previewRaf) return;
      const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : null;
      const next = () => {
        card.__previewRaf = null;
        updateHeading(card);
        updatePreview(card);
      };
      card.__previewRaf = raf ? raf(next) : setTimeout(next, 0);
    };
    card.addEventListener("input", schedulePreview);
    card.addEventListener("click", (event) => {
      const eventBtn = event.target.closest("[data-event-type]");
      if (eventBtn) {
        card.__previewEvents = card.__previewEvents || [];
        card.__previewEvents.push({ type: eventBtn.dataset.eventType, timeMs: performance.now() });
        schedulePreview();
      }
    });
  }

  function refreshList() {
    grid.innerHTML = "";
    state.previews.forEach((preview) => stopPreview(preview));
    state.previews.clear();
    state.icons.forEach((icon) => {
      if (!icon?.id) return;
      const card = createIconCard({ icon, allowRemove: true });
      attachCard(card);
    });
  }

  reloadBtn.addEventListener("click", () => loadConfig());
  addBtn.addEventListener("click", () => {
    const card = createIconCard({
      icon: { id: "", name: "", unlock: { type: "free" }, style: {} },
      allowRemove: false
    });
    grid.prepend(card);
    wirePresetPanel(card);
    wireAdvancedPanel(card);
    updatePreview(card);
    card.addEventListener("input", () => {
      updateHeading(card);
      updatePreview(card);
    });
  });
  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Saving icons…");
      const cards = Array.from(grid.querySelectorAll("[data-icon-card]"));
      const invalid = cards.flatMap((card) => {
        const result = validateIconCard(card);
        const errorBox = card.querySelector("[data-validation-errors]");
        if (errorBox) errorBox.innerHTML = "";
        if (!result.ok) {
          if (errorBox) {
            errorBox.innerHTML = result.errors.map((err) => `<div>${err.path}: ${err.message}</div>`).join("");
          }
          return result.errors.map((err) => `${err.path}: ${err.message}`);
        }
        return [];
      });
      if (invalid.length) {
        setStatus("Fix validation errors before saving.", "error");
        return;
      }
      const icons = collectIconDefinitions(grid);
      const saved = await saveIconRegistry({ icons });
      state.icons = Array.isArray(saved?.icons) ? saved.icons : icons;
      setStatus("Icons saved", "ok");
    } catch (err) {
      console.error(err);
      setStatus("Failed to save icons", "error");
    }
  });

  refreshList();
}

async function loadConfig() {
  setStatus("Loading icons…");
  try {
    const data = await getIconRegistry();
    state.icons = Array.isArray(data?.icons) ? data.icons : [];
    renderIconEditor();
    setMeta(`Last updated: ${new Date(data.meta?.lastLoadedAt || Date.now()).toLocaleString()}`);
    setStatus("Icon registry ready", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load icons", "error");
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
