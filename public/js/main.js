// =====================
// FILE: public/js/main.js
// =====================
import { DEFAULT_CONFIG, loadConfig } from "./config.js";
import { DEFAULT_SKILL_SETTINGS, normalizeSkillSettings, skillSettingsEqual } from "./settings.js";
import {
  apiGetMe,
  apiRegister,
  apiGetHighscores,
  apiSetTrail,
  apiSetIcon,
  apiSetPipeTexture,
  apiSubmitScore,
  apiPurchaseUnlockable,
  apiGetBestRun,
  apiUploadBestRun,
  apiSetKeybinds,
  apiSetSettings
} from "./api.js";

import {
  escapeHtml,
  clamp,
  setRandSource,
  createSeededRand,
  createTapeRandRecorder,
  createTapeRandPlayer,
  formatRunDuration
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
import { DEFAULT_AUDIO_SETTINGS, readAudioSettings, writeAudioSettings } from "./audioSettings.js";
import { applyBustercoinEarnings } from "./bustercoins.js";
import {
  ACHIEVEMENTS,
  normalizeAchievementState,
  renderAchievementsList,
  appendAchievementToast,
  evaluateRunForAchievements
} from "./achievements.js";
import { renderScoreBreakdown } from "./scoreBreakdown.js";
import { computePersonalBestStatus, updatePersonalBestElements } from "./personalBest.js";
import { buildGameOverStats, GAME_OVER_STAT_VIEWS } from "./gameOverStats.js";
import { buildUnlockablesCatalog, getUnlockedIdsByType, UNLOCKABLE_TYPES } from "./unlockables.js";
import { DEFAULT_CURRENCY_ID, getUserCurrencyBalance } from "./currencySystem.js";
import {
  DEFAULT_PLAYER_ICON_ID,
  DEFAULT_PLAYER_ICONS,
  describeIconLock,
  getUnlockedPlayerIcons,
  normalizeIconSelection,
  normalizePlayerIcons
} from "./playerIcons.js";
import { classifyIconSaveResponse } from "./iconSave.js";
import {
  DEFAULT_ICON_HINT,
  applyIconSwatchStyles,
  iconHoverText,
  renderIconOptions as renderIconMenuOptions,
  resetIconHint,
  toggleIconMenu
} from "./iconMenu.js";
import { clearIconSpriteCache, getCachedIconSprite, paintIconCanvas } from "./swatchPainter.js";
import {
  DEFAULT_PIPE_TEXTURE_ID,
  DEFAULT_PIPE_TEXTURE_MODE,
  normalizePipeTextureMode,
  normalizePipeTextures,
  paintPipeTextureSwatch
} from "./pipeTextures.js";
import {
  DEFAULT_PIPE_TEXTURE_HINT,
  describePipeTextureLock,
  pipeTextureHoverText,
  renderPipeTextureOptions,
  shouldClosePipeTextureMenu,
  togglePipeTextureMenu
} from "./pipeTextureMenu.js";

import { buildGameUI } from "./uiLayout.js";
import { createMenuParallaxController } from "./menuParallax.js";
import { TrailPreview } from "./trailPreview.js";
import { normalizeTrailSelection } from "./trailSelectUtils.js";
import { buildTrailHint, GUEST_TRAIL_HINT_TEXT } from "./trailHint.js";
import { DEFAULT_TRAILS, getUnlockedTrails, normalizeTrails, sortTrailsForDisplay } from "./trailProgression.js";
import { computePipeColor } from "./pipeColors.js";
import { hydrateBestRunPayload, maybeUploadBestRun } from "./bestRunRecorder.js";
import { renderHighscores } from "./highscores.js";
import { getAuthStatusFromResponse } from "./authResponse.js";
import {
  DEFAULT_TRAIL_HINT,
  describeTrailLock,
  renderTrailOptions as renderTrailMenuOptions,
  trailHoverText,
  toggleTrailMenu
} from "./trailMenu.js";
import { SHOP_TABS, getPurchasableUnlockablesByType, renderShopItems } from "./shopMenu.js";
import { playbackTicks, chooseReplayRandSource } from "./replayUtils.js";
import { bindSkillOptionGroup, markSkillOptionSelection } from "./skillOptions.js";
import { renderSkillUsageStats } from "./skillUsageStats.js";
import { initThemeEditor } from "./themes.js";
import {
  getIconDisplayName,
  getPipeTextureDisplayName as getPipeTextureLabel,
  getTrailDisplayName,
  createMenuProfileModel
} from "./menuProfileBindings.js";
import { buildAuthHints } from "./authHints.js";
import { OFFLINE_STATUS_TEXT } from "./userStatusCopy.js";
import { applyNetUserUpdate } from "./netUser.js";
import { handleTrailSaveResponse } from "./trailSaveResponse.js";
import { readSessionUsername } from "./session.js";
import {
  genRandomSeed,
  readIconCookie,
  readLocalBest,
  readPipeTextureCookie,
  readPipeTextureModeCookie,
  readSeed,
  readSettingsCookie,
  writeIconCookie,
  writeLocalBest,
  writePipeTextureCookie,
  writePipeTextureModeCookie,
  writeSeed,
  writeSettingsCookie
} from "./preferences.js";

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
  trailHint,
  trailPreviewCanvas,
  trailOptions,
  trailOverlay,
  trailOverlayClose,
  trailLauncher,
  pipeTextureOptions,
  pipeTextureOverlay,
  pipeTextureLauncher,
  pipeTextureHint,
  pipeTextureModeOptions,
  iconOptions,
  iconHint,
  iconOverlay,
  iconOverlayClose,
  iconLauncher,
  bindWrap,
  bindHint,
  dashBehaviorOptions,
  teleportBehaviorOptions,
  invulnBehaviorOptions,
  slowFieldBehaviorOptions,
  hsWrap,
  pbText,
  trailText,
  offlineStatus,
  menuPanel,
  iconText,
  pipeTextureText,
  bustercoinText,
  final: finalEl,
  overDuration,
  overPB,
  overPbBadge,
  overPbStatus,
  overOrbCombo,
  overOrbComboLabel,
  overPerfectCombo,
  overPerfectComboLabel,
  overAchievements,
  overAchievementsList,
  overStatsMode,
  overStatsToggle,
  skillUsageStats,
  skillUsageTitle,
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
  achievementsFilterScore,
  achievementsFilterPerfects,
  achievementsFilterOrbs,
  achievementsFilterPipes,
  achievementToasts,
  themeLauncher,
  themeOverlay,
  themeOverlayClose,
  themePresetSelect,
  themeResetBtn,
  themeRandomizeBtn,
  themeRandomAccentBtn,
  themePaletteRow,
  themeEditor,
  themeExportField,
  themeExportBtn,
  themeImportBtn,
  themeStatus,
  shopLauncher,
  shopOverlay,
  shopOverlayClose,
  shopTabs,
  shopItems,
  shopHint,
  purchaseModal,
  purchaseModalClose,
  purchaseModalBalance,
  purchaseModalPrompt,
  purchaseModalStatus,
  purchaseModalCancel,
  purchaseModalConfirm,
  updateSkillCooldowns
} = ui;

// ---- Local best fallback cookie (legacy support) ----
function updatePersonalBestUI(finalScore, userBestScore) {
  if (!overPB) return;
  const personalBestStatus = computePersonalBestStatus(finalScore, userBestScore, readLocalBest());
  if (personalBestStatus.shouldPersistLocalBest) {
    writeLocalBest(personalBestStatus.score);
  }
  const refreshedStatus = computePersonalBestStatus(finalScore, userBestScore, readLocalBest());
  updatePersonalBestElements(
    {
      personalBestEl: overPB,
      badgeEl: overPbBadge,
      statusEl: overPbStatus
    },
    refreshedStatus
  );
}

