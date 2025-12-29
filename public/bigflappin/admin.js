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

const statusChip = document.getElementById("adminStatus");
const statusText = document.getElementById("adminStatusText");
const nav = document.getElementById("adminNav");
const main = document.getElementById("adminMain");
const metaText = document.getElementById("adminMeta");

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

const tools = [
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
