import {
  getServerConfig,
  saveServerConfig,
  getGameConfig,
  saveGameConfig,
  listCollections,
  listDocuments,
  getDocument,
  createDocument,
  saveDocument
} from "./modules/api.js";
import { createJsonEditor } from "./modules/editor.js";
import { getAchievementConfig, saveAchievementConfig } from "/achievementeditor/modules/api.js";
import {
  collectDefinitions,
  collectUnlockableOverrides,
  createAchievementCard
} from "/achievementeditor/modules/editor.js";
import { getTrailStyleOverrides, saveTrailStyleOverrides } from "/traileditor/modules/api.js";
import { collectTrailOverrides, createTrailCard } from "/traileditor/modules/editor.js";
import { getIconStyleOverrides, saveIconStyleOverrides } from "/icon/modules/api.js";
import { collectIconOverrides, createIconCard, readIconDefinition } from "/icon/modules/editor.js";
import { TrailPreview } from "/js/trailPreview.js";
import { getTrailStyleDefaults, setTrailStyleOverrides, TRAIL_STYLE_IDS } from "/js/trailStyles.js";
import { createPlayerIconSprite } from "/js/playerIconSprites.js";

const statusChip = document.getElementById("adminStatus");
const statusText = document.getElementById("adminStatusText");
const nav = document.getElementById("adminNav");
const main = document.getElementById("adminMain");
const metaText = document.getElementById("adminMeta");

const UNLOCK_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "achievement", label: "Achievement" },
  { value: "score", label: "Score" },
  { value: "purchase", label: "Purchase" },
  { value: "record", label: "Record holder" }
];

const achievementState = {
  schema: null,
  definitions: [],
  unlockables: [],
  unlockableOverrides: {},
  loaded: false
};

const trailState = {
  overrides: {},
  previews: new Map(),
  loaded: false
};

const iconState = {
  icons: [],
  defaults: [],
  overrides: {},
  previews: new Map(),
  loaded: false
};

