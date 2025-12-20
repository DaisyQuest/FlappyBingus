// =====================
// FILE: public/js/uiLayout.js
// =====================
const HOW_TO_STEPS = [
  'Move with <span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span>',
  "Use abilities to stay alive",
  "Gain points by surviving",
  "Orbs award bonus points",
  "Perfect gaps award bonus points",
  "Practice in Tutorial"
];

function createElement(doc, refs, tag, options = {}, children = []) {
  const {
    id,
    ref,
    className,
    text,
    html,
    attrs = {},
    dataset = {},
    props = {}
  } = options;

  const el = doc.createElement(tag);
  if (id) el.id = id;
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  if (html !== undefined) el.innerHTML = html;

  for (const [key, val] of Object.entries(attrs)) {
    if (val === false || val === null || val === undefined) continue;
    el.setAttribute(key, val === true ? "" : val);
  }
  for (const [key, val] of Object.entries(dataset)) {
    el.dataset[key] = val;
  }
  for (const [key, val] of Object.entries(props)) {
    el[key] = val;
  }
  for (const child of children) {
    el.append(child);
  }

  const refKey = ref || id;
  if (refKey) refs[refKey] = el;
  return el;
}

function createHowToCard(doc) {
  const card = doc.createElement("div");
  card.className = "info-card howto-card";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "How to play";

  const wrapper = doc.createElement("div");
  wrapper.className = "howto";

  const list = doc.createElement("ul");
  list.className = "howto-list";
  HOW_TO_STEPS.forEach(step => {
    const li = doc.createElement("li");
    li.innerHTML = step;
    list.append(li);
  });

  wrapper.append(list);
  card.append(title, wrapper);
  return card;
}

function createTrailCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "Ready to fly";

  const actions = doc.createElement("div");
  actions.className = "row top-actions";
  const startBtn = createElement(doc, refs, "button", {
    id: "start",
    className: "primary cta-btn wide sparkle",
    text: "Start",
    props: { disabled: true }
  });
  const tutorialBtn = createElement(doc, refs, "button", {
    id: "tutorial",
    className: "cta-btn wide",
    text: "Tutorial",
    props: { disabled: true }
  });
  actions.append(startBtn, tutorialBtn);

  const divider = doc.createElement("div");
  divider.className = "soft-divider";

  const trailField = doc.createElement("div");
  trailField.className = "field";

  const trailTitle = doc.createElement("div");
  trailTitle.className = "section-title small";
  trailTitle.textContent = "Cosmetic Trail";

  const trailRow = doc.createElement("div");
  trailRow.className = "minirow trail-row";
  const trailShell = doc.createElement("div");
  trailShell.className = "trail-preview-shell";
  const selectWrap = doc.createElement("div");
  selectWrap.className = "trail-select-wrap selectwrap";
  const select = createElement(doc, refs, "select", {
    id: "trailSelect",
    attrs: { "aria-label": "Select a trail" }
  });
  selectWrap.append(select);

  const selectPanel = doc.createElement("div");
  selectPanel.className = "trail-select-panel";
  selectPanel.append(selectWrap);

  trailShell.append(selectPanel);
  trailRow.append(trailShell);

  const trailHint = createElement(doc, refs, "div", {
    id: "trailHint",
    className: "hint",
    text: "Unlock trails by improving your personal best."
  });

  trailField.append(trailTitle, trailRow, trailHint);
  card.append(title, actions, divider, trailField);
  return card;
}

function createTrailPreviewOverlay(doc, refs) {
  const overlay = doc.createElement("div");
  overlay.className = "trail-preview-overlay";

  const trailGlow = doc.createElement("div");
  trailGlow.className = "trail-preview-glow";

  const trailCanvas = createElement(doc, refs, "canvas", {
    id: "trailPreviewCanvas",
    className: "trail-preview-canvas"
  });

  overlay.append(trailGlow, trailCanvas);
  return overlay;
}

function createStatusCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "Status";

  const row = doc.createElement("div");
  row.className = "minirow";
  const pill = createElement(doc, refs, "div", { id: "bootPill", className: "pill" });
  const dot = doc.createElement("span");
  dot.className = "dot";
  const bootText = createElement(doc, refs, "span", { id: "bootText", text: "Loading…" });
  pill.append(dot, bootText);
  row.append(pill);

  card.append(title, row);
  return card;
}

function createSeedCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "Level Seed";

  const field = doc.createElement("div");
  field.className = "field";

  const label = doc.createElement("div");
  label.className = "lbl";
  label.textContent = "Seed (optional)";

  const row = doc.createElement("div");
  row.className = "minirow";
  const input = createElement(doc, refs, "input", {
    id: "seedInput",
    attrs: { type: "text", maxlength: "48", placeholder: "Leave blank for random (share seed to play same level)" }
  });
  const randomBtn = createElement(doc, refs, "button", { id: "seedRandomBtn", text: "Random" });
  row.append(input, randomBtn);

  const hint = createElement(doc, refs, "div", {
    id: "seedHint",
    className: "hint",
    text: "If two players use the same seed, pipe/orb spawns will match."
  });

  field.append(label, row, hint);
  card.append(title, field);
  return card;
}

function createVolumeCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "Volume";

  const grid = doc.createElement("div");
  grid.className = "volume-grid";

  const musicRow = doc.createElement("div");
  musicRow.className = "slider-row";
  musicRow.append(
    (() => {
      const lbl = doc.createElement("div");
      lbl.className = "lbl";
      lbl.textContent = "Music Volume";
      return lbl;
    })(),
    createElement(doc, refs, "input", {
      id: "musicVolume",
      attrs: { type: "range", min: "0", max: "100", "aria-label": "Music volume" },
      props: { value: 70 }
    })
  );

  const sfxRow = doc.createElement("div");
  sfxRow.className = "slider-row";
  sfxRow.append(
    (() => {
      const lbl = doc.createElement("div");
      lbl.className = "lbl";
      lbl.textContent = "SFX Volume";
      return lbl;
    })(),
    createElement(doc, refs, "input", {
      id: "sfxVolume",
      attrs: { type: "range", min: "0", max: "100", "aria-label": "SFX volume" },
      props: { value: 80 }
    })
  );

  grid.append(musicRow, sfxRow);

  const muteRow = doc.createElement("div");
  muteRow.className = "mute-row";
  const muteCheckbox = createElement(doc, refs, "input", {
    id: "muteToggle",
    attrs: { type: "checkbox", "aria-label": "Mute audio" }
  });
  const muteLabel = doc.createElement("label");
  muteLabel.setAttribute("for", "muteToggle");
  muteLabel.textContent = "Mute everything";
  muteRow.append(muteCheckbox, muteLabel);

  const note = doc.createElement("div");
  note.className = "muted-note";
  note.textContent = "Adjust music and sound effects independently, or mute everything.";

  card.append(title, grid, muteRow, note);
  return card;
}

function createBindCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "info-card";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "Skill Keybinds";

  const wrap = createElement(doc, refs, "div", { id: "bindWrap", className: "bindList" });
  const hint = createElement(doc, refs, "div", {
    id: "bindHint",
    className: "hint",
    text: "Click Rebind, then press a key or click a mouse button. Press Esc to cancel."
  });

  card.append(title, wrap, hint);
  return card;
}

function createProfileCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "card card-soft";

  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "Your Profile";

  const field = doc.createElement("div");
  field.className = "field";
  const label = doc.createElement("div");
  label.className = "lbl";
  label.textContent = "Username";

  const row = doc.createElement("div");
  row.className = "minirow user-row";
  const input = createElement(doc, refs, "input", {
    id: "usernameInput",
    attrs: { type: "text", maxlength: "18", placeholder: "3–18 chars: letters, numbers, space, _ or -" }
  });
  const btn = createElement(doc, refs, "button", { id: "saveUserBtn", text: "Save" });
  row.append(input, btn);

  const userHint = createElement(doc, refs, "div", { id: "userHint", className: "hint", text: "Not signed in." });

  const pills = doc.createElement("div");
  pills.className = "pills-row tight";
  const pbBadge = doc.createElement("div");
  pbBadge.className = "badge";
  pbBadge.textContent = "Personal best ";
  const pbText = createElement(doc, refs, "span", { id: "pbText", className: "kbd", text: "0" });
  pbBadge.append(pbText);

  const trailBadge = doc.createElement("div");
  trailBadge.className = "badge";
  trailBadge.textContent = "Trail ";
  const trailText = createElement(doc, refs, "span", { id: "trailText", className: "kbd", text: "classic" });
  trailBadge.append(trailText);

  pills.append(pbBadge, trailBadge);

  field.append(label, row, userHint, pills);
  card.append(title, field);
  return card;
}

function createHighscoreCard(doc, refs) {
  const card = doc.createElement("div");
  card.className = "card hs-card";

  const heading = doc.createElement("div");
  heading.className = "row space-between";
  const title = doc.createElement("div");
  title.className = "section-title";
  title.textContent = "High Scores";
  const link = doc.createElement("a");
  link.className = "accent-link";
  link.href = "/highscores";
  link.textContent = "Full list";
  heading.append(title, link);

  const spacer = doc.createElement("div");
  spacer.className = "spacer-sm";

  const hsWrap = createElement(doc, refs, "div", { id: "hsWrap", className: "hint", text: "Loading leaderboard…" });

  card.append(heading, spacer, hsWrap);
  return card;
}

function createMenuScreen(doc, refs) {
  const screen = createElement(doc, refs, "div", { id: "menu", className: "screen" });
  const trailOverlay = createTrailPreviewOverlay(doc, refs);
  const panel = doc.createElement("div");
  panel.className = "panel";
  const aurora = doc.createElement("div");
  aurora.className = "light-aurora";
  const content = doc.createElement("div");
  content.className = "content-layer";

  const header = doc.createElement("div");
  header.className = "menu-header";
  const cloud = doc.createElement("div");
  cloud.className = "title-cloud";
  const title = doc.createElement("div");
  title.className = "title";
  title.textContent = "Flappy Bingus";
  cloud.append(title);

  const subtitle = doc.createElement("p");
  subtitle.className = "sub menu-subtitle";
  subtitle.textContent = "Thank you for playing!";

  header.append(cloud, subtitle);

  const viewMain = createElement(doc, refs, "input", {
    id: "viewMain",
    className: "tab-radio",
    attrs: { type: "radio", name: "view", checked: true }
  });
  const viewSettings = createElement(doc, refs, "input", {
    id: "viewSettings",
    className: "tab-radio",
    attrs: { type: "radio", name: "view" }
  });

  const shell = doc.createElement("div");
  shell.className = "menu-shell";

  const mainCard = doc.createElement("div");
  mainCard.className = "card card-soft";
  const viewArea = doc.createElement("div");
  viewArea.className = "view-area";

  const mainPanel = doc.createElement("div");
  mainPanel.className = "panel-main tab-panel";
  const mainGrid = doc.createElement("div");
  mainGrid.className = "info-grid";
  mainGrid.append(createTrailCard(doc, refs), createHowToCard(doc));
  const toSettings = doc.createElement("div");
  toSettings.className = "tab-toggle";
  const settingsLabel = doc.createElement("label");
  settingsLabel.setAttribute("for", "viewSettings");
  settingsLabel.className = "tab-pill";
  settingsLabel.textContent = "Settings";
  toSettings.append(settingsLabel);
  mainPanel.append(mainGrid, toSettings);

  const settingsPanel = doc.createElement("div");
  settingsPanel.className = "panel-settings tab-panel";
  const toMain = doc.createElement("div");
  toMain.className = "tab-toggle";
  const mainLabel = doc.createElement("label");
  mainLabel.setAttribute("for", "viewMain");
  mainLabel.className = "tab-pill";
  mainLabel.textContent = "← Back to Main";
  toMain.append(mainLabel);
  const settingsGrid = doc.createElement("div");
  settingsGrid.className = "info-grid";
  settingsGrid.append(
    createStatusCard(doc, refs),
    createSeedCard(doc, refs),
    createVolumeCard(doc, refs),
    createBindCard(doc, refs)
  );
  settingsPanel.append(toMain, settingsGrid);

  viewArea.append(mainPanel, settingsPanel);
  mainCard.append(viewArea);

  const sideStack = doc.createElement("div");
  sideStack.className = "side-stack";
  sideStack.append(createProfileCard(doc, refs), createHighscoreCard(doc, refs));

  shell.append(mainCard, sideStack);
  content.append(header, viewMain, viewSettings, shell);
  panel.append(aurora, content);
  screen.append(trailOverlay, panel);
  return screen;
}

