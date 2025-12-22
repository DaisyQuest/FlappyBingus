// =====================
// FILE: public/js/main.js
// =====================
import { loadConfig } from "./config.js";
import { DEFAULT_SKILL_SETTINGS, normalizeSkillSettings, skillSettingsEqual } from "./settings.js";
import {
  apiGetMe,
  apiRegister,
  apiGetHighscores,
  apiSetTrail,
  apiSetIcon,
  apiSubmitScore,
  apiSetKeybinds,
  apiSetSettings
} from "./api.js";

import {
  escapeHtml, clamp, getCookie, setCookie,
  setRandSource, createSeededRand, createTapeRandRecorder, createTapeRandPlayer
} from "./util.js";

import { Game } from "./game.js";
import { GameDriver } from "/engine/gameDriver.js";

// Tutorial
import { Tutorial } from "./tutorial.js";

import {
  ACTIONS,
  DEFAULT_KEYBINDS,
  loadGuestBinds,
  saveGuestBinds,
  mergeBinds,
  humanizeBind,
  applyRebindWithSwap,
  keyEventToBind,
  pointerEventToBind
} from "./keybinds.js";

import { Input } from "./input.js";

// NEW: Audio (you must add public/js/audio.js from my prior message)
import {
  audioInit,
  musicStartLoop,
  musicStop,
  setMusicVolume,
  setSfxVolume,
  setMuted,
  sfxAchievementUnlock
} from "./audio.js";
import { applyBustercoinEarnings } from "./bustercoins.js";
import { ACHIEVEMENTS, normalizeAchievementState, renderAchievementsList, appendAchievementToast } from "./achievements.js";
import { renderScoreBreakdown } from "./scoreBreakdown.js";
import {
  DEFAULT_PLAYER_ICON_ID,
  DEFAULT_PLAYER_ICONS,
  describeIconLock,
  getUnlockedPlayerIcons,
  normalizeIconSelection,
  normalizePlayerIcons
} from "./playerIcons.js";
import { createPlayerIconSprite } from "./playerIconSprites.js";
import { classifyIconSaveResponse } from "./iconSave.js";

import { buildGameUI } from "./uiLayout.js";
import { TrailPreview } from "./trailPreview.js";
import { normalizeTrailSelection, rebuildTrailOptions } from "./trailSelectUtils.js";
import { buildTrailHint } from "./trailHint.js";
import { DEFAULT_TRAILS, getUnlockedTrails, normalizeTrails, sortTrailsForDisplay } from "./trailProgression.js";
import { renderHighscores } from "./highscores.js";

// ---- DOM ----
const ui = buildGameUI();

const {
  canvas,
  menu,
  over,
  start: startBtn,
  tutorial: tutorialBtn,
  restart: restartBtn,
  retrySeed: retrySeedBtn,
  toMenu: toMenuBtn,
  bootPill,
  bootText,
  usernameInput,
  saveUserBtn,
  userHint,
  trailSelect,
  trailHint,
  trailPreviewCanvas,
  iconOptions,
  iconHint,
  bindWrap,
  bindHint,
  dashBehaviorSelect,
  slowFieldBehaviorSelect,
  hsWrap,
  pbText,
  trailText,
  iconText,
  bustercoinText,
  final: finalEl,
  overPB,
  scoreBreakdown,
  seedInput,
  seedRandomBtn,
  seedHint,
  viewAchievements,
  musicVolume: musicSlider,
  sfxVolume: sfxSlider,
  muteToggle,
  watchReplay: watchReplayBtn,
  exportGif: exportGifBtn,
  exportMp4: exportMp4Btn,
  replayStatus,
  achievementsList,
  achievementsHideCompleted,
  achievementToasts
} = ui;

// ---- Local best fallback cookie (legacy support) ----
const LOCAL_BEST_COOKIE = "chocolate_chip";
function readLocalBest() {
  const raw = getCookie(LOCAL_BEST_COOKIE);
  const n = Number.parseInt(raw, 10);
  return (Number.isFinite(n) && n >= 0) ? Math.min(n, 1e9) : 0;
}
function writeLocalBest(v) {
  setCookie(LOCAL_BEST_COOKIE, String(Math.max(0, Math.min(1e9, v | 0))), 3650);
}

// ---- Seed cookie ----
const SEED_COOKIE = "sesame_seed";
function readSeed() {
  const raw = getCookie(SEED_COOKIE);
  try { return raw ? decodeURIComponent(raw) : ""; } catch { return raw || ""; }
}
function writeSeed(s) {
  setCookie(SEED_COOKIE, String(s ?? ""), 3650);
}
function genRandomSeed() {
  const u = new Uint32Array(2);
  crypto.getRandomValues(u);
  return `${u[0].toString(16)}-${u[1].toString(16)}`;
}

const SETTINGS_COOKIE = "bingus_settings";
function readSettingsCookie() {
  const raw = getCookie(SETTINGS_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return normalizeSkillSettings(parsed);
  } catch {
    return null;
  }
}
function writeSettingsCookie(settings) {
  try {
    setCookie(SETTINGS_COOKIE, JSON.stringify(normalizeSkillSettings(settings || {})), 3650);
  } catch {
    // ignore cookie errors
  }
}

const ICON_COOKIE = "bingus_icon";
function readIconCookie() {
  const raw = getCookie(ICON_COOKIE);
  return raw && typeof raw === "string" ? raw : null;
}
function writeIconCookie(id) {
  if (!id) return;
  setCookie(ICON_COOKIE, String(id), 3650);
}

function setUIMode(isUI) {
  // When UI is shown, let clicks go to HTML controls
  canvas.style.pointerEvents = isUI ? "none" : "auto";
}

// ---- Boot + runtime state ----
const boot = { imgReady: false, imgOk: false, cfgReady: false, cfgOk: false, cfgSrc: "defaults" };

const net = {
  online: true,
  user: null,
  trails: DEFAULT_TRAILS.map((t) => ({ ...t })),
  icons: DEFAULT_PLAYER_ICONS.map((i) => ({ ...i })),
  highscores: [],
  achievements: { definitions: ACHIEVEMENTS, state: normalizeAchievementState() }
};

// keybinds: start from guest cookie; override from server user when available
let binds = loadGuestBinds();
let skillSettings = readSettingsCookie() || normalizeSkillSettings(DEFAULT_SKILL_SETTINGS);