function setStatus(text, tone = "info") {
  statusText.textContent = text;
  statusChip.dataset.tone = tone;
  statusChip.querySelector(".status-dot").style.background =
    tone === "error" ? "#f87171" : tone === "ok" ? "#22c55e" : "#60a5fa";
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

function clearMain() {
  main.innerHTML = "";
}

function setMeta(text) {
  metaText.textContent = text;
}

async function renderServerConfig() {
  clearMain();
  const { panel, actions } = createPanel("Server Config", "Edit the live server configuration.");
  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Reload";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "primary";
  actions.append(reloadBtn, saveBtn);
  const editorWrap = document.createElement("div");
  panel.appendChild(editorWrap);
  main.appendChild(panel);

  let editor;
  async function loadConfig() {
    setStatus("Loading server config…");
    const data = await getServerConfig();
    setStatus("Server config loaded", "ok");
    setMeta(`Config updated ${new Date(data.meta?.lastLoadedAt || Date.now()).toLocaleString()}`);
    editorWrap.innerHTML = "";
    editor = createJsonEditor({ value: data.config, label: "Server Config" });
    editorWrap.appendChild(editor.element);
  }

  reloadBtn.addEventListener("click", () => loadConfig());
  saveBtn.addEventListener("click", async () => {
    if (!editor) return;
    setStatus("Saving server config…");
    const payload = editor.getValue();
    await saveServerConfig(payload);
    setStatus("Server config saved", "ok");
  });

  await loadConfig();
}

async function renderGameConfig() {
  clearMain();
  const { panel, actions } = createPanel("Game Config", "Controls gameplay values used by the client.");
  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Reload";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "primary";
  actions.append(reloadBtn, saveBtn);
  const editorWrap = document.createElement("div");
  panel.appendChild(editorWrap);
  main.appendChild(panel);

  let editor;
  async function loadConfig() {
    setStatus("Loading game config…");
    const data = await getGameConfig();
    setStatus("Game config loaded", "ok");
    setMeta(`Game config path: ${data.path || "unknown"}`);
    editorWrap.innerHTML = "";
    editor = createJsonEditor({ value: data.config, label: "Game Config" });
    editorWrap.appendChild(editor.element);
  }

  reloadBtn.addEventListener("click", () => loadConfig());
  saveBtn.addEventListener("click", async () => {
    if (!editor) return;
    setStatus("Saving game config…");
    const payload = editor.getValue();
    await saveGameConfig(payload);
    setStatus("Game config saved", "ok");
  });

  await loadConfig();
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

async function loadAchievementConfig() {
  setStatus("Loading achievements…");
  const data = await getAchievementConfig();
  achievementState.schema = data.achievements?.schema || {};
  achievementState.definitions = Array.isArray(data.achievements?.definitions) ? data.achievements.definitions : [];
  achievementState.unlockables = Array.isArray(data.unlockables) ? data.unlockables : [];
  achievementState.unlockableOverrides = data.unlockableOverrides || {};
  achievementState.loaded = true;
  setStatus("Achievements loaded", "ok");
  setMeta(`Config updated ${new Date(data.meta?.lastLoadedAt || Date.now()).toLocaleString()}`);
}

async function renderAchievementEditor() {
  if (!achievementState.loaded) await loadAchievementConfig();
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
    achievementState.definitions.forEach((definition) => {
      grid.appendChild(createAchievementCard(definition, achievementState.schema || {}));
    });
  }

  reloadBtn.addEventListener("click", async () => {
    await loadAchievementConfig();
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
    achievementState.definitions.push(blank);
    grid.appendChild(createAchievementCard(blank, achievementState.schema || {}));
  });
  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Saving achievements…");
      const definitions = collectDefinitions(grid);
      const response = await saveAchievementConfig({
        definitions,
        unlockableOverrides: achievementState.unlockableOverrides
      });
      achievementState.definitions = Array.isArray(response?.achievements?.definitions)
        ? response.achievements.definitions
        : definitions;
      achievementState.unlockableOverrides = response?.unlockableOverrides || achievementState.unlockableOverrides;
      setStatus("Achievements saved", "ok");
    } catch (err) {
      setStatus("Failed to save achievements", "error");
      console.error(err);
    }
  });

  refreshList();
}

async function renderUnlockableEditor() {
  if (!achievementState.loaded) await loadAchievementConfig();
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
    await loadAchievementConfig();
    buildUnlockables();
  });

  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Saving unlockables…");
      const overrides = collectUnlockableOverrides({
        unlockableOverrides: achievementState.unlockableOverrides,
        root: grid
      });
      const response = await saveAchievementConfig({
        definitions: achievementState.definitions,
        unlockableOverrides: overrides
      });
      achievementState.unlockableOverrides = response?.unlockableOverrides || overrides;
      setStatus("Unlockables saved", "ok");
    } catch (err) {
      setStatus("Failed to save unlockables", "error");
      console.error(err);
    }
  });

  function buildUnlockables() {
    grid.innerHTML = "";
    const grouped = achievementState.unlockables.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {});

    const achievementOptions = achievementState.definitions.map((def) => ({
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

        const currentOverride = achievementState.unlockableOverrides?.[type]?.[item.id];
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

    setStatus("Unlockables ready", "ok");
  }

  buildUnlockables();
}

function buildTrailIds(overrides = {}) {
  const ids = new Set(TRAIL_STYLE_IDS);
  Object.keys(overrides || {}).forEach((id) => ids.add(id));
  return Array.from(ids).sort();
}

function attachTrailPreview(card, id) {
  const canvas = card.querySelector(".trail-preview-canvas");
  if (!canvas) return;
  const preview = new TrailPreview({ canvas });
  preview.setTrail(id);
  preview.start();
  trailState.previews.set(card, preview);
}

function refreshTrailPreviews(id) {
  trailState.previews.forEach((preview, card) => {
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
    trailState.previews.forEach((preview) => preview.stop());
    trailState.previews.clear();
    const ids = buildTrailIds(trailState.overrides);

    ids.forEach((id) => {
      const override = trailState.overrides[id] || {};
      const isDefault = TRAIL_STYLE_IDS.includes(id);
      const defaults = getTrailStyleDefaults(isDefault ? id : "classic");
      const card = createTrailCard({
        id,
        defaults,
        override,
        allowRemove: !isDefault
      });
      grid.appendChild(card);
      attachTrailPreview(card, id);
      card.addEventListener("input", () => {
        trailState.overrides = collectTrailOverrides(grid);
        setTrailStyleOverrides(trailState.overrides);
        refreshTrailPreviews();
      });
    });
  }

  reloadBtn.addEventListener("click", () => loadTrailConfig());
  addBtn.addEventListener("click", () => {
    const defaults = getTrailStyleDefaults("classic");
    const card = createTrailCard({ id: "", defaults, override: { ...defaults }, allowRemove: true });
    grid.prepend(card);
    attachTrailPreview(card, "classic");
    card.addEventListener("input", () => {
      trailState.overrides = collectTrailOverrides(grid);
      setTrailStyleOverrides(trailState.overrides);
      refreshTrailPreviews();
    });
  });
  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Saving trail styles…");
      const overrides = collectTrailOverrides(grid);
      await saveTrailStyleOverrides({ overrides });
      trailState.overrides = overrides;
      setTrailStyleOverrides(trailState.overrides);
      setStatus("Trail styles saved", "ok");
    } catch (err) {
      console.error(err);
      setStatus("Failed to save trail styles", "error");
    }
  });

  refreshList();
}