let currentStatsView = GAME_OVER_STAT_VIEWS.run;
let lastRunStats = null;
let runAchievementBaseState = null;
let runAchievementIds = new Set();
let runAchievementDefs = [];

function applyStatsLabels(labels) {
  if (overOrbComboLabel) overOrbComboLabel.textContent = labels.orb;
  if (overPerfectComboLabel) overPerfectComboLabel.textContent = labels.perfect;
  if (skillUsageTitle) skillUsageTitle.textContent = labels.skillUsage;
  if (overStatsMode) overStatsMode.textContent = labels.mode;
  if (overStatsToggle) overStatsToggle.textContent = labels.toggle;
}

function updateGameOverStats({ view = currentStatsView, runStats = lastRunStats, achievementsState, skillTotals = net.user?.skillTotals } = {}) {
  if (!overOrbCombo || !overPerfectCombo || !skillUsageStats) return;
  const resolved = buildGameOverStats({ view, runStats, achievementsState, skillTotals });
  currentStatsView = resolved.view;
  overOrbCombo.textContent = String(resolved.combo.orb);
  overPerfectCombo.textContent = String(resolved.combo.perfect);
  renderSkillUsageStats(skillUsageStats, resolved.skillUsage);
  applyStatsLabels(resolved.labels);
}

let menuParallaxControl = null;
function setUIMode(isUI) {
  // When UI is shown, let clicks go to HTML controls
  canvas.style.pointerEvents = isUI ? "none" : "auto";
  if (menuParallaxControl) {
    const active = isUI && !menu.classList.contains("hidden");
    menuParallaxControl.setEnabled(active);
    if (active) menuParallaxControl.applyFromPoint();
  }
}

function updateSkillCooldownUI(cfg) {
  if (typeof updateSkillCooldowns === "function") {
    updateSkillCooldowns(cfg || DEFAULT_CONFIG);
  }
}

// ---- Boot + runtime state ----
const boot = { imgReady: false, imgOk: false, cfgReady: false, cfgOk: false, cfgSrc: "defaults" };

const net = {
  online: true,
  user: null,
  trails: DEFAULT_TRAILS.map((t) => ({ ...t })),
  icons: DEFAULT_PLAYER_ICONS.map((i) => ({ ...i })),
  pipeTextures: normalizePipeTextures(null),
  highscores: [],
  achievements: { definitions: ACHIEVEMENTS, state: normalizeAchievementState() },
  unlockables: buildUnlockablesCatalog({
    trails: DEFAULT_TRAILS,
    icons: DEFAULT_PLAYER_ICONS,
    pipeTextures: normalizePipeTextures(null)
  })
};

// keybinds: start from guest cookie; override from server user when available
let binds = loadGuestBinds();
let skillSettings = readSettingsCookie() || normalizeSkillSettings(DEFAULT_SKILL_SETTINGS);

// config + assets
let CFG = null;
let trailPreview = null;
let lastTrailHint = { className: "hint", text: DEFAULT_TRAIL_HINT };
let currentTrailId = "classic";
let playerIcons = normalizePlayerIcons(DEFAULT_PLAYER_ICONS);
let currentIconId = normalizeIconSelection({
  currentId: readIconCookie(),
  unlockedIds: playerIcons.map((i) => i.id),
  fallbackId: DEFAULT_PLAYER_ICON_ID
});
let currentPipeTextureId = readPipeTextureCookie() || DEFAULT_PIPE_TEXTURE_ID;
let currentPipeTextureMode = normalizePipeTextureMode(readPipeTextureModeCookie() || DEFAULT_PIPE_TEXTURE_MODE);
let activeShopTab = SHOP_TABS[0]?.type || UNLOCKABLE_TYPES.playerTexture;
let pendingPurchase = null;

const menuProfileModel = createMenuProfileModel({
  refs: { usernameInput, pbText, trailText, iconText, pipeTextureText, bustercoinText },
  user: net.user,
  trails: net.trails,
  icons: playerIcons,
  pipeTextures: net.pipeTextures,
  fallbackTrailId: currentTrailId,
  fallbackIconId: currentIconId,
  fallbackPipeTextureId: currentPipeTextureId,
  bestScoreFallback: readLocalBest()
});

// assets
let playerImg = getCachedIconSprite(playerIcons.find((i) => i.id === currentIconId));
boot.imgReady = true; boot.imgOk = true;
refreshBootUI();

trailPreview = trailPreviewCanvas ? new TrailPreview({
  canvas: trailPreviewCanvas,
  playerImg
}) : null;
syncLauncherSwatch(currentIconId, playerIcons, playerImg);
syncPipeTextureCatalog(net.pipeTextures);
syncPipeTextureSwatch(currentPipeTextureId, net.pipeTextures);
menuParallaxControl = createMenuParallaxController({
  panel: menuPanel || menu,
  layers: ui.menuParallaxLayers || []
});

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
let lastUploadedBestSeed = null;
let lastUploadedBestScore = -Infinity;

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
const DEFAULT_MUSIC = DEFAULT_AUDIO_SETTINGS.music;
const DEFAULT_SFX = DEFAULT_AUDIO_SETTINGS.sfx;
const DEFAULT_AUDIO = { ...DEFAULT_AUDIO_SETTINGS, music: DEFAULT_MUSIC, sfx: DEFAULT_SFX, muted: false };

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
  writeAudioSettings({ music, sfx, muted: isMuted }, DEFAULT_AUDIO);

  if (game) {
    const sfxAudible = !isMuted && sfx > 0;
    game.setAudioEnabled(sfxAudible);
  }
}

function primeVolumeUI() {
  const saved = readAudioSettings(DEFAULT_AUDIO) || DEFAULT_AUDIO;
  if (musicSlider) musicSlider.value = String(Math.round(saved.music * 100));
  if (sfxSlider) sfxSlider.value = String(Math.round(saved.sfx * 100));
  if (muteToggle) muteToggle.checked = !!saved.muted;
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
    return currentTrailId || "classic";
  },
  getPipeTexture: () => ({
    id: net.user?.selectedPipeTexture || currentPipeTextureId || DEFAULT_PIPE_TEXTURE_ID,
    mode: net.user?.pipeTextureMode || currentPipeTextureMode || DEFAULT_PIPE_TEXTURE_MODE
  }),
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
function syncMenuProfileBindingsFromState({
  fallbackUsername = readSessionUsername() || "",
  fallbackTrailId = currentTrailId,
  fallbackIconId = currentIconId,
  fallbackPipeTextureId = currentPipeTextureId,
  bestScoreFallback = net.user ? (net.user.bestScore | 0) : readLocalBest()
} = {}) {
  return menuProfileModel.sync({
    user: net.user,
    trails: net.trails,
    icons: playerIcons,
    pipeTextures: net.pipeTextures,
    fallbackUsername,
    fallbackTrailId,
    fallbackIconId,
    fallbackPipeTextureId,
    bestScoreFallback
  });
}

function setNetUser(nextUser, { syncProfile = true } = {}) {
  applyNetUserUpdate({ net, syncMenuProfileBindingsFromState }, nextUser, { syncProfile });
}

function setUserHint() {
  const best = net.user ? (net.user.bestScore | 0) : readLocalBest();
  const isRecordHolder = Boolean(net.user?.isRecordHolder);
  const achievements = net.user?.achievements || net.achievements?.state;
  const orderedTrails = sortTrailsForDisplay(net.trails, { isRecordHolder });
  const { userHint: hint, trailHint: authTrailHint } = buildAuthHints({
    online: net.online,
    user: net.user,
    bestScore: best,
    trails: orderedTrails,
    achievements
  });
  if (userHint) {
    userHint.className = hint.className;
    userHint.textContent = hint.text;
  }
  if (offlineStatus) {
    offlineStatus.textContent = OFFLINE_STATUS_TEXT;
    offlineStatus.classList.toggle("hidden", net.online);
  }
  if (trailHint && authTrailHint) {
    const current = trailHint.textContent || "";
    const showingGuest = current.includes(GUEST_TRAIL_HINT_TEXT);
    const shouldShowGuest = authTrailHint.text === GUEST_TRAIL_HINT_TEXT;
    if (showingGuest !== shouldShowGuest) {
      setTrailHint(authTrailHint);
    }
  }
}