// config + assets
let CFG = null;
let trailPreview = null;
let currentTrailId = "classic";
let playerIcons = normalizePlayerIcons(DEFAULT_PLAYER_ICONS);
let currentIconId = normalizeIconSelection({
  currentId: readIconCookie(),
  unlockedIds: playerIcons.map((i) => i.id),
  fallbackId: DEFAULT_PLAYER_ICON_ID
});

// assets
let playerImg = createPlayerIconSprite(playerIcons.find((i) => i.id === currentIconId));
boot.imgReady = true; boot.imgOk = true;
refreshBootUI();

trailPreview = trailPreviewCanvas ? new TrailPreview({ canvas: trailPreviewCanvas, playerImg }) : null;

// ---- Input + Game ----
const ctx = canvas.getContext("2d", { alpha: false });

// Deterministic sim clock
const SIM_DT = 1 / 120;
const MAX_FRAME = 1 / 20;
let acc = 0;
let lastTs = 0;

// Replay / run capture
// activeRun = { seed, ticks: [ { move, cursor, actions[] } ], pendingActions:[], ended:boolean, rngTape:[] }
let activeRun = null;

// Tutorial manager (initialized after Game is created, but referenced by the Input callback).
let tutorial = null;


// Seed of the most recently finished run (used for "Retry Previous Seed")
let lastEndedSeed = "";

// When true: main RAF loop does NOT advance the sim (replay drives it)
let replayDriving = false;

// Audio assets (served from /public/audio/*)
const AUDIO = Object.freeze({
  musicUrl: "/audio/music.mp3",
  boopUrl: "/audio/orb-boop.mp3",
  niceUrl: "/audio/nice.mp3",
  bounceUrl: "/audio/dash-bounce.mp3",
  shatterUrl: "/audio/dash-destroy.mp3",
  slowFieldUrl: "/audio/slow-field.mp3",
  slowExplosionUrl: "/audio/slow-explosion.mp3",
  dashStartUrl: "/audio/dash-start.mp3",
  dashBreakUrl: "/audio/dash-break.mp3",
  teleportUrl: "/audio/teleport.mp3",
  phaseUrl: "/audio/phase.mp3",
  explosionUrl: "/audio/explosion.mp3",
  gameOverUrl: "/audio/game-over.mp3"
});

// Volume UI defaults (match HTML defaults in flappybingus.html)
const DEFAULT_MUSIC = 0.7;
const DEFAULT_SFX = 0.8;

function sliderValueTo01(el, fallback01) {
  const raw = el ? Number.parseFloat(el.value) : Number.NaN;
  const pct = Number.isFinite(raw) ? raw : (fallback01 ?? 0) * 100;
  return clamp(pct / 100, 0, 1);
}

function applyVolumeFromUI() {
  const music = sliderValueTo01(musicSlider, DEFAULT_MUSIC);
  const sfx = sliderValueTo01(sfxSlider, DEFAULT_SFX);

  setMusicVolume(music);
  setSfxVolume(sfx);

  const isMuted = !!(muteToggle && muteToggle.checked);
  setMuted(isMuted);

  if (game) {
    const sfxAudible = !isMuted && sfx > 0;
    game.setAudioEnabled(sfxAudible);
  }
}

function primeVolumeUI() {
  if (musicSlider && !musicSlider.value) musicSlider.value = String(Math.round(DEFAULT_MUSIC * 100));
  if (sfxSlider && !sfxSlider.value) sfxSlider.value = String(Math.round(DEFAULT_SFX * 100));
  if (muteToggle) muteToggle.checked = false;
  applyVolumeFromUI();
}

const volumeChangeHandler = () => applyVolumeFromUI();
musicSlider?.addEventListener("input", volumeChangeHandler);
sfxSlider?.addEventListener("input", volumeChangeHandler);
muteToggle?.addEventListener("change", volumeChangeHandler);
applySkillSettingsToUI(skillSettings);

// IMPORTANT: actions are NOT applied immediately.
// They are enqueued and applied at the next simulation tick boundary.
// This makes live run and replay have identical action timing.
const input = new Input(canvas, () => binds, (actionId) => {
  // IMPORTANT: actions are queued and applied on the next fixed tick.
  // Tutorial runs without a replay recorder, so it keeps its own queue.
  if (tutorial?.active && game.state === 1 /* PLAY */) {
    tutorial.enqueueAction({
      id: actionId,
      cursor: { x: input.cursor.x, y: input.cursor.y, has: input.cursor.has }
    });
    return;
  }
  if (activeRun && game.state === 1 /* PLAY */) {
    activeRun.pendingActions.push({
      id: actionId,
      cursor: { x: input.cursor.x, y: input.cursor.y, has: input.cursor.has }
    });
  }
  // DO NOT call game.handleAction(actionId) here.
});
input.install();

let game = new Game({
  canvas,
  ctx,
  config: null,
  playerImg,
  input,
  getTrailId: () => {
    if (net.user?.selectedTrail) return net.user.selectedTrail;
    return currentTrailId || trailSelect.value || "classic";
  },
  getBinds: () => binds,
  onGameOver: (score) => onGameOver(score)
});
game.setSkillSettings(skillSettings);

let driver = new GameDriver({
  game,
  syncRandSource: setRandSource,
  captureSnapshots: false,
  mapState(engineState, g) {
    engineState.time = g.timeAlive ?? engineState.time;
    engineState.tick = (engineState.tick ?? 0) + 1;
    engineState.score = { ...(engineState.score || {}), total: g.score ?? 0 };
    engineState.player = { ...(engineState.player || {}), x: g.player?.x, y: g.player?.y, vx: g.player?.vx, vy: g.player?.vy };
  }
});

// Tutorial wires into the same game instance.
tutorial = new Tutorial({
  game,
  input,
  getBinds: () => binds,
  onExit: () => toMenu()
});

window.addEventListener("resize", () => {
  game.resizeToWindow();
  trailPreview?.resize();
});
// On some browsers, zoom changes fire visualViewport resize without window resize.
window.visualViewport?.addEventListener("resize", () => {
  game.resizeToWindow();
  trailPreview?.resize();
});