async function loadTrailConfig() {
  setStatus("Loading trail styles…");
  try {
    const data = await getTrailStyleOverrides();
    trailState.overrides = data?.overrides && typeof data.overrides === "object" ? data.overrides : {};
    setTrailStyleOverrides(trailState.overrides);
    trailState.loaded = true;
    renderTrailEditor();
    setMeta(`Last updated: ${new Date().toLocaleString()}`);
    setStatus("Trail editor ready", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load trail styles", "error");
  }
}

function buildIconDefaultsMap() {
  const map = new Map();
  (iconState.defaults || []).forEach((icon) => {
    if (icon?.id) map.set(icon.id, icon);
  });
  return map;
}

function stopIconPreview(canvas) {
  if (canvas?.__animation?.stop) canvas.__animation.stop();
}

function updateIconPreview(card, defaultsMap) {
  const previewWrap = card.querySelector("[data-icon-preview]");
  if (!previewWrap) return;
  const enabled = card.querySelector("[data-field='overrideEnabled']")?.checked;
  const icon = enabled ? readIconDefinition(card) : null;
  const fallbackId = card.querySelector("[data-field='id']")?.value?.trim();
  const fallback = defaultsMap.get(fallbackId);
  const resolved = icon || fallback || readIconDefinition(card);
  if (!resolved) return;

  const previous = previewWrap.querySelector("canvas");
  if (previous) stopIconPreview(previous);
  previewWrap.innerHTML = "";
  const canvas = createPlayerIconSprite(resolved, { size: 96 });
  canvas.classList.add("icon-preview-canvas");
  previewWrap.appendChild(canvas);
}

function updateIconHeading(card) {
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

  const defaultsMap = buildIconDefaultsMap();

  function attachCard(card) {
    grid.appendChild(card);
    updateIconPreview(card, defaultsMap);
    card.addEventListener("input", () => {
      updateIconHeading(card);
      updateIconPreview(card, defaultsMap);
    });
    card.querySelector("[data-field='overrideEnabled']")?.addEventListener("change", () => {
      updateIconPreview(card, defaultsMap);
    });
  }

  function refreshList() {
    grid.innerHTML = "";
    iconState.previews.forEach((preview) => stopIconPreview(preview));
    iconState.previews.clear();

    const mergedIds = new Set();
    iconState.icons.forEach((icon) => {
      if (!icon?.id) return;
      mergedIds.add(icon.id);
      const defaults = defaultsMap.get(icon.id);
      const overrideEnabled = Boolean(iconState.overrides?.[icon.id]) || !defaults;
      const card = createIconCard({
        icon,
        defaults,
        overrideEnabled,
        allowRemove: Boolean(defaults)
      });
      attachCard(card);
    });

    iconState.defaults.forEach((icon) => {
      if (!icon?.id || mergedIds.has(icon.id)) return;
      const card = createIconCard({
        icon,
        defaults: icon,
        overrideEnabled: Boolean(iconState.overrides?.[icon.id]),
        allowRemove: true
      });
      attachCard(card);
    });
  }

  reloadBtn.addEventListener("click", () => loadIconConfig());
  addBtn.addEventListener("click", () => {
    const card = createIconCard({
      icon: { id: "", name: "", style: {} },
      defaults: {},
      overrideEnabled: true,
      allowRemove: false
    });
    grid.prepend(card);
    updateIconPreview(card, defaultsMap);
    card.addEventListener("input", () => {
      updateIconHeading(card);
      updateIconPreview(card, defaultsMap);
    });
  });
  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Saving icon styles…");
      const overrides = collectIconOverrides(grid, { existingOverrides: iconState.overrides });
      await saveIconStyleOverrides({ overrides });
      iconState.overrides = overrides;
      setStatus("Icon styles saved", "ok");
    } catch (err) {
      console.error(err);
      setStatus("Failed to save icon styles", "error");
    }
  });

  refreshList();
}