function createOverScreen(doc, refs) {
  const screen = createElement(doc, refs, "div", { id: "over", className: "screen hidden" });
  const panel = doc.createElement("div");
  panel.className = "panel";

  const title = doc.createElement("div");
  title.className = "title danger";
  title.textContent = "GAME OVER";

  const subtitle = doc.createElement("p");
  subtitle.className = "sub over-subtitle";
  subtitle.textContent = "One collision = instant death. Gameplay is frozen.";

  const stats = doc.createElement("div");
  stats.className = "stats";
  const final = createElement(doc, refs, "span", { id: "final", className: "kbd", text: "0" });
  const best = createElement(doc, refs, "span", { id: "overPB", className: "kbd", text: "0" });
  stats.innerHTML = "Final score: ";
  stats.append(final, doc.createElement("br"));
  stats.append("Personal best: ", best);

  const actions = doc.createElement("div");
  actions.className = "row actions-row";
  actions.append(
    createElement(doc, refs, "button", { id: "restart", text: "Restart (new seed)" }),
    createElement(doc, refs, "button", { id: "retrySeed", text: "Retry Previous Seed" }),
    createElement(doc, refs, "button", { id: "toMenu", text: "Main Menu" }),
    createElement(doc, refs, "button", { id: "watchReplay", text: "Watch Replay" }),
    createElement(doc, refs, "button", { id: "exportGif", text: "Export GIF", props: { disabled: true } }),
    createElement(doc, refs, "button", { id: "exportMp4", text: "Export MP4", props: { disabled: true } })
  );

  const replayStatus = createElement(doc, refs, "div", {
    id: "replayStatus",
    className: "hint space-top replay-hint",
    text: "Replay will be available after a run."
  });

  const shortcuts = doc.createElement("div");
  shortcuts.className = "stats";
  shortcuts.innerHTML = 'Shortcuts: <span class="kbd">R</span> restart, <span class="kbd">Esc</span> menu.';

  panel.append(title, subtitle, stats, actions, replayStatus);
  screen.append(panel, shortcuts);
  return screen;
}

export function buildGameUI({ document = window.document, mount } = {}) {
  const doc = document || window.document;
  const target = mount || doc.getElementById("app") || doc.body;
  const refs = {};

  // Refresh host container to avoid duplicate shells when rerunning in tests.
  if (target === doc.body) {
    const existing = target.querySelector("#wrap");
    if (existing) existing.remove();
  } else {
    target.innerHTML = "";
  }

  const wrap = createElement(doc, refs, "div", { id: "wrap" });
  const canvas = createElement(doc, refs, "canvas", { id: "c" });

  wrap.append(canvas, createMenuScreen(doc, refs), createOverScreen(doc, refs));
  target.append(wrap);

  return {
    ...refs,
    root: wrap,
    menu: refs.menu || wrap.querySelector("#menu"),
    over: refs.over || wrap.querySelector("#over"),
    canvas
  };
}

export const __testables = {
  createMenuScreen,
  createOverScreen
};