async function handlePlayHighscore(username) {
  if (!username) return;
  if (replayStatus) {
    replayStatus.className = "hint";
    replayStatus.textContent = `Loading ${username}'s best run…`;
  }
  try {
    const res = await apiGetBestRun(username);
    if (!res?.ok || !res.run) {
      if (replayStatus) {
        replayStatus.className = "hint bad";
        replayStatus.textContent = "Replay not available for this player.";
      }
      return;
    }
    const playbackRun = hydrateBestRunPayload(res.run);
    if (!playbackRun) {
      if (replayStatus) {
        replayStatus.className = "hint bad";
        replayStatus.textContent = "Replay data is invalid.";
      }
      return;
    }

    await playReplay({ captureMode: "none", run: playbackRun });
    if (replayStatus) {
      replayStatus.className = "hint good";
      replayStatus.textContent = `Playing ${username}'s best run… done.`;
    }
  } catch (err) {
    console.error(err);
    if (replayStatus) {
      replayStatus.className = "hint bad";
      replayStatus.textContent = "Unable to play the selected replay.";
    }
  }
}

function renderHighscoresUI() {
  renderHighscores({
    container: hsWrap,
    online: net.online,
    highscores: net.highscores,
    currentUser: net.user,
    onPlayRun: handlePlayHighscore
  });
}

function syncUnlockablesCatalog({
  trails = net.trails,
  icons = playerIcons,
  pipeTextures = net.pipeTextures
} = {}) {
  net.unlockables = buildUnlockablesCatalog({ trails, icons, pipeTextures });
}

function syncIconCatalog(nextIcons = null) {
  const normalized = normalizePlayerIcons(nextIcons || playerIcons);
  playerIcons = normalized;
  net.icons = normalized.map((i) => ({ ...i }));
  clearIconSpriteCache();
  playerImg = getCachedIconSprite(playerIcons.find((i) => i.id === currentIconId) || playerIcons[0]);
  game?.setPlayerImage(playerImg);
  trailPreview?.setPlayerImage(playerImg);
  syncLauncherSwatch(currentIconId, playerIcons, playerImg);
  syncUnlockablesCatalog({ icons: playerIcons });
  syncMenuProfileBindingsFromState();
}

function syncPipeTextureCatalog(nextTextures = null) {
  const normalized = normalizePipeTextures(nextTextures || net.pipeTextures);
  net.pipeTextures = normalized.map((t) => ({ ...t }));
  syncUnlockablesCatalog({ pipeTextures: net.pipeTextures });
  syncMenuProfileBindingsFromState();
}

function getOwnedUnlockables(user = net.user) {
  if (!user) return [];
  if (Array.isArray(user.ownedUnlockables)) return user.ownedUnlockables;
  if (Array.isArray(user.ownedIcons)) return user.ownedIcons;
  return [];
}