// ---- Boot UI ----
function refreshBootUI() {
  startBtn.disabled = !(boot.imgReady && boot.cfgReady);
  if (tutorialBtn) tutorialBtn.disabled = startBtn.disabled;

  bootPill.classList.remove("ok", "bad", "neutral");
  const ready = boot.imgReady && boot.cfgReady;
  if (!ready) {
    bootPill.classList.add("neutral");
    bootText.textContent = "Loading…";
    return;
  }
  bootPill.classList.add("ok");
  const a = boot.imgOk ? "player ok" : "player fallback";
  const b = boot.cfgOk ? boot.cfgSrc : "defaults";
  const c = net.online ? (net.user ? `user: ${net.user.username}` : "guest") : "offline";
  bootText.textContent = `${a} • ${b} • ${c}`;
}

// ---- Menu rendering (highscores, cosmetics, binds) ----
function setUserHint() {
  if (!net.online) {
    userHint.className = "hint bad";
    userHint.textContent = "Server unreachable. Guest mode enabled (no global highscores).";
    return;
  }
  if (!net.user) {
    userHint.className = "hint";
    userHint.textContent = "Enter a username to save progression and appear on the leaderboard.";
    return;
  }
  userHint.className = "hint good";
  const coins = net.user?.bustercoins ?? 0;
  userHint.textContent = `Signed in as ${net.user.username}. Runs: ${net.user.runs} • Total: ${net.user.totalScore} • Bustercoins: ${coins}`;
}

function getIconDisplayName(id, icons = playerIcons) {
  return icons.find((i) => i.id === id)?.name || id || DEFAULT_PLAYER_ICON_ID;
}

function syncIconCatalog(nextIcons = null) {
  const normalized = normalizePlayerIcons(nextIcons || playerIcons);
  playerIcons = normalized;
  net.icons = normalized.map((i) => ({ ...i }));
}

function computeUnlockedIconSet(icons = playerIcons) {
  const best = net.user ? (net.user.bestScore | 0) : readLocalBest();
  const achievements = net.user?.achievements || net.achievements?.state;
  const owned = net.user?.ownedIcons || [];
  const isRecordHolder = Boolean(net.user?.isRecordHolder);
  return new Set(
    getUnlockedPlayerIcons(icons, {
      bestScore: best,
      ownedIconIds: owned,
      achievements,
      recordHolder: isRecordHolder
    })
  );
}

function renderIconOptions(selectedId = currentIconId, unlocked = computeUnlockedIconSet(playerIcons), icons = playerIcons) {
  if (!iconOptions) return;
  const doc = iconOptions.ownerDocument || document;
  iconOptions.innerHTML = "";
  const unlockedSet = unlocked instanceof Set ? unlocked : new Set(unlocked || []);

  if (!icons.length) {
    if (iconHint) {
      iconHint.className = "hint bad";
      iconHint.textContent = "No icons available.";
    }
    return;
  }

  icons.forEach((icon) => {
    const unlockedIcon = unlockedSet.has(icon.id);
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.dataset.iconId = icon.id;
    btn.className = "icon-option" + (icon.id === selectedId ? " selected" : "") + (unlockedIcon ? "" : " locked");
    btn.disabled = !unlockedIcon;
    btn.setAttribute("aria-pressed", icon.id === selectedId ? "true" : "false");

    const swatch = doc.createElement("span");
    swatch.className = "icon-swatch";
    swatch.style.setProperty("--icon-fill", icon.style?.fill || "#ff8c1a");
    swatch.style.setProperty("--icon-core", icon.style?.core || icon.style?.fill || "#ffc285");
    swatch.style.setProperty("--icon-rim", icon.style?.rim || "#0f172a");
    swatch.style.setProperty("--icon-glow", icon.style?.glow || "rgba(255,200,120,.5)");

    const meta = doc.createElement("span");
    meta.className = "icon-meta";
    const name = doc.createElement("span");
    name.className = "icon-name";
    name.textContent = icon.name;
    const status = doc.createElement("span");
    status.className = "icon-status";
    status.textContent = icon.id === selectedId && unlockedIcon
      ? "Equipped"
      : describeIconLock(icon, { unlocked: unlockedIcon });
    meta.append(name, status);

    btn.append(swatch, meta);
    iconOptions.append(btn);
  });

  if (iconHint) {
    iconHint.className = "hint";
    iconHint.textContent = "Pick a high-contrast icon. More unlocks coming soon.";
  }
}

function applyIconSelection(id = currentIconId, icons = playerIcons, unlocked = computeUnlockedIconSet(icons)) {
  const nextId = normalizeIconSelection({
    currentId: id || currentIconId || DEFAULT_PLAYER_ICON_ID,
    userSelectedId: net.user?.selectedIcon,
    unlockedIds: unlocked,
    fallbackId: DEFAULT_PLAYER_ICON_ID
  });
  currentIconId = nextId;
  if (iconText) iconText.textContent = getIconDisplayName(nextId, icons);
  renderIconOptions(nextId, unlocked, icons);

  playerImg = createPlayerIconSprite(icons.find((i) => i.id === nextId) || icons[0]);
  game.setPlayerImage(playerImg);
  trailPreview?.setPlayerImage(playerImg);
  writeIconCookie(nextId);
  return nextId;
}

function getTrailDisplayName(id, trails = net.trails) {
  return trails.find(t => t.id === id)?.name || id;
}

function applyTrailSelection(id, trails = net.trails) {
  const safeId = id || "classic";
  currentTrailId = safeId;
  if (trailText) {
    trailText.textContent = getTrailDisplayName(safeId, trails);
  }
  if (trailSelect && trailSelect.value !== safeId) {
    trailSelect.value = safeId;
  }
  trailPreview?.setTrail(safeId);
}

function resumeTrailPreview(selectedId = trailSelect?.value || "classic") {
  applyTrailSelection(selectedId || currentTrailId || "classic");
  trailPreview?.start();
}

function pauseTrailPreview() {
  trailPreview?.stop();
}