async function loadIconConfig() {
  setStatus("Loading icon styles…");
  try {
    const data = await getIconStyleOverrides();
    iconState.icons = Array.isArray(data?.icons) ? data.icons : [];
    iconState.defaults = Array.isArray(data?.defaults) ? data.defaults : [];
    iconState.overrides = data?.overrides && typeof data.overrides === "object" ? data.overrides : {};
    iconState.loaded = true;
    renderIconEditor();
    setMeta(`Last updated: ${new Date(data.meta?.lastLoadedAt || Date.now()).toLocaleString()}`);
    setStatus("Icon editor ready", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load icon styles", "error");
  }
}

async function fetchUnlockables() {
  const res = await fetch("/api/admin/unlockables");
  if (!res.ok) throw new Error("unlockables_fetch_failed");
  return res.json();
}

async function renderUnlockableMenus() {
  clearMain();
  const { panel, actions } = createPanel(
    "Unlockable Menus",
    "Control which unlockables appear in cosmetic and shop menus."
  );
  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Reload";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "primary";
  actions.append(reloadBtn, saveBtn);
  const content = document.createElement("div");
  panel.appendChild(content);
  main.appendChild(panel);

  let menuState = null;

  async function loadState() {
    setStatus("Loading unlockable menus…");
    const [configRes, unlockableRes] = await Promise.all([getServerConfig(), fetchUnlockables()]);
    const config = configRes.config || {};
    menuState = config.unlockableMenus || {};
    content.innerHTML = "";

    const menus = [
      { key: "trail", label: "Trails", list: unlockableRes.trails || [] },
      { key: "player_texture", label: "Player Icons", list: unlockableRes.icons || [] },
      { key: "pipe_texture", label: "Pipe Textures", list: unlockableRes.pipeTextures || [] }
    ];

    menus.forEach((menu) => {
      const section = document.createElement("div");
      section.className = "list-card";
      const header = document.createElement("div");
      header.className = "panel-header";
      const title = document.createElement("div");
      title.innerHTML = `<strong>${menu.label}</strong> <span class="badge">${menu.list.length} items</span>`;
      const controls = document.createElement("div");
      controls.className = "panel-actions";
      const modeSelect = document.createElement("select");
      ["all", "allowlist"].forEach((mode) => {
        const opt = document.createElement("option");
        opt.value = mode;
        opt.textContent = mode === "all" ? "Show all" : "Use allowlist";
        modeSelect.appendChild(opt);
      });
      const configEntry = menuState[menu.key] || { mode: "all", ids: [] };
      modeSelect.value = configEntry.mode || "all";
      controls.appendChild(modeSelect);
      header.append(title, controls);
      section.appendChild(header);

      const list = document.createElement("div");
      list.className = "form-grid two";
      const selected = new Set(configEntry.ids || []);

      menu.list.forEach((item) => {
        const card = document.createElement("label");
        card.className = "list-card";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = selected.has(item.id);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) selected.add(item.id);
          else selected.delete(item.id);
        });
        const name = document.createElement("div");
        name.innerHTML = `<strong>${item.name || item.id}</strong>`;
        const meta = document.createElement("div");
        meta.className = "muted";
        meta.textContent = item.id;
        card.append(checkbox, name, meta);
        list.appendChild(card);
      });

      modeSelect.addEventListener("change", () => {
        list.style.opacity = modeSelect.value === "allowlist" ? "1" : "0.55";
      });
      list.style.opacity = modeSelect.value === "allowlist" ? "1" : "0.55";

      section.appendChild(list);
      content.appendChild(section);

      menuState[menu.key] = { mode: modeSelect.value, ids: Array.from(selected) };

      modeSelect.addEventListener("change", () => {
        menuState[menu.key] = { mode: modeSelect.value, ids: Array.from(selected) };
      });

      list.addEventListener("change", () => {
        menuState[menu.key] = { mode: modeSelect.value, ids: Array.from(selected) };
      });
    });

    setStatus("Unlockable menus ready", "ok");
  }

  reloadBtn.addEventListener("click", () => loadState());
  saveBtn.addEventListener("click", async () => {
    setStatus("Saving unlockable menus…");
    const configRes = await getServerConfig();
    const next = { ...configRes.config, unlockableMenus: menuState };
    await saveServerConfig(next);
    setStatus("Unlockable menus saved", "ok");
  });

  await loadState();
}