function computeUnlockedIconSet(icons = playerIcons) {
  const best = net.user ? (net.user.bestScore | 0) : readLocalBest();
  const achievements = net.user?.achievements || net.achievements?.state;
  const owned = getOwnedUnlockables(net.user);
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

function computeUnlockedTrailSet(trails = net.trails) {
  const achievements = net.user?.achievements || net.achievements?.state;
  const isRecordHolder = Boolean(net.user?.isRecordHolder);
  return new Set(getUnlockedTrails(trails, achievements, { isRecordHolder }));
}

function computeUnlockedPipeTextureSet(textures = net.pipeTextures) {
  const best = net.user ? (net.user.bestScore | 0) : readLocalBest();
  const achievements = net.user?.achievements || net.achievements?.state;
  const owned = getOwnedUnlockables(net.user);
  const isRecordHolder = Boolean(net.user?.isRecordHolder);
  const unlockedIds = getUnlockedIdsByType({
    unlockables: net.unlockables?.unlockables || [],
    type: UNLOCKABLE_TYPES.pipeTexture,
    context: {
      bestScore: best,
      achievements,
      ownedIds: owned,
      recordHolder: isRecordHolder
    }
  });
  return new Set(unlockedIds);
}

function syncLauncherSwatch(iconId = currentIconId, icons = playerIcons, image = playerImg) {
  const icon = icons.find((i) => i.id === iconId) || icons[0];
  const iconCanvas = iconLauncher?.querySelector("canvas.icon-swatch-canvas");
  paintIconCanvas(iconCanvas, icon, { sprite: image });
}

function syncPipeTextureSwatch(textureId = currentPipeTextureId, textures = net.pipeTextures) {
  const target = textures.find((t) => t.id === textureId) || textures[0];
  const canvas = pipeTextureLauncher?.querySelector("canvas.pipe-texture-swatch-canvas");
  const base = computePipeColor(0.5, CFG?.pipes?.colors);
  paintPipeTextureSwatch(canvas, target?.id || DEFAULT_PIPE_TEXTURE_ID, { mode: currentPipeTextureMode, base });
}

function renderIconOptions(
  selectedId = currentIconId,
  unlocked = computeUnlockedIconSet(playerIcons),
  icons = playerIcons,
  selectedImg = playerImg
) {
  const swatches = [];
  const { rendered } = renderIconMenuOptions({
    container: iconOptions,
    icons,
    selectedId,
    unlockedIds: unlocked,
    onRenderSwatch: (data) => swatches.push(data)
  });
  swatches.forEach((entry) => {
    const sprite = entry.icon.id === selectedId ? selectedImg : getCachedIconSprite(entry.icon);
    paintIconCanvas(entry.canvas, entry.icon, { sprite });
  });
  if (iconHint) {
    const text = rendered ? DEFAULT_ICON_HINT : "No icons available.";
    iconHint.className = rendered ? "hint" : "hint bad";
    iconHint.textContent = text;
  }
  return rendered;
}

function renderPipeTextureMenuOptions(
  selectedId = currentPipeTextureId,
  unlocked = computeUnlockedPipeTextureSet(net.pipeTextures),
  textures = net.pipeTextures
) {
  const swatches = [];
  const { rendered } = renderPipeTextureOptions({
    container: pipeTextureOptions,
    textures,
    selectedId,
    unlockedIds: unlocked,
    onRenderSwatch: (data) => swatches.push(data)
  });
  const base = computePipeColor(0.5, CFG?.pipes?.colors);
  swatches.forEach(({ canvas, texture }) => {
    paintPipeTextureSwatch(canvas, texture.id, { mode: currentPipeTextureMode, base });
  });
  if (pipeTextureHint) {
    const text = rendered ? DEFAULT_PIPE_TEXTURE_HINT : "No pipe textures available.";
    pipeTextureHint.className = rendered ? "hint" : "hint bad";
    pipeTextureHint.textContent = text;
  }
  return rendered;
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
  if (iconLauncher) {
    const swatch = iconLauncher.querySelector(".icon-swatch");
    applyIconSwatchStyles(swatch, icons.find((i) => i.id === nextId));
    const nameEl = iconLauncher.querySelector(".icon-launcher-name");
    if (nameEl) nameEl.textContent = getIconDisplayName(nextId, icons);
  }

  playerImg = getCachedIconSprite(icons.find((i) => i.id === nextId) || icons[0]);
  game.setPlayerImage(playerImg);
  trailPreview?.setPlayerImage(playerImg);
  syncLauncherSwatch(nextId, icons, playerImg);
  renderIconOptions(nextId, unlocked, icons, playerImg);
  refreshTrailMenu(currentTrailId);
  writeIconCookie(nextId);
  return nextId;
}

function applyPipeTextureSelection(
  id = currentPipeTextureId,
  textures = net.pipeTextures,
  unlocked = computeUnlockedPipeTextureSet(textures)
) {
  const safeId = unlocked.has(id) ? id : (Array.from(unlocked)[0] || DEFAULT_PIPE_TEXTURE_ID);
  currentPipeTextureId = safeId || DEFAULT_PIPE_TEXTURE_ID;
  writePipeTextureCookie(currentPipeTextureId);
  writePipeTextureModeCookie(currentPipeTextureMode);
  if (pipeTextureText) pipeTextureText.textContent = getPipeTextureLabel(currentPipeTextureId, textures);
  if (pipeTextureLauncher) {
    const nameEl = pipeTextureLauncher.querySelector(".pipe-texture-launcher-name");
    if (nameEl) nameEl.textContent = getPipeTextureLabel(currentPipeTextureId, textures);
  }
  syncPipeTextureSwatch(currentPipeTextureId, textures);
}

function applyTrailSelection(id, trails = net.trails) {
  const safeId = id || "classic";
  currentTrailId = safeId;
  if (trailText) {
    trailText.textContent = getTrailDisplayName(safeId, trails);
  }
  if (trailLauncher) {
    const nameEl = trailLauncher.querySelector(".trail-launcher-name");
    if (nameEl) nameEl.textContent = getTrailDisplayName(safeId, trails);
  }
  trailPreview?.setTrail(safeId);
  syncLauncherSwatch(currentIconId, playerIcons, playerImg);
}

function setTrailHint(hint, { persist = true } = {}) {
  if (trailHint) {
    trailHint.className = hint.className || "hint";
    trailHint.textContent = hint.text || DEFAULT_TRAIL_HINT;
  }
  if (persist) {
    lastTrailHint = hint;
  }
}

function resumeTrailPreview(selectedId = currentTrailId || "classic") {
  applyTrailSelection(selectedId || currentTrailId || "classic");
  trailPreview?.start();
}

function pauseTrailPreview() {
  trailPreview?.stop();
}

function refreshTrailMenu(selectedId = currentTrailId) {
  const best = (net.user ? (net.user.bestScore | 0) : readLocalBest());
  const isRecordHolder = Boolean(net.user?.isRecordHolder);
  const achievements = net.user?.achievements || net.achievements?.state;
  const orderedTrails = sortTrailsForDisplay(net.trails, { isRecordHolder });
  const unlocked = computeUnlockedTrailSet(orderedTrails);
  const selected = normalizeTrailSelection({
    currentId: selectedId,
    userSelectedId: net.user?.selectedTrail,
    selectValue: selectedId,
    unlockedIds: unlocked,
    fallbackId: "classic"
  });

  applyTrailSelection(selected, orderedTrails);

  const { rendered } = renderTrailMenuOptions({
    container: trailOptions,
    trails: orderedTrails,
    selectedId: selected,
    unlockedIds: unlocked,
    lockTextFor: (trail, { unlocked: unlockedTrail }) => describeTrailLock(trail, {
      unlocked: unlockedTrail ?? unlocked.has(trail.id),
      bestScore: best,
      isRecordHolder
    })
  });

  syncMenuProfileBindingsFromState({ bestScoreFallback: best, fallbackTrailId: selected });

  const hint = buildTrailHint({
    online: net.online,
    user: net.user,
    bestScore: best,
    trails: orderedTrails,
    achievements
  });
  if (trailHint) {
    setTrailHint(rendered ? hint : { className: "hint bad", text: "No trails available." });
  }
  return { selected, unlocked, orderedTrails, best };
}

function renderPipeTextureModeButtons(mode = currentPipeTextureMode) {
  if (!pipeTextureModeOptions) return;
  const normalized = normalizePipeTextureMode(mode);
  const buttons = pipeTextureModeOptions.querySelectorAll("button[data-pipe-texture-mode]");
  buttons.forEach((btn) => {
    const btnMode = normalizePipeTextureMode(btn.dataset.pipeTextureMode);
    const active = btnMode === normalized;
    btn.classList.toggle("selected", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function refreshPipeTextureMenu(selectedId = currentPipeTextureId) {
  const unlocked = computeUnlockedPipeTextureSet(net.pipeTextures);
  const safeId = unlocked.has(selectedId) ? selectedId : (Array.from(unlocked)[0] || DEFAULT_PIPE_TEXTURE_ID);
  applyPipeTextureSelection(safeId, net.pipeTextures, unlocked);
  renderPipeTextureModeButtons(currentPipeTextureMode);
  const rendered = renderPipeTextureMenuOptions(safeId, unlocked, net.pipeTextures);
  return { selected: safeId, unlocked, rendered };
}

function buildPurchaseContext() {
  return {
    achievements: net.user?.achievements || net.achievements?.state,
    bestScore: net.user ? (net.user.bestScore | 0) : readLocalBest(),
    ownedIds: getOwnedUnlockables(net.user),
    recordHolder: Boolean(net.user?.isRecordHolder)
  };
}

function updateShopTabs(type = activeShopTab) {
  activeShopTab = type;
  if (!shopTabs) return;
  const buttons = shopTabs.querySelectorAll("button[data-shop-type]");
  buttons.forEach((btn) => {
    const isActive = btn.dataset.shopType === activeShopTab;
    btn.classList.toggle("selected", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderShopCategory(type = activeShopTab) {
  if (!shopItems) return { rendered: 0 };
  updateShopTabs(type);
  const purchasables = getPurchasableUnlockablesByType(net.unlockables?.unlockables || [], type);
  const context = buildPurchaseContext();
  const { rendered } = renderShopItems({
    container: shopItems,
    items: purchasables,
    context,
    onPurchase: (def) => openPurchaseModal(def, { source: "shop" })
  });
  if (shopHint) {
    shopHint.className = rendered ? "hint" : "hint";
    shopHint.textContent = rendered
      ? "Select an item to purchase it with your currency balance."
      : "No purchasable items in this category yet.";
  }
  return { rendered };
}

function toggleShopOverlay(open) {
  if (!shopOverlay) return;
  shopOverlay.classList.toggle("hidden", !open);
  shopOverlay.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    renderShopCategory(activeShopTab);
  }
}

function togglePurchaseModal(open) {
  if (!purchaseModal) return;
  purchaseModal.classList.toggle("hidden", !open);
  purchaseModal.setAttribute("aria-hidden", open ? "false" : "true");
}

function openPurchaseModal(def, { source = "menu" } = {}) {
  if (!def || def.unlock?.type !== "purchase") return;
  pendingPurchase = { def, source };
  const currencyId = def.unlock.currencyId || DEFAULT_CURRENCY_ID;
  const balance = getUserCurrencyBalance(net.user, currencyId);
  const cost = Number(def.unlock.cost || 0);
  const insufficient = Boolean(net.user && balance < cost);
  if (purchaseModalBalance) {
    purchaseModalBalance.textContent = `Current Balance: ${balance}`;
  }
  if (purchaseModalPrompt) {
    purchaseModalPrompt.textContent = `Do you want to spend ${cost} on ${def.name || def.id}`;
  }
  if (purchaseModalStatus) {
    if (!net.user) {
      purchaseModalStatus.className = "hint bad";
      purchaseModalStatus.textContent = "Sign in to purchase unlockables.";
    } else if (insufficient) {
      purchaseModalStatus.className = "hint bad";
      purchaseModalStatus.textContent = "Not enough currency to purchase this item.";
    } else {
      purchaseModalStatus.className = "hint";
      purchaseModalStatus.textContent = "";
    }
  }
  if (purchaseModalConfirm) {
    purchaseModalConfirm.disabled = !net.user || insufficient;
  }
  togglePurchaseModal(true);
}

function closePurchaseModal() {
  pendingPurchase = null;
  togglePurchaseModal(false);
}

async function confirmPendingPurchase() {
  if (!pendingPurchase?.def) return;
  if (!net.user) {
    if (purchaseModalStatus) {
      purchaseModalStatus.className = "hint bad";
      purchaseModalStatus.textContent = "Sign in to purchase unlockables.";
    }
    return;
  }
  if (purchaseModalConfirm) purchaseModalConfirm.disabled = true;
  if (purchaseModalStatus) {
    purchaseModalStatus.className = "hint";
    purchaseModalStatus.textContent = "Processing purchase…";
  }

  const { def, source } = pendingPurchase;
  const res = await apiPurchaseUnlockable({ id: def.id, type: def.type });
  if (!res || !res.ok) {
    if (purchaseModalStatus) {
      purchaseModalStatus.className = "hint bad";
      purchaseModalStatus.textContent = res?.error === "insufficient_funds"
        ? "Not enough currency to complete this purchase."
        : res?.error === "already_owned"
          ? "You already own this unlockable."
          : "Purchase failed. Please try again.";
    }
    if (purchaseModalConfirm) purchaseModalConfirm.disabled = false;
    return;
  }

  net.online = true;
  if (res.user) setNetUser(res.user);
  if (res.trails) net.trails = normalizeTrails(res.trails);
  if (res.icons) syncIconCatalog(res.icons);
  if (res.pipeTextures) syncPipeTextureCatalog(res.pipeTextures);
  syncUnlockablesCatalog({ trails: net.trails });

  refreshTrailMenu();
  refreshPipeTextureMenu(currentPipeTextureId);
  renderIconOptions(currentIconId, computeUnlockedIconSet(playerIcons), playerIcons);
  renderShopCategory(activeShopTab);
  setUserHint();
  syncMenuProfileBindingsFromState();

  if (source === "pipe_texture" && pipeTextureHint) {
    pipeTextureHint.className = "hint good";
    pipeTextureHint.textContent = "Purchase complete! Texture unlocked.";
  } else if (source === "icon" && iconHint) {
    iconHint.className = "hint good";
    iconHint.textContent = "Purchase complete! Icon unlocked.";
  } else if (source === "trail" && trailHint) {
    setTrailHint({ className: "hint good", text: "Purchase complete! Trail unlocked." }, { persist: false });
  }

  closePurchaseModal();
}

function renderAchievements(payload = null) {
  if (!achievementsList) return;
  const state = payload?.state || net.achievements?.state || net.user?.achievements;
  const definitions = payload?.definitions || net.achievements?.definitions || ACHIEVEMENTS;
  const categories = [];
  if (achievementsFilterScore?.checked) categories.push("score");
  if (achievementsFilterPerfects?.checked) categories.push("perfects");
  if (achievementsFilterOrbs?.checked) categories.push("orbs");
  if (achievementsFilterPipes?.checked) categories.push("pipes");
  // Always include special achievements so they remain discoverable
  categories.push("other");
  renderAchievementsList(achievementsList, {
    state: normalizeAchievementState(state),
    definitions,
    filters: {
      hideCompleted: achievementsHideCompleted?.checked,
      categories
    }
  });
}

function renderRunAchievements() {
  if (!overAchievements || !overAchievementsList) return;
  overAchievementsList.innerHTML = "";
  if (!runAchievementDefs.length) {
    overAchievements.hidden = true;
    return;
  }

  overAchievements.hidden = false;
  runAchievementDefs.forEach((def) => {
    const item = document.createElement("div");
    item.className = "over-achievement-item";

    const title = document.createElement("div");
    title.className = "over-achievement-title";
    title.textContent = def.title || "Achievement";

    const desc = document.createElement("div");
    desc.className = "over-achievement-desc";
    desc.textContent = def.description || "";

    item.append(title, desc);
    overAchievementsList.append(item);
  });
}

function recordRunAchievements(ids = [], { showPopup = false } = {}) {
  if (!ids?.length) return;
  const definitions = net.achievements?.definitions || ACHIEVEMENTS;
  ids.forEach((id) => {
    if (runAchievementIds.has(id)) return;
    const def = definitions.find((entry) => entry.id === id);
    if (!def) return;
    runAchievementIds.add(id);
    runAchievementDefs.push(def);
    if (showPopup) {
      appendAchievementToast(game, def);
      sfxAchievementUnlock();
    }
  });
  renderRunAchievements();
}

function applyAchievementsPayload(payload) {
  if (!payload) return;
  const definitions = payload.definitions?.length ? payload.definitions : (net.achievements?.definitions || ACHIEVEMENTS);
  const state = normalizeAchievementState(payload.state || payload);
  net.achievements = { definitions, state };
  if (net.user) net.user.achievements = state;
  renderAchievements({ definitions, state });
  notifyAchievements(payload.unlocked);
  updateGameOverStats({ achievementsState: state, skillTotals: net.user?.skillTotals });
}

function notifyAchievements(unlockedIds = []) {
  if (!unlockedIds?.length) return;
  const shouldPopup = game?.state === 1 /* PLAY */ && !tutorial?.active;
  recordRunAchievements(unlockedIds, { showPopup: shouldPopup });
}

function resetRunAchievements() {
  runAchievementIds = new Set();
  runAchievementDefs = [];
  const base = net.user?.achievements || net.achievements?.state || null;
  runAchievementBaseState = normalizeAchievementState(base || {});
  renderRunAchievements();
}

function checkRunAchievements() {
  if (!runAchievementBaseState || game?.state !== 1 /* PLAY */ || tutorial?.active) return;
  const runStats = game.getRunStats ? game.getRunStats() : null;
  if (!runStats) return;
  const { unlocked } = evaluateRunForAchievements({
    previous: runAchievementBaseState,
    runStats,
    score: runStats.totalScore,
    totalScore: net.user?.totalScore,
    bestScore: net.user?.bestScore,
    now: Date.now()
  });
  if (!unlocked?.length) return;
  const newIds = unlocked.filter((id) => !runAchievementIds.has(id));
  if (!newIds.length) return;
  recordRunAchievements(newIds, { showPopup: true });
}

achievementsHideCompleted?.addEventListener("change", () => {
  renderAchievements();
});

[achievementsFilterScore, achievementsFilterPerfects, achievementsFilterOrbs, achievementsFilterPipes].forEach((input) => {
  input?.addEventListener("change", () => renderAchievements());
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
  markSkillOptionSelection(dashBehaviorOptions, normalized.dashBehavior);
  markSkillOptionSelection(teleportBehaviorOptions, normalized.teleportBehavior);
  markSkillOptionSelection(invulnBehaviorOptions, normalized.invulnBehavior);
  markSkillOptionSelection(slowFieldBehaviorOptions, normalized.slowFieldBehavior);
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
      setNetUser(res.user);
      setUserHint();
    }
  }
}

// ---- Server refresh ----
async function refreshProfileAndHighscores({ keepUserOnFailure = false } = {}) {
  const me = await apiGetMe();
  if (!me?.ok) {
    net.online = false;
    if (!keepUserOnFailure) {
      setNetUser(null);
    }
    syncIconCatalog(net.icons || playerIcons);
    net.achievements = { definitions: ACHIEVEMENTS, state: normalizeAchievementState() };
  } else {
    net.online = true;
    setNetUser(me.user || null);
    net.trails = normalizeTrails(me.trails || net.trails);
    syncUnlockablesCatalog({ trails: net.trails });
    syncIconCatalog(me.icons || net.icons);
    syncPipeTextureCatalog(me.pipeTextures || net.pipeTextures);
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
  const { selected, best } = refreshTrailMenu();
  const iconId = applyIconSelection(net.user?.selectedIcon || currentIconId, playerIcons);
  currentPipeTextureMode = normalizePipeTextureMode(net.user?.pipeTextureMode || currentPipeTextureMode);
  writePipeTextureModeCookie(currentPipeTextureMode);
  const pipeTextureId = net.user?.selectedPipeTexture || currentPipeTextureId;
  const { selected: pipeSelected } = refreshPipeTextureMenu(pipeTextureId);
  applyPipeTextureSelection(pipeSelected || pipeTextureId, net.pipeTextures);
  syncMenuProfileBindingsFromState({
    fallbackTrailId: selected,
    fallbackIconId: iconId,
    fallbackPipeTextureId: pipeSelected || pipeTextureId,
    bestScoreFallback: best
  });
  renderHighscoresUI();
  renderAchievements();
  renderBindUI();
  refreshBootUI();
}

async function recoverSession() {
  await refreshProfileAndHighscores({ keepUserOnFailure: true });
  return Boolean(net.user);
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
    setNetUser(res.user);
    net.trails = normalizeTrails(res.trails || net.trails);
    syncUnlockablesCatalog({ trails: net.trails });
    syncUnlockablesCatalog({ trails: net.trails });
    syncIconCatalog(res.icons || net.icons);
    syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
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

async function playReplay({ captureMode = "none", run: replayRun = activeRun } = {}) {
  // NEW: ensure gameplay music is OFF during replay playback/capture
  musicStop();

  if (!replayRun || !replayRun.ended || !replayRun.ticks || !replayRun.ticks.length) {
    if (replayStatus) {
      replayStatus.className = "hint bad";
      replayStatus.textContent = "No replay available yet (finish a run first).";
    }
    return null;
  }
  replayDriving = true;
  try {
    const replayRandSource = chooseReplayRandSource(replayRun, {
      tapePlayer: createTapeRandPlayer,
      seededRand: createSeededRand
    });
    if (replayRandSource) {
      setRandSource(replayRandSource);
    }
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

    const replaySimDt = SIM_DT;

    await playbackTicks({
      ticks: replayRun.ticks,
      game,
      replayInput,
      captureMode,
      simDt: replaySimDt,
      requestFrame: requestAnimationFrame
    });

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

function cloneActiveRun(run) {
  if (!run) return null;
  return {
    ...run,
    ticks: Array.isArray(run.ticks) ? run.ticks.slice() : [],
    rngTape: Array.isArray(run.rngTape) ? run.rngTape.slice() : []
  };
}

async function uploadBestRunArtifacts(finalScore, runStats) {
  if (!net.user || !activeRun?.ended) return;
  const bestScore = net.user?.bestScore ?? 0;
  if (finalScore < bestScore) return;
  if (lastUploadedBestSeed === activeRun.seed && lastUploadedBestScore >= bestScore) return;

  const runForUpload = cloneActiveRun(activeRun);
  if (!runForUpload?.ticks?.length) return;

  const uploaded = await maybeUploadBestRun({
    activeRun: runForUpload,
    finalScore,
    runStats,
    bestScore,
    upload: apiUploadBestRun,
    logger: (msg) => {
      if (!replayStatus) return;
      replayStatus.className = "hint";
      replayStatus.textContent = msg;
    }
  });

  if (uploaded) {
    lastUploadedBestSeed = activeRun.seed;
    lastUploadedBestScore = bestScore;
    if (replayStatus) {
      replayStatus.className = "hint good";
      replayStatus.textContent = "Best run saved to server.";
    }
  }
}

// ---- Cosmetics selection ----
trailLauncher?.addEventListener("click", () => {
  refreshTrailMenu(currentTrailId);
  toggleTrailMenu(trailOverlay, true);
});

trailOverlayClose?.addEventListener("click", () => {
  toggleTrailMenu(trailOverlay, false);
  if (lastTrailHint) setTrailHint(lastTrailHint, { persist: false });
});

trailOverlay?.addEventListener("click", (e) => {
  if (e.target === trailOverlay) {
    toggleTrailMenu(trailOverlay, false);
    if (lastTrailHint) setTrailHint(lastTrailHint, { persist: false });
  }
});

trailOptions?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-trail-id]");
  if (!btn) return;
  const id = btn.dataset.trailId;
  const ordered = sortTrailsForDisplay(net.trails, { isRecordHolder: Boolean(net.user?.isRecordHolder) });
  const unlocked = computeUnlockedTrailSet(ordered);
  const best = net.user ? (net.user.bestScore | 0) : readLocalBest();
  const targetTrail = ordered.find((t) => t.id === id) || { id, name: id };

  if (!unlocked.has(id)) {
    if (btn.dataset.unlockType === "purchase") {
      openPurchaseModal({
        id,
        name: targetTrail.name || id,
        type: UNLOCKABLE_TYPES.trail,
        unlock: {
          type: "purchase",
          cost: Number(btn.dataset.unlockCost || 0),
          currencyId: btn.dataset.unlockCurrency || DEFAULT_CURRENCY_ID
        }
      }, { source: "trail" });
      return;
    }
    const lockText = btn.dataset.statusText
      || describeTrailLock(targetTrail, {
        unlocked: false,
        bestScore: best,
        isRecordHolder: Boolean(net.user?.isRecordHolder)
      });
    refreshTrailMenu(currentTrailId);
    setTrailHint({ className: "hint bad", text: lockText }, { persist: false });
    return;
  }

  if (net.user) {
    setNetUser({ ...net.user, selectedTrail: id });
  }
  applyTrailSelection(id, ordered);
  refreshTrailMenu(id);
  setTrailHint({
    className: net.user ? "hint" : "hint good",
    text: net.user ? "Saving trail choice…" : "Equipped (guest mode)."
  }, { persist: Boolean(net.user) });

  if (!net.user) return;

  const res = await apiSetTrail(id);
  await handleTrailSaveResponse({
    res,
    net,
    orderedTrails: ordered,
    selectedTrailId: id,
    currentTrailId,
    currentIconId,
    playerIcons,
    setNetUser,
    setUserHint,
    setTrailHint,
    buildTrailHint,
    normalizeTrails,
    syncUnlockablesCatalog,
    syncIconCatalog,
    syncPipeTextureCatalog,
    refreshTrailMenu,
    applyIconSelection,
    readLocalBest,
    getAuthStatusFromResponse,
    recoverSession
  });
});

trailOptions?.addEventListener("mouseover", (e) => {
  const btn = e.target.closest("button[data-trail-id]");
  if (!btn) return;
  const id = btn.dataset.trailId;
  const trail = net.trails.find((item) => item.id === id) || { id, name: btn.dataset.trailName || id };
  const best = net.user ? (net.user.bestScore | 0) : readLocalBest();
  const unlocked = computeUnlockedTrailSet(net.trails).has(id);
  const lockText = btn.dataset.statusText
    || describeTrailLock(trail, { unlocked, bestScore: best, isRecordHolder: Boolean(net.user?.isRecordHolder) });
  const text = trailHoverText(trail, { unlocked, lockText });
  setTrailHint({ className: unlocked ? "hint good" : "hint", text }, { persist: false });
});

trailOptions?.addEventListener("mouseout", (e) => {
  if (!e.relatedTarget || !trailOptions.contains(e.relatedTarget)) {
    setTrailHint(lastTrailHint || { className: "hint", text: DEFAULT_TRAIL_HINT }, { persist: false });
  }
});

pipeTextureLauncher?.addEventListener("click", () => {
  refreshPipeTextureMenu(currentPipeTextureId);
  togglePipeTextureMenu(pipeTextureOverlay, true);
});

const closePipeTextureOverlay = () => {
  togglePipeTextureMenu(pipeTextureOverlay, false);
  if (pipeTextureHint) {
    pipeTextureHint.className = "hint";
    pipeTextureHint.textContent = DEFAULT_PIPE_TEXTURE_HINT;
  }
};

pipeTextureOverlay?.addEventListener("click", (e) => {
  if (shouldClosePipeTextureMenu(e, { overlay: pipeTextureOverlay })) {
    closePipeTextureOverlay();
  }
});

pipeTextureModeOptions?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-pipe-texture-mode]");
  if (!btn) return;
  const nextMode = normalizePipeTextureMode(btn.dataset.pipeTextureMode);
  if (nextMode === currentPipeTextureMode) return;
  const previous = currentPipeTextureMode;
  currentPipeTextureMode = nextMode;
  writePipeTextureModeCookie(currentPipeTextureMode);
  renderPipeTextureModeButtons(currentPipeTextureMode);
  syncPipeTextureSwatch(currentPipeTextureId, net.pipeTextures);
  renderPipeTextureMenuOptions(currentPipeTextureId, computeUnlockedPipeTextureSet(net.pipeTextures), net.pipeTextures);

  if (!net.user) return;

  const res = await apiSetPipeTexture(currentPipeTextureId, currentPipeTextureMode);
  if (!res || !res.ok) {
    const authStatus = getAuthStatusFromResponse(res);
    net.online = authStatus.online;
    if (authStatus.unauthorized) {
      await recoverSession();
    }
    if (!authStatus.online || !net.user) {
      setUserHint();
    }
    currentPipeTextureMode = previous;
    writePipeTextureModeCookie(currentPipeTextureMode);
    renderPipeTextureModeButtons(currentPipeTextureMode);
    syncPipeTextureSwatch(currentPipeTextureId, net.pipeTextures);
    if (pipeTextureHint) {
      pipeTextureHint.className = "hint bad";
      pipeTextureHint.textContent = res?.error === "pipe_texture_locked"
        ? "That mode is locked with this texture."
        : "Could not save pipe texture mode.";
    }
    return;
  }

  setNetUser(res.user);
  syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
  currentPipeTextureMode = normalizePipeTextureMode(res.user?.pipeTextureMode || currentPipeTextureMode);
  writePipeTextureModeCookie(currentPipeTextureMode);
  renderPipeTextureModeButtons(currentPipeTextureMode);
  syncPipeTextureSwatch(currentPipeTextureId, net.pipeTextures);
  if (pipeTextureHint) {
    pipeTextureHint.className = "hint good";
    pipeTextureHint.textContent = "Pipe texture mode saved.";
  }
});

pipeTextureOptions?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-pipe-texture-id]");
  if (!btn) return;
  const id = btn.dataset.pipeTextureId;
  const unlocked = computeUnlockedPipeTextureSet(net.pipeTextures);
  if (!unlocked.has(id)) {
    if (btn.dataset.unlockType === "purchase") {
      const texture = net.pipeTextures.find((t) => t.id === id) || { id, name: id, unlock: {} };
      openPurchaseModal({
        id,
        name: texture.name || id,
        type: UNLOCKABLE_TYPES.pipeTexture,
        unlock: {
          type: "purchase",
          cost: Number(btn.dataset.unlockCost || 0),
          currencyId: btn.dataset.unlockCurrency || DEFAULT_CURRENCY_ID
        }
      }, { source: "pipe_texture" });
      return;
    }
    if (pipeTextureHint) {
      pipeTextureHint.className = "hint bad";
      pipeTextureHint.textContent = describePipeTextureLock(
        net.pipeTextures.find((t) => t.id === id) || { unlock: {} },
        { unlocked: false }
      );
    }
    renderPipeTextureMenuOptions(currentPipeTextureId, unlocked, net.pipeTextures);
    return;
  }

  const previous = currentPipeTextureId;
  applyPipeTextureSelection(id, net.pipeTextures, unlocked);
  if (pipeTextureHint) {
    pipeTextureHint.className = net.user ? "hint" : "hint good";
    pipeTextureHint.textContent = net.user ? "Saving pipe texture…" : "Equipped (guest mode).";
  }

  if (!net.user) return;

  const res = await apiSetPipeTexture(id, currentPipeTextureMode);
  if (!res || !res.ok) {
    const authStatus = getAuthStatusFromResponse(res);
    net.online = authStatus.online;
    if (authStatus.unauthorized) {
      await recoverSession();
    }
    if (!authStatus.online || !net.user) {
      setUserHint();
    }
    applyPipeTextureSelection(previous, net.pipeTextures, unlocked);
    if (pipeTextureHint) {
      pipeTextureHint.className = "hint bad";
      pipeTextureHint.textContent = res?.error === "pipe_texture_locked"
        ? "That pipe texture is locked."
        : "Could not save pipe texture.";
    }
    return;
  }

  setNetUser(res.user);
  syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
  currentPipeTextureMode = normalizePipeTextureMode(res.user?.pipeTextureMode || currentPipeTextureMode);
  applyPipeTextureSelection(res.user?.selectedPipeTexture || id, net.pipeTextures, computeUnlockedPipeTextureSet(net.pipeTextures));
  if (pipeTextureHint) {
    pipeTextureHint.className = "hint good";
    pipeTextureHint.textContent = "Pipe texture saved.";
  }
});

pipeTextureOptions?.addEventListener("mouseover", (e) => {
  const btn = e.target.closest("button[data-pipe-texture-id]");
  if (!btn) return;
  const id = btn.dataset.pipeTextureId;
  const texture = net.pipeTextures.find((t) => t.id === id);
  const unlocked = computeUnlockedPipeTextureSet(net.pipeTextures).has(id);
  if (pipeTextureHint) {
    pipeTextureHint.className = unlocked ? "hint good" : "hint";
    pipeTextureHint.textContent = pipeTextureHoverText(texture, { unlocked });
  }
});

pipeTextureOptions?.addEventListener("mouseout", (e) => {
  if (!e.relatedTarget || !pipeTextureOptions.contains(e.relatedTarget)) {
    if (pipeTextureHint) {
      pipeTextureHint.className = "hint";
      pipeTextureHint.textContent = DEFAULT_PIPE_TEXTURE_HINT;
    }
  }
});

iconOptions?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-icon-id]");
  if (!btn) return;
  const id = btn.dataset.iconId;
  const unlocked = computeUnlockedIconSet(playerIcons);
  if (!unlocked.has(id)) {
    if (btn.dataset.unlockType === "purchase") {
      const icon = playerIcons.find((i) => i.id === id) || { id, name: id, unlock: {} };
      openPurchaseModal({
        id,
        name: icon.name || id,
        type: UNLOCKABLE_TYPES.playerTexture,
        unlock: {
          type: "purchase",
          cost: Number(btn.dataset.unlockCost || 0),
          currencyId: btn.dataset.unlockCurrency || DEFAULT_CURRENCY_ID
        }
      }, { source: "icon" });
      return;
    }
    if (iconHint) {
      iconHint.className = "hint bad";
      iconHint.textContent = describeIconLock(playerIcons.find((i) => i.id === id) || { unlock: {} }, { unlocked: false });
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

  if (outcome.needsReauth) {
    await recoverSession();
  }

  if (outcome.outcome === "saved" && res) {
    setNetUser(res.user);
    net.trails = normalizeTrails(res.trails || net.trails);
    syncUnlockablesCatalog({ trails: net.trails });
    syncIconCatalog(res.icons || net.icons);
    syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
    applyIconSelection(res.user?.selectedIcon || id, playerIcons);
  } else if (outcome.revert) {
    applyIconSelection(previous, playerIcons);
  }

  if (!outcome.online || !net.user) {
    setUserHint();
  }

  if (iconHint) {
    iconHint.className = outcome.outcome === "saved" ? "hint good" : "hint bad";
    iconHint.textContent = outcome.message;
  }
});

iconOptions?.addEventListener("mouseover", (e) => {
  const btn = e.target.closest("button[data-icon-id]");
  if (!btn) return;
  const id = btn.dataset.iconId;
  const icon = playerIcons.find((i) => i.id === id);
  const unlocked = computeUnlockedIconSet(playerIcons).has(id);
  if (iconHint) {
    iconHint.className = unlocked ? "hint good" : "hint";
    iconHint.textContent = iconHoverText(icon, { unlocked, lockText: btn.dataset.statusText });
  }
});

iconOptions?.addEventListener("mouseout", (e) => {
  if (!e.relatedTarget || !iconOptions.contains(e.relatedTarget)) {
    resetIconHint(iconHint);
  }
});

iconLauncher?.addEventListener("click", () => {
  renderIconOptions(currentIconId, computeUnlockedIconSet(playerIcons), playerIcons);
  toggleIconMenu(iconOverlay, true);
});

iconOverlayClose?.addEventListener("click", () => {
  toggleIconMenu(iconOverlay, false);
  resetIconHint(iconHint);
});

iconOverlay?.addEventListener("click", (e) => {
  if (e.target === iconOverlay) {
    toggleIconMenu(iconOverlay, false);
    resetIconHint(iconHint);
  }
});

const toggleThemeOverlay = (open) => {
  if (!themeOverlay) return;
  themeOverlay.classList.toggle("hidden", !open);
  themeOverlay.setAttribute("aria-hidden", open ? "false" : "true");
};

themeLauncher?.addEventListener("click", () => toggleThemeOverlay(true));
themeOverlayClose?.addEventListener("click", () => toggleThemeOverlay(false));
themeOverlay?.addEventListener("click", (e) => {
  if (e.target === themeOverlay) toggleThemeOverlay(false);
});

shopLauncher?.addEventListener("click", () => toggleShopOverlay(true));
shopOverlayClose?.addEventListener("click", () => toggleShopOverlay(false));
shopOverlay?.addEventListener("click", (e) => {
  if (e.target === shopOverlay) toggleShopOverlay(false);
});
shopTabs?.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-shop-type]");
  if (!btn) return;
  renderShopCategory(btn.dataset.shopType);
});