function fillTrailSelect() {
  const best = (net.user ? (net.user.bestScore | 0) : readLocalBest());
  const isRecordHolder = Boolean(net.user?.isRecordHolder);
  const orderedTrails = sortTrailsForDisplay(net.trails, { isRecordHolder });
  const unlocked = new Set(getUnlockedTrails(orderedTrails, best, { isRecordHolder }));
  const selected = normalizeTrailSelection({
    currentId: currentTrailId,
    userSelectedId: net.user?.selectedTrail,
    selectValue: trailSelect?.value,
    unlockedIds: unlocked,
    fallbackId: "classic"
  });

  const applied = rebuildTrailOptions(trailSelect, orderedTrails, unlocked, selected);
  applyTrailSelection(applied, orderedTrails);
  pbText.textContent = String(best);
  if (bustercoinText) bustercoinText.textContent = String(net.user?.bustercoins ?? 0);

  const hint = buildTrailHint({
    online: net.online,
    user: net.user,
    bestScore: best,
    trails: orderedTrails
  });
  if (trailHint) {
    trailHint.className = hint.className;
    trailHint.textContent = hint.text;
  }
}

function renderAchievements(payload = null) {
  if (!achievementsList) return;
  const state = payload?.state || net.achievements?.state || net.user?.achievements;
  const definitions = payload?.definitions || net.achievements?.definitions || ACHIEVEMENTS;
  renderAchievementsList(achievementsList, {
    state: normalizeAchievementState(state),
    definitions,
    hideCompleted: achievementsHideCompleted?.checked
  });
}

function applyAchievementsPayload(payload) {
  if (!payload) return;
  const definitions = payload.definitions?.length ? payload.definitions : (net.achievements?.definitions || ACHIEVEMENTS);
  const state = normalizeAchievementState(payload.state || payload);
  net.achievements = { definitions, state };
  if (net.user) net.user.achievements = state;
  renderAchievements({ definitions, state });
  notifyAchievements(payload.unlocked);
}

function notifyAchievements(unlockedIds = []) {
  if (!unlockedIds?.length) return;
  const definitions = net.achievements?.definitions || ACHIEVEMENTS;
  unlockedIds.forEach((id) => {
    const def = definitions.find((d) => d.id === id);
    if (!def) return;
    appendAchievementToast(game, def);
    sfxAchievementUnlock();
  });
}

achievementsHideCompleted?.addEventListener("change", () => {
  renderAchievements();
});

function renderBindUI(listeningActionId = null) {
  bindWrap.innerHTML = "";
  for (const a of ACTIONS) {
    const row = document.createElement("div");
    row.className = "bindRow" + (listeningActionId === a.id ? " listen" : "");
    row.dataset.action = a.id;

    const name = document.createElement("div");
    name.className = "bindName";
    name.textContent = a.label;

    const key = document.createElement("div");
    key.className = "bindKey kbd";
    key.textContent = humanizeBind(binds[a.id]);

    const btn = document.createElement("button");
    btn.className = "bindBtn";
    btn.textContent = (listeningActionId === a.id) ? "Listening…" : "Rebind";
    btn.disabled = (listeningActionId !== null);
    btn.dataset.action = a.id;

    row.appendChild(name);
    row.appendChild(key);
    row.appendChild(btn);
    bindWrap.appendChild(row);
  }
}

function applySkillSettingsToUI(settings = skillSettings) {
  const normalized = normalizeSkillSettings(settings || DEFAULT_SKILL_SETTINGS);
  if (dashBehaviorSelect) dashBehaviorSelect.value = normalized.dashBehavior;
  if (slowFieldBehaviorSelect) slowFieldBehaviorSelect.value = normalized.slowFieldBehavior;
}

async function updateSkillSettings(next, { persist = true } = {}) {
  const normalized = normalizeSkillSettings(next || DEFAULT_SKILL_SETTINGS);
  const changed = !skillSettingsEqual(skillSettings, normalized);
  skillSettings = normalized;
  game.setSkillSettings(skillSettings);
  applySkillSettingsToUI(skillSettings);
  writeSettingsCookie(skillSettings);

  if (persist && net.user && changed) {
    const res = await apiSetSettings(skillSettings);
    if (res?.user) {
      net.user = res.user;
      setUserHint();
    }
  }
}

// ---- Server refresh ----
async function refreshProfileAndHighscores() {
  const me = await apiGetMe();
  if (!me?.ok) {
    net.online = false;
    net.user = null;
    syncIconCatalog(net.icons || playerIcons);
    net.achievements = { definitions: ACHIEVEMENTS, state: normalizeAchievementState() };
  } else {
    net.online = true;
    net.user = me.user || null;
    net.trails = normalizeTrails(me.trails || net.trails);
    syncIconCatalog(me.icons || net.icons);
    applyAchievementsPayload(me.achievements || { definitions: ACHIEVEMENTS, state: me.user?.achievements });
    if (net.user?.keybinds) binds = mergeBinds(DEFAULT_KEYBINDS, net.user.keybinds);
    if (net.user?.settings) await updateSkillSettings(net.user.settings, { persist: false });
  }

  const hs = await apiGetHighscores(20);
  if (!hs?.ok) {
    net.online = false;
    net.highscores = [];
  } else {
    net.online = true;
    net.highscores = hs.highscores || [];
  }

  setUserHint();
  fillTrailSelect();
  applyIconSelection(net.user?.selectedIcon || currentIconId, playerIcons);
  renderHighscores({
    container: hsWrap,
    online: net.online,
    highscores: net.highscores,
    currentUser: net.user
  });
  renderAchievements();
  renderBindUI();
  refreshBootUI();
}

// ---- Registration ----
saveUserBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const res = await apiRegister(username);
  if (!res) {
    net.online = false;
    setUserHint();
    refreshBootUI();
    return;
  }
  if (!res.ok) {
    net.online = Boolean(res?.status && res.status < 500);
    setUserHint();
    if (userHint && res?.error === "invalid_username") {
      userHint.className = "hint bad";
      userHint.textContent = "Please enter a valid username.";
    }
    refreshBootUI();
    return;
  }
  if (res.ok) {
    net.online = true;
    net.user = res.user;
    net.trails = normalizeTrails(res.trails || net.trails);
    syncIconCatalog(res.icons || net.icons);
    applyAchievementsPayload(res.achievements || { definitions: ACHIEVEMENTS, state: res.user?.achievements });

    binds = mergeBinds(DEFAULT_KEYBINDS, net.user.keybinds);
    usernameInput.value = net.user.username;
    await updateSkillSettings(res.user?.settings || skillSettings, { persist: false });

    await apiSetKeybinds(binds);
    await refreshProfileAndHighscores();
  }
});