async function renderDatabaseEditor() {
  clearMain();
  const { panel, actions } = createPanel("Database Editor", "Inspect and edit Mongo collections.");
  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Reload";
  actions.appendChild(reloadBtn);
  const content = document.createElement("div");
  panel.appendChild(content);
  main.appendChild(panel);

  let editor = null;
  let selectedCollection = null;
  let selectedId = null;

  async function loadCollections() {
    setStatus("Loading collections…");
    const data = await listCollections();
    const collections = data.collections || [];
    content.innerHTML = "";
    const form = document.createElement("div");
    form.className = "form-grid two";
    const collectionSelect = document.createElement("select");
    collections.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      collectionSelect.appendChild(opt);
    });
    if (collections.length) {
      selectedCollection = collections[0];
    }
    const limitInput = document.createElement("input");
    limitInput.type = "number";
    limitInput.value = "25";
    limitInput.min = "1";
    const loadBtn = document.createElement("button");
    loadBtn.textContent = "Load Documents";
    loadBtn.className = "primary";
    form.append(collectionSelect, limitInput, loadBtn);
    content.appendChild(form);

    const docSection = document.createElement("div");
    content.appendChild(docSection);

    async function loadDocs() {
      selectedCollection = collectionSelect.value;
      setStatus(`Loading ${selectedCollection}…`);
      const list = await listDocuments(selectedCollection, Number(limitInput.value || 25));
      const docs = list.documents || [];
      docSection.innerHTML = "";
      const selectorRow = document.createElement("div");
      selectorRow.className = "form-grid two";
      const docSelect = document.createElement("select");
      docs.forEach((doc) => {
        const opt = document.createElement("option");
        opt.value = doc._id;
        opt.textContent = doc.username ? `${doc._id} · ${doc.username}` : doc._id;
        docSelect.appendChild(opt);
      });
      const loadDocBtn = document.createElement("button");
      loadDocBtn.textContent = "Edit";
      loadDocBtn.className = "primary";
      selectorRow.append(docSelect, loadDocBtn);
      docSection.appendChild(selectorRow);

      const editorWrap = document.createElement("div");
      docSection.appendChild(editorWrap);

      async function openDocument(id) {
        if (!id) return;
        selectedId = id;
        const docRes = await getDocument(selectedCollection, id);
        editorWrap.innerHTML = "";
        editor = createJsonEditor({ value: docRes.document, label: "Document" });
        editorWrap.appendChild(editor.element);

        const actionRow = document.createElement("div");
        actionRow.className = "panel-actions";
        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save Document";
        saveBtn.className = "primary";
        saveBtn.addEventListener("click", async () => {
          if (!editor) return;
          setStatus("Saving document…");
          const payload = editor.getValue();
          await saveDocument(selectedCollection, selectedId, payload);
          setStatus("Document saved", "ok");
        });
        actionRow.appendChild(saveBtn);
        docSection.appendChild(actionRow);
      }

      loadDocBtn.addEventListener("click", () => openDocument(docSelect.value));
      if (docs.length) await openDocument(docs[0]._id);

      const createSection = document.createElement("div");
      createSection.className = "list-card";
      const createTitle = document.createElement("strong");
      createTitle.textContent = "Create new document";
      createSection.appendChild(createTitle);
      const createEditorWrap = document.createElement("div");
      const newEditor = createJsonEditor({ value: {}, label: "New Document" });
      createEditorWrap.appendChild(newEditor.element);
      const createBtn = document.createElement("button");
      createBtn.textContent = "Insert";
      createBtn.className = "primary";
      createBtn.addEventListener("click", async () => {
        setStatus("Creating document…");
        const payload = newEditor.getValue();
        const created = await createDocument(selectedCollection, payload);
        setStatus("Document created", "ok");
        if (created?.document?._id) {
          await loadDocs();
        }
      });
      createSection.appendChild(createEditorWrap);
      createSection.appendChild(createBtn);
      docSection.appendChild(createSection);

      setStatus(`${selectedCollection} loaded`, "ok");
    }

    loadBtn.addEventListener("click", () => loadDocs());
    if (collections.length) await loadDocs();
  }

  reloadBtn.addEventListener("click", () => loadCollections());
  await loadCollections();
}

