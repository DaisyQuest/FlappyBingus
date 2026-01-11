import { getIconRegistry, saveIconRegistry } from "./modules/api.js";
import {
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
  editor: null
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
  const previewStatus = card.querySelector("[data-preview-status]");
  const previewLabel = card.__previewLabel || "Idle";
  if (previewStatus) previewStatus.textContent = `Preview: ${previewLabel}`;
  previewWrap.dataset.previewBg = bg;

  const events = card.__previewEvents || [];
  const activeTrigger = card.dataset.previewTrigger ?? "";
  card.querySelectorAll("[data-animation-slot]").forEach((slot) => {
    const slotTrigger = slot.dataset.animationTrigger ?? "";
    slot.classList.toggle("active-preview", slotTrigger === activeTrigger);
  });
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

  const content = document.createElement("div");
  panel.appendChild(content);
  main.appendChild(panel);

  function attachCard(card) {
    wirePresetPanel(card);
    wireAdvancedPanel(card);
    card.__previewLabel = "Idle";
    card.__previewEvents = [];
    card.dataset.previewTrigger = "";
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
      const previewBtn = event.target.closest("[data-preview-trigger]");
      if (!previewBtn) return;
      const trigger = previewBtn.dataset.previewTrigger ?? "";
      const label = previewBtn.dataset.previewLabel || "Idle";
      card.__previewEvents = trigger ? [{ type: trigger, timeMs: performance.now() }] : [];
      card.__previewLabel = label;
      card.dataset.previewTrigger = trigger;
      schedulePreview();
    });
    card.addEventListener("focusin", (event) => {
      const slot = event.target.closest("[data-animation-slot]");
      if (!slot) return;
      const label = slot.dataset.animationLabel || "Idle";
      card.__previewLabel = `Editing: ${label}`;
      card.dataset.previewTrigger = slot.dataset.animationTrigger ?? "";
      schedulePreview();
    });
  }

  function renderList() {
    content.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "icon-grid";
    state.icons.forEach((icon, index) => {
      if (!icon?.id) return;
      const card = document.createElement("section");
      card.className = "icon-summary-card";
      const header = document.createElement("div");
      header.className = "icon-summary-header";
      const title = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = icon.name || icon.id || "Untitled icon";
      const meta = document.createElement("small");
      meta.textContent = icon.id;
      meta.className = "muted";
      title.append(name, meta);
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.dataset.editIndex = String(index);
      header.append(title, editBtn);
      const preview = createPlayerIconSprite(icon, { size: 128, reducedMotion: true });
      preview.classList.add("icon-summary-preview");
      card.append(header, preview);
      grid.appendChild(card);
    });
    grid.addEventListener("click", (event) => {
      const editBtn = event.target.closest("[data-edit-index]");
      if (!editBtn) return;
      const index = Number(editBtn.dataset.editIndex);
      renderDetail(index);
    });
    content.appendChild(grid);
  }

  function renderDetail(index, draftIcon = null) {
    content.innerHTML = "";
    const backBtn = document.createElement("button");
    backBtn.textContent = "Back to list";
    const saveIconBtn = document.createElement("button");
    saveIconBtn.textContent = "Save icon";
    saveIconBtn.className = "primary";
    actions.replaceChildren(backBtn, saveIconBtn);

    const isDraft = Boolean(draftIcon) || index === null || index === undefined;
    const icon = draftIcon
      || (!isDraft ? state.icons[index] : null)
      || { id: "", name: "", unlock: { type: "free" }, style: {} };
    const card = createIconCard({ icon, allowRemove: true });
    attachCard(card);
    content.appendChild(card);
    state.editor = { index: isDraft ? null : index, card, isNew: isDraft };

    backBtn.addEventListener("click", () => {
      const iconUpdate = readIconDefinition(card);
      if (iconUpdate?.id) {
        if (state.editor.isNew) state.icons.push(iconUpdate);
        else if (state.editor.index !== null) state.icons[state.editor.index] = iconUpdate;
      }
      state.editor = null;
      renderIconEditor();
    });

    saveIconBtn.addEventListener("click", () => {
      const result = validateIconCard(card);
      const errorBox = card.querySelector("[data-validation-errors]");
      if (errorBox) errorBox.innerHTML = "";
      if (!result.ok) {
        if (errorBox) {
          errorBox.innerHTML = result.errors.map((err) => `<div>${err.path}: ${err.message}</div>`).join("");
        }
        setStatus("Fix validation errors before saving.", "error");
        return;
      }
      const iconUpdate = readIconDefinition(card);
      if (!iconUpdate?.id) {
        setStatus("Icon ID is required before saving.", "error");
        return;
      }
      if (state.editor.isNew) {
        state.icons.push(iconUpdate);
        state.editor.isNew = false;
        state.editor.index = state.icons.length - 1;
      } else {
        state.icons[state.editor.index] = iconUpdate;
      }
      setStatus("Icon draft saved.", "ok");
    });
  }

  reloadBtn.addEventListener("click", () => loadConfig());
  addBtn.addEventListener("click", () => {
    renderDetail(null, { id: "", name: "", unlock: { type: "free" }, style: {} });
  });
  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Saving icons…");
      if (state.editor?.card) {
        const editorResult = validateIconCard(state.editor.card);
        const errorBox = state.editor.card.querySelector("[data-validation-errors]");
        if (errorBox) errorBox.innerHTML = "";
        if (!editorResult.ok) {
          if (errorBox) {
            errorBox.innerHTML = editorResult.errors.map((err) => `<div>${err.path}: ${err.message}</div>`).join("");
          }
          setStatus("Fix validation errors before saving.", "error");
          return;
        }
        const editorIcon = readIconDefinition(state.editor.card);
        if (editorIcon?.id) {
          if (state.editor.isNew) state.icons.push(editorIcon);
          else state.icons[state.editor.index] = editorIcon;
          state.editor.isNew = false;
        }
      }
      const icons = state.icons.filter((icon) => icon?.id);
      const saved = await saveIconRegistry({ icons });
      state.icons = Array.isArray(saved?.icons) ? saved.icons : icons;
      setStatus("Icons saved", "ok");
      renderIconEditor();
    } catch (err) {
      console.error(err);
      setStatus("Failed to save icons", "error");
    }
  });

  renderList();
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