// ---- Replay UI ----
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

async function playReplay({ captureMode = "none" } = {}) {
  // NEW: ensure gameplay music is OFF during replay playback/capture
  musicStop();

  setRandSource(createTapeRandPlayer(activeRun.rngTape));
  if (!activeRun || !activeRun.ended || !activeRun.ticks || !activeRun.ticks.length) {
    if (replayStatus) {
      replayStatus.className = "hint bad";
      replayStatus.textContent = "No replay available yet (finish a run first).";
    }
    return null;
  }

  replayDriving = true;
  try {
    // Same seed => same RNG stream (gameplay only; visuals must not consume it)
    setRandSource(createSeededRand(activeRun.seed));

    // Fake input for deterministic playback
    const replayInput = {
      cursor: { x: 0, y: 0, has: false },
      _move: { dx: 0, dy: 0 },
      getMove() { return this._move; }
    };

    const realInput = game.input;
    game.input = replayInput;

    // reset accumulator and start clean run
    acc = 0;
    input.reset();
    menu.classList.add("hidden");
    over.classList.add("hidden");
    game.startRun();

    // Optional capture (WebM)
    let recorder = null;
    let recordedChunks = [];
    if (captureMode !== "none") {
      const stream = canvas.captureStream(60);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm;codecs=vp8";
      recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) recordedChunks.push(e.data); };
      recorder.start();
    }

    for (let i = 0; i < activeRun.ticks.length; i++) {
      const tk = activeRun.ticks[i];

      // Apply inputs for this tick
      replayInput._move = tk.move || { dx: 0, dy: 0 };
      replayInput.cursor.x = tk.cursor?.x ?? 0;
      replayInput.cursor.y = tk.cursor?.y ?? 0;
      replayInput.cursor.has = !!tk.cursor?.has;

      // Apply actions scheduled for this tick (exactly like live tick processing)
      if (Array.isArray(tk.actions)) {
        for (const a of tk.actions) {
          if (a && a.cursor) {
            replayInput.cursor.x = a.cursor.x;
            replayInput.cursor.y = a.cursor.y;
            replayInput.cursor.has = !!a.cursor.has;
          }
          game.handleAction(a.id);
        }
      }

      // Step exactly one tick
      game.update(SIM_DT);
      game.render();

      await new Promise(requestAnimationFrame);
      if (game.state === 2 /* OVER */) break;
    }

    let webmBlob = null;
    if (recorder) {
      await new Promise((resolve) => { recorder.onstop = resolve; recorder.stop(); });
      webmBlob = new Blob(recordedChunks, { type: recorder.mimeType || "video/webm" });
    }

    // Restore real input
    game.input = realInput;

    over.classList.remove("hidden");
    return webmBlob;
  } finally {
    replayDriving = false;
  }
}

// ---- Cosmetics selection ----
trailSelect.addEventListener("change", async () => {
  const id = trailSelect.value;
  applyTrailSelection(id);
  trailPreview?.start();
  if (net.user) {
    net.user = { ...net.user, selectedTrail: id };
  } else {
    currentTrailId = id;
  }

  if (!net.user) return;

  const res = await apiSetTrail(id);
  if (!res || !res.ok) {
    net.online = Boolean(res?.status && res.status < 500);
    setUserHint();
    const hint = buildTrailHint({
      online: net.online,
      user: net.user,
      bestScore: net.user ? (net.user.bestScore | 0) : readLocalBest(),
      selectedTrail: currentTrailId
    });
    if (trailHint) {
      trailHint.className = hint.className;
      trailHint.textContent = hint.text;
    }
    return;
  }

  net.online = true;
  net.user = res.user;
  net.trails = normalizeTrails(res.trails || net.trails);
  syncIconCatalog(res.icons || net.icons);
  fillTrailSelect();
  applyIconSelection(net.user?.selectedIcon || currentIconId, playerIcons);
});

iconOptions?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-icon-id]");
  if (!btn) return;
  const id = btn.dataset.iconId;
  const unlocked = computeUnlockedIconSet(playerIcons);
  if (!unlocked.has(id)) {
    if (iconHint) {
      iconHint.className = "hint bad";
      iconHint.textContent = "That icon is locked.";
    }
    renderIconOptions(currentIconId, unlocked, playerIcons);
    return;
  }

  const previous = currentIconId;
  applyIconSelection(id, playerIcons, unlocked);
  if (iconHint) {
    iconHint.className = net.user ? "hint" : "hint good";
    iconHint.textContent = net.user ? "Saving icon choice…" : "Equipped (guest mode).";
  }

  if (!net.user) return;

  const res = await apiSetIcon(id);
  const outcome = classifyIconSaveResponse(res);
  net.online = outcome.online;

  if (outcome.resetUser) {
    net.user = null;
  }

  if (outcome.outcome === "saved" && res) {
    net.user = res.user;
    net.trails = normalizeTrails(res.trails || net.trails);
    syncIconCatalog(res.icons || net.icons);
    applyIconSelection(res.user?.selectedIcon || id, playerIcons);
  } else if (outcome.revert) {
    applyIconSelection(previous, playerIcons);
  }

  if (!outcome.online || outcome.resetUser) {
    setUserHint();
  }

  if (iconHint) {
    iconHint.className = outcome.outcome === "saved" ? "hint good" : "hint bad";
    iconHint.textContent = outcome.message;
  }
});

// ---- Keybind rebinding flow ----
let rebindActive = null;
let rebindCleanup = null;