async function renderTrailTool() {
  if (!trailState.loaded) {
    await loadTrailConfig();
    return;
  }
  renderTrailEditor();
}

async function renderIconTool() {
  if (!iconState.loaded) {
    await loadIconConfig();
    return;
  }
  renderIconEditor();
}

const tools = [
  {
    id: "achievements",
    label: "Achievements",
    description: "Achievement requirements and progress",
    render: renderAchievementEditor
  },
  {
    id: "unlockables",
    label: "Unlockables",
    description: "Set unlock conditions for cosmetics",
    render: renderUnlockableEditor
  },
  {
    id: "icons",
    label: "Icons",
    description: "Player icon styling",
    render: renderIconTool
  },
  {
    id: "trails",
    label: "Trails",
    description: "Trail particle styling",
    render: renderTrailTool
  },
  {
    id: "server-config",
    label: "Server Config",
    description: "Session, rate limits, unlockable menus",
    render: renderServerConfig
  },
  {
    id: "game-config",
    label: "Game Config",
    description: "Gameplay tuning JSON",
    render: renderGameConfig
  },
  {
    id: "unlockable-menus",
    label: "Unlockable Menus",
    description: "Show/hide unlockables per menu",
    render: renderUnlockableMenus
  },
  {
    id: "database",
    label: "Database",
    description: "Edit MongoDB documents",
    render: renderDatabaseEditor
  }
];

function buildNav() {
  nav.innerHTML = "";
  tools.forEach((tool) => {
    const btn = document.createElement("button");
    btn.className = "nav-item";
    btn.innerHTML = `${tool.label}<small>${tool.description}</small>`;
    btn.addEventListener("click", () => activateTool(tool.id));
    nav.appendChild(btn);
  });
}

async function activateTool(id) {
  const tool = tools.find((t) => t.id === id) || tools[0];
  Array.from(nav.children).forEach((node, idx) => {
    node.classList.toggle("active", tools[idx].id === tool.id);
  });
  await tool.render();
}

(async function boot() {
  try {
    buildNav();
    await activateTool(tools[0].id);
  } catch (err) {
    setStatus("Admin failed to load", "error");
    console.error(err);
  }
})();