purchaseModalClose?.addEventListener("click", closePurchaseModal);
purchaseModalCancel?.addEventListener("click", closePurchaseModal);
purchaseModalConfirm?.addEventListener("click", confirmPendingPurchase);
purchaseModal?.addEventListener("click", (e) => {
  if (e.target === purchaseModal) closePurchaseModal();
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
      setNetUser(res.user);
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

bindSkillOptionGroup(dashBehaviorOptions, (value) => {
  updateSkillSettings({ ...skillSettings, dashBehavior: value });
});
bindSkillOptionGroup(teleportBehaviorOptions, (value) => {
  updateSkillSettings({ ...skillSettings, teleportBehavior: value });
});
bindSkillOptionGroup(invulnBehaviorOptions, (value) => {
  updateSkillSettings({ ...skillSettings, invulnBehavior: value });
});
bindSkillOptionGroup(slowFieldBehaviorOptions, (value) => {
  updateSkillSettings({ ...skillSettings, slowFieldBehavior: value });
});

overStatsToggle?.addEventListener("click", () => {
  const nextView = currentStatsView === GAME_OVER_STAT_VIEWS.lifetime ? GAME_OVER_STAT_VIEWS.run : GAME_OVER_STAT_VIEWS.lifetime;
  updateGameOverStats({ view: nextView, runStats: lastRunStats, achievementsState: net.user?.achievements, skillTotals: net.user?.skillTotals });
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
  if (e.code === "Escape" && trailOverlay && !trailOverlay.classList.contains("hidden")) {
    e.preventDefault();
    toggleTrailMenu(trailOverlay, false);
    if (lastTrailHint) setTrailHint(lastTrailHint, { persist: false });
    return;
  }
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

  resumeTrailPreview(net.user?.selectedTrail || currentTrailId || "classic");
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
  resetRunAchievements();
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
  resetRunAchievements();
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
  if (overDuration) overDuration.textContent = formatRunDuration(runStats?.runTime);
  lastRunStats = runStats;
  currentStatsView = GAME_OVER_STAT_VIEWS.run;
  renderScoreBreakdown(scoreBreakdown, runStats, finalScore);
  updatePersonalBestUI(finalScore, net.user?.bestScore);
  updateGameOverStats({ view: currentStatsView, runStats, achievementsState: net.user?.achievements, skillTotals: net.user?.skillTotals });

  over.classList.remove("hidden");

  if (net.user) {
    const coinsEarned = game?.bustercoinsEarned || 0;
    const optimistic = applyBustercoinEarnings(net, coinsEarned, {
      onUserUpdate: (nextUser) => setNetUser(nextUser)
    });
    const res = await apiSubmitScore({
      score: finalScore | 0,
      bustercoinsEarned: coinsEarned,
      runStats
    });
    if (res && res.ok && res.user) {
      net.online = true;
      setNetUser(res.user);
      net.trails = normalizeTrails(res.trails || net.trails);
      syncUnlockablesCatalog({ trails: net.trails });
      syncIconCatalog(res.icons || net.icons);
      syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
      net.highscores = res.highscores || net.highscores;
      applyAchievementsPayload(res.achievements || { definitions: ACHIEVEMENTS, state: res.user?.achievements });

      refreshTrailMenu();
      setUserHint();
      currentPipeTextureMode = normalizePipeTextureMode(res.user?.pipeTextureMode || currentPipeTextureMode);
      applyPipeTextureSelection(res.user?.selectedPipeTexture || currentPipeTextureId, net.pipeTextures);
      applyIconSelection(res.user?.selectedIcon || currentIconId, playerIcons);
      renderHighscoresUI();
      renderAchievements();

      updatePersonalBestUI(finalScore, net.user.bestScore);
      updateGameOverStats({ runStats, achievementsState: net.user.achievements, skillTotals: net.user?.skillTotals });
    } else {
      if (optimistic.applied && net.user?.bustercoins !== undefined) {
        // Preserve optimistic balance locally so the menu reflects the run's pickups even if the
        // score submission failed (e.g., offline). A later refresh will reconcile with the server.
        syncMenuProfileBindingsFromState();
      }
      net.online = false;

      // Try to re-hydrate the session so subsequent runs can still submit.
      await refreshProfileAndHighscores();

      // Keep PB display meaningful even if the submission failed.
      updatePersonalBestUI(finalScore, net.user?.bestScore);
      updateGameOverStats({ runStats, achievementsState: net.user?.achievements, skillTotals: net.user?.skillTotals });
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
    if (watchReplayBtn) {
      watchReplayBtn.disabled = false;
      watchReplayBtn.classList.remove("hidden");
    }
  }

  // Async: record canvas + replay JSON for personal-best runs
  if (net.user) {
    uploadBestRunArtifacts(finalScore, runStats).catch((err) => {
      console.warn("Failed to upload best run", err);
    });
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
      checkRunAchievements();
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
  updateSkillCooldownUI(CFG);
  initThemeEditor({
    refs: {
      themeLauncher,
      themeOverlay,
      themeOverlayClose,
      themePresetSelect,
      themeResetBtn,
      themeRandomizeBtn,
      themeRandomAccentBtn,
      themePaletteRow,
      themeEditor,
      themeExportField,
      themeExportBtn,
      themeImportBtn,
      themeStatus
    },
    config: CFG,
    onApply: (values) => {
      if (!game.cfg?.pipes?.colors) return;
      game.cfg.pipes.colors = {
        green: values.pipeGreen,
        blue: values.pipeBlue,
        wisteria: values.pipeWisteria,
        red: values.pipeRed
      };
    }
  });

  game.resizeToWindow();
  game.setStateMenu();
  renderBindUI();

  await refreshProfileAndHighscores();
  refreshBootUI();

  resumeTrailPreview(net.user?.selectedTrail || currentTrailId || "classic");
  requestAnimationFrame((t) => {
    lastTs = t;
    requestAnimationFrame(frame);
  });
})();