function beginRebind(actionId) {
  if (rebindActive) return;
  rebindActive = actionId;
  bindHint.className = "hint good";
  bindHint.textContent =
    `Rebinding ${ACTIONS.find(a => a.id === actionId)?.label || actionId}… press a key or click a mouse button (Esc cancels).`;
  renderBindUI(rebindActive);

  const finish = async (newBind, cancel = false) => {
    if (!rebindActive) return;

    if (rebindCleanup) rebindCleanup();
    rebindCleanup = null;

    const action = rebindActive;
    rebindActive = null;

    if (cancel) {
      bindHint.className = "hint";
      bindHint.textContent = "Rebind cancelled.";
      renderBindUI(null);
      return;
    }

    const before = binds;
    const { binds: updated, swappedWith } = applyRebindWithSwap(binds, action, newBind);
    binds = updated;

    if (net.user) {
      const res = await apiSetKeybinds(binds);
      if (res && res.ok) {
        net.user = res.user;
      } else {
        binds = before;
        bindHint.className = "hint bad";
        bindHint.textContent = "Server rejected keybinds (conflict/invalid). Reverted.";
      }
    } else {
      saveGuestBinds(binds);
    }

    if (swappedWith) {
      bindHint.className = "hint warn";
      bindHint.textContent =
        `That input was already in use; swapped bindings with ${ACTIONS.find(a => a.id === swappedWith)?.label || swappedWith}.`;
    } else {
      bindHint.className = "hint good";
      bindHint.textContent = "Keybind updated.";
    }

    renderBindUI(null);
  };

  const onKeyDownCapture = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.code === "Escape") finish(null, true);
    else finish(keyEventToBind(e), false);
  };

  const onPointerDownCapture = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    finish(pointerEventToBind(e), false);
  };

  window.addEventListener("keydown", onKeyDownCapture, { capture: true });
  window.addEventListener("pointerdown", onPointerDownCapture, { capture: true });

  rebindCleanup = () => {
    window.removeEventListener("keydown", onKeyDownCapture, { capture: true });
    window.removeEventListener("pointerdown", onPointerDownCapture, { capture: true });
  };
}

bindWrap.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const actionId = btn.dataset.action;
  if (!actionId) return;
  beginRebind(actionId);
});

dashBehaviorSelect?.addEventListener("change", () => {
  updateSkillSettings({ ...skillSettings, dashBehavior: dashBehaviorSelect.value });
});
slowFieldBehaviorSelect?.addEventListener("change", () => {
  updateSkillSettings({ ...skillSettings, slowFieldBehavior: slowFieldBehaviorSelect.value });
});

// ---- Menu/game over buttons ----
// NEW: ensure audio buffers are loaded + music starts ONLY when gameplay begins.
async function ensureAudioReady() {
  try {
    await audioInit({
      musicUrl: AUDIO.musicUrl,
      boopUrl: AUDIO.boopUrl,
      niceUrl: AUDIO.niceUrl,
      bounceUrl: AUDIO.bounceUrl,
      shatterUrl: AUDIO.shatterUrl,
      slowFieldUrl: AUDIO.slowFieldUrl,
      slowExplosionUrl: AUDIO.slowExplosionUrl,
      dashStartUrl: AUDIO.dashStartUrl,
      dashBreakUrl: AUDIO.dashBreakUrl,
      teleportUrl: AUDIO.teleportUrl,
      phaseUrl: AUDIO.phaseUrl,
      explosionUrl: AUDIO.explosionUrl,
      gameOverUrl: AUDIO.gameOverUrl
    });
    applyVolumeFromUI();

  } catch (e) {
    // Non-fatal; game should still run without sound.
    console.warn("audioInit failed:", e);
  }
}

// Start/restart handlers (user gesture compliant)
startBtn.addEventListener("click", async () => {
  await ensureAudioReady();
  await startGame({ mode: "new" });
});

// Tutorial
tutorialBtn?.addEventListener("click", async () => {
  await ensureAudioReady();
  startTutorial();
});
restartBtn.addEventListener("click", async () => {
  await ensureAudioReady();
  await startGame({ mode: "new" });
});
retrySeedBtn?.addEventListener("click", async () => {
  await ensureAudioReady();
  await startGame({ mode: "retry" });
});

toMenuBtn.addEventListener("click", () => toMenu());

window.addEventListener("keydown", (e) => {
  if (e.code === "Enter" && !startBtn.disabled && !menu.classList.contains("hidden")) {
    e.preventDefault();
    // user gesture: ok to start audio
    (async () => {
      await ensureAudioReady();
      await startGame({ mode: "new" });
    })();
  }
  if (e.code === "Escape") {
    if (!menu.classList.contains("hidden")) return;
    e.preventDefault();
    toMenu();
  }
  if (e.code === "KeyR" && !over.classList.contains("hidden")) {
    e.preventDefault();
    (async () => {
      await ensureAudioReady();
      await startGame({ mode: "new" });
    })();
  }
}, { passive: false });

// ---- State transitions ----
function toMenu() {
  // NEW: stop music when leaving gameplay
  musicStop();

  // Ensure tutorial is fully torn down (restores cfg overrides).
  tutorial?.stop();

  setUIMode(true);
  if (rebindCleanup) rebindCleanup();
  rebindCleanup = null;
  rebindActive = null;

  over.classList.add("hidden");
  menu.classList.remove("hidden");

  resumeTrailPreview(trailSelect?.value || net.user?.selectedTrail || "classic");
  game.setStateMenu();
  refreshProfileAndHighscores();
}

function startTutorial() {
  // Tutorial is gameplay-like: music on, UI hidden, no replay recording.
  musicStop();
  pauseTrailPreview();

  setUIMode(false);
  if (rebindCleanup) rebindCleanup();
  rebindCleanup = null;
  rebindActive = null;

  input.reset();
  activeRun = null;
  replayDriving = false;

  // Use a stable RNG stream (even though tutorial spawns are deterministic).
  setRandSource(createSeededRand("tutorial"));

  menu.classList.add("hidden");
  over.classList.add("hidden");

  acc = 0;
  tutorial.start();
  musicStartLoop();
  window.focus();
}

async function startGame({ mode = "new" } = {}) {
  // NEW: always start music for actual gameplay; keep it off for menus
  // (musicStartLoop is safe if audio isn't ready; it will no-op.)
  musicStop();
  pauseTrailPreview();

  setUIMode(false);
  if (rebindCleanup) rebindCleanup();
  rebindCleanup = null;
  rebindActive = null;

  input.reset();

  // Decide seed behavior:
  // mode "new"   => always generate a new seed
  // mode "retry" => reuse the last ended seed (fallback to current seedInput if missing)
  let seed = "";

  if (mode === "retry") {
    seed = (lastEndedSeed || (seedInput ? seedInput.value.trim() : "")).trim();
    if (!seed) {
      seed = genRandomSeed(); // extreme fallback
    }
  } else {
    // default: always new seed
    seed = genRandomSeed();
  }

  if (seedInput) seedInput.value = seed;
  writeSeed(seed);

  // reset replay recording (tick-based) + RNG tape
  activeRun = { seed, ticks: [], pendingActions: [], ended: false, rngTape: [] };

  // IMPORTANT: record the exact RNG stream used during gameplay
  setRandSource(createTapeRandRecorder(seed, activeRun.rngTape));

  if (replayStatus) {
    replayStatus.className = "hint";
    replayStatus.textContent = `Recording replay… Seed: ${seed}`;
  }
  if (exportGifBtn) exportGifBtn.disabled = true;
  if (exportMp4Btn) exportMp4Btn.disabled = true;

  menu.classList.add("hidden");
  over.classList.add("hidden");

  acc = 0;
  game.startRun();

  // NEW: start soundtrack ONLY once we're in-game
  musicStartLoop();

  window.focus();
}

async function onGameOver(finalScore) {
  // Tutorial auto-retries its current scenario instead of showing GAME OVER.
  if (tutorial?.active) {
    tutorial.handleGameOver();
    return;
  }

  // NEW: stop music on game over (gameplay frozen)
  musicStop();

  setUIMode(true);
  finalEl.textContent = String(finalScore | 0);
  const runStats = game?.getRunStats ? game.getRunStats() : null;
  renderScoreBreakdown(scoreBreakdown, runStats, finalScore);

  const localBest = readLocalBest();
  if ((finalScore | 0) > (localBest | 0)) writeLocalBest(finalScore | 0);

  const pb = net.user ? (net.user.bestScore | 0) : readLocalBest();
  overPB.textContent = String(pb);

  over.classList.remove("hidden");

  if (net.user) {
    const coinsEarned = game?.bustercoinsEarned || 0;
    const optimistic = applyBustercoinEarnings(net, coinsEarned, bustercoinText);
    const res = await apiSubmitScore({
      score: finalScore | 0,
      bustercoinsEarned: coinsEarned,
      runStats
    });
    if (res && res.ok && res.user) {
      net.online = true;
      net.user = res.user;
      net.trails = normalizeTrails(res.trails || net.trails);
      syncIconCatalog(res.icons || net.icons);
      net.highscores = res.highscores || net.highscores;
      applyAchievementsPayload(res.achievements || { definitions: ACHIEVEMENTS, state: res.user?.achievements });

      fillTrailSelect();
      applyIconSelection(res.user?.selectedIcon || currentIconId, playerIcons);
      renderHighscores();
      renderAchievements();

      overPB.textContent = String(net.user.bestScore | 0);
    } else {
      if (optimistic.applied && net.user?.bustercoins !== undefined) {
        // Preserve optimistic balance locally so the menu reflects the run's pickups even if the
        // score submission failed (e.g., offline). A later refresh will reconcile with the server.
        if (bustercoinText) bustercoinText.textContent = String(net.user.bustercoins);
      }
      net.online = false;

      // Try to re-hydrate the session so subsequent runs can still submit.
      await refreshProfileAndHighscores();

      // Keep PB display meaningful even if the submission failed.
      const best = net.user ? (net.user.bestScore | 0) : readLocalBest();
      overPB.textContent = String(best);
    }
  }

  if (!net.user) {
    applyIconSelection(currentIconId, playerIcons);
  }

  if (activeRun) {
    activeRun.ended = true;

    // Remember this run's seed for "Retry Previous Seed"
    lastEndedSeed = String(activeRun.seed || "");
    if (retrySeedBtn) retrySeedBtn.disabled = !lastEndedSeed;

    // Make default action "Restart (new seed)"
    restartBtn?.focus?.();

    if (replayStatus) {
      replayStatus.className = "hint good";
      replayStatus.textContent = `Replay ready. Seed: ${activeRun.seed} • Ticks: ${activeRun.ticks.length}`;
    }
    if (exportGifBtn) exportGifBtn.disabled = false;
    if (exportMp4Btn) exportMp4Btn.disabled = false;
  }
}

// ---- FFmpeg (unchanged) ----
let _ffmpegSingleton = null;

async function loadFFmpeg() {
  if (_ffmpegSingleton) return _ffmpegSingleton;

  // Import from your own origin
  const ffmpegMod = await import("/vendor/ffmpeg/ffmpeg/index.js");
  const utilMod = await import("/vendor/ffmpeg/util/index.js");

  const fetchFile = utilMod.fetchFile || ffmpegMod.fetchFile;
  if (!fetchFile) throw new Error("fetchFile not found. Ensure /vendor/ffmpeg/util/ is present.");

  // Create instance using whatever API your module provides
  let ffmpeg = null;

  if (typeof ffmpegMod.FFmpeg === "function") {
    // Newer API: class
    ffmpeg = new ffmpegMod.FFmpeg();
  } else if (typeof ffmpegMod.createFFmpeg === "function") {
    // Older API: factory
    ffmpeg = ffmpegMod.createFFmpeg({ log: false });
  } else {
    console.log("ffmpeg module exports:", Object.keys(ffmpegMod));
    throw new Error("No FFmpeg constructor or createFFmpeg() found in /vendor/ffmpeg/ffmpeg/index.js");
  }

  if (typeof ffmpeg.load === "function") {
    try {
      await ffmpeg.load({
        coreURL: "/vendor/ffmpeg/core/ffmpeg-core.js",
        wasmURL: "/vendor/ffmpeg/core/ffmpeg-core.wasm",
        workerURL: "/vendor/ffmpeg/worker/worker.js",
      });
    } catch (e) {
      console.warn("Modern ffmpeg.load() signature failed; trying corePath fallback.", e);
      if (ffmpeg.setLogger) ffmpeg.setLogger(() => {});
      await ffmpeg.load();
    }
  } else {
    throw new Error("ffmpeg instance has no load() method. Wrong build copied.");
  }

  _ffmpegSingleton = { ffmpeg, fetchFile };
  return _ffmpegSingleton;
}

async function transcodeWithFFmpeg({ webmBlob, outExt }) {
  const { ffmpeg, fetchFile } = await loadFFmpeg();

  await ffmpeg.writeFile("in.webm", await fetchFile(webmBlob));

  if (outExt === "mp4") {
    await ffmpeg.exec([
      "-i", "in.webm",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "out.mp4"
    ]);
    const data = await ffmpeg.readFile("out.mp4");
    return new Blob([data.buffer], { type: "video/mp4" });
  } else {
    await ffmpeg.exec(["-i", "in.webm", "-vf", "fps=30,scale=640:-1:flags=lanczos,palettegen", "pal.png"]);
    await ffmpeg.exec(["-i", "in.webm", "-i", "pal.png", "-lavfi", "fps=30,scale=640:-1:flags=lanczos[x];[x][1:v]paletteuse", "out.gif"]);
    const data = await ffmpeg.readFile("out.gif");
    return new Blob([data.buffer], { type: "image/gif" });
  }
}

// ---- Main loop (fixed timestep + tick capture) ----
function frame(ts) {
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  dt = clamp(dt, 0, MAX_FRAME);

  // Per-frame tutorial UI (skill intro animations, etc.)
  if (tutorial?.active) tutorial.frame(dt);

  if (!replayDriving) {
    acc += dt;

    while (acc >= SIM_DT) {
      // Capture input snapshot for THIS tick
      const snap = input.snapshot();

      // Drain actions enqueued since last tick and apply them now (live run)
      let actions = [];
      if (tutorial?.active && game.state === 1 /* PLAY */) {
        actions = tutorial.drainActions();
      } else if (activeRun && game.state === 1 /* PLAY */) {
        actions = activeRun.pendingActions.splice(0);
      }

      // Record tick data
      if (!tutorial?.active && activeRun && game.state === 1 /* PLAY */) {
        activeRun.ticks.push({
          move: snap.move,
          cursor: snap.cursor,
          actions
        });
      }

      // Apply actions for this tick to the live game (tutorial or normal run)
      const canAdvanceSim = !(tutorial?.active && tutorial.pauseSim);
      if (game.state === 1 /* PLAY */ && actions.length && canAdvanceSim) {
        for (const a of actions) {
          // For teleport: ensure the input cursor reflects the recorded cursor for that action
          if (a && a.cursor) {
            input.cursor.x = a.cursor.x;
            input.cursor.y = a.cursor.y;
            input.cursor.has = !!a.cursor.has;
          }

          if (tutorial?.active) {
            if (!tutorial.allowAction(a.id)) {
              tutorial.notifyBlockedAction(a.id);
              continue;
            }
          }

          game.handleAction(a.id);
          tutorial?.onActionApplied(a.id);
        }
      }

      // Step simulation
      if (tutorial?.active) tutorial.beforeSimTick(SIM_DT);
      if (!(tutorial?.active && tutorial.pauseSim)) {
        if (driver) {
          driver.step(SIM_DT, actions);
        } else {
          game.update(SIM_DT);
        }
        if (tutorial?.active) tutorial.afterSimTick(SIM_DT);
      }
      acc -= SIM_DT;

      if (game.state === 2 /* OVER */) {
        if (activeRun) activeRun.pendingActions.length = 0;
        break;
      }
    }

    game.render();
    if (tutorial?.active) tutorial.renderOverlay(ctx);
  }

  requestAnimationFrame(frame);
}

// ---- Boot init ----
(async function init() {
  // Seed UI init (ONLY ONCE)
  if (seedInput) seedInput.value = readSeed() || "";

  if (seedRandomBtn) {
    seedRandomBtn.addEventListener("click", () => {
      const s = genRandomSeed();
      if (seedInput) seedInput.value = s;
      writeSeed(s);
      if (seedHint) {
        seedHint.className = "hint good";
        seedHint.textContent = `Generated seed: ${s}`;
      }
    });
  }
  if (seedInput) {
    seedInput.addEventListener("change", () => {
      writeSeed(seedInput.value.trim());
      if (seedHint) {
        seedHint.className = "hint";
        seedHint.textContent = "If two players use the same seed, pipe/orb spawns will match.";
      }
    });
  }

  primeVolumeUI();
  renderIconOptions(currentIconId, computeUnlockedIconSet(playerIcons), playerIcons);

  exportMp4Btn?.addEventListener("click", async () => {
    try {
      replayStatus.textContent = "Exporting MP4… (replaying + encoding)";
      const webm = await playReplay({ captureMode: "webm" });
      if (!webm) throw new Error("No WebM captured from replay.");

      const mp4 = await transcodeWithFFmpeg({ webmBlob: webm, outExt: "mp4" });
      downloadBlob(mp4, `flappy-bingus-${activeRun.seed}.mp4`);
      replayStatus.textContent = "MP4 exported.";
    } catch (e) {
      console.error(e);
      replayStatus.textContent = "MP4 export failed (see console).";
    }
  });

  exportGifBtn?.addEventListener("click", async () => {
    try {
      replayStatus.textContent = "Exporting GIF… (replaying + encoding)";
      const webm = await playReplay({ captureMode: "webm" });
      if (!webm) throw new Error("No WebM captured from replay.");

      const gif = await transcodeWithFFmpeg({ webmBlob: webm, outExt: "gif" });
      downloadBlob(gif, `flappy-bingus-${activeRun.seed}.gif`);
      replayStatus.textContent = "GIF exported.";
    } catch (e) {
      console.error(e);
      replayStatus.textContent = "GIF export failed (see console).";
    }
  });

  if (watchReplayBtn) {
    watchReplayBtn.addEventListener("click", async () => {
      // Ensure music is off during replay
      musicStop();

      if (replayStatus) {
        replayStatus.className = "hint";
        replayStatus.textContent = "Playing replay…";
      }
      await playReplay({ captureMode: "none" });
      if (replayStatus) {
        replayStatus.className = "hint good";
        replayStatus.textContent = "Replay finished.";
      }
    });
  }

  // Export buttons remain wired, but you still need the corrected FFmpeg loader.
  if (exportGifBtn) exportGifBtn.disabled = true;
  if (exportMp4Btn) exportMp4Btn.disabled = true;

  // config
  const cfgRes = await loadConfig();
  CFG = cfgRes.config;
  boot.cfgReady = true;
  boot.cfgOk = cfgRes.ok;
  boot.cfgSrc = cfgRes.source;

  game.cfg = CFG;

  game.resizeToWindow();
  game.setStateMenu();
  renderBindUI();

  await refreshProfileAndHighscores();
  refreshBootUI();

  resumeTrailPreview(trailSelect?.value || net.user?.selectedTrail || "classic");
  requestAnimationFrame((t) => {
    lastTs = t;
    requestAnimationFrame(frame);
  });
})();
