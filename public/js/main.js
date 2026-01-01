// =====================
// FILE: public/js/main.js
// =====================
import { DEFAULT_CONFIG, loadConfig } from "./config.js";
import { DEFAULT_SKILL_SETTINGS, normalizeSkillSettings, skillSettingsEqual } from "./settings.js";
import {
  apiGetMe,
  apiRegister,
  apiGetHighscores,
  apiGetStats,
  apiSetTrail,
  apiSetIcon,
  apiSetPipeTexture,
  apiSubmitScore,
  apiPurchaseUnlockable,
  apiGetBestRun,
  apiListBestRuns,
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
import { applyVolumeFromUI, primeVolumeUI } from "./audioVolumeControls.js";
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
import { updatePersonalBestUI } from "./personalBestUI.js";
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
import {
  filterReplayEntries,
  normalizeReplayFilters,
  renderReplayBrowserList,
  sortReplayEntries
} from "./replayBrowser.js";
import { getAuthStatusFromResponse } from "./authResponse.js";
import {
  DEFAULT_TRAIL_HINT,
  describeTrailLock,
  renderTrailOptions as renderTrailMenuOptions,
  trailHoverText,
  toggleTrailMenu
} from "./trailMenu.js";
import { SHOP_TABS, getPurchasableUnlockablesByType, renderShopItems } from "./shopMenu.js";
import { playbackTicks, playbackTicksDeterministic } from "./replayUtils.js";
import { createReplayManager, cloneReplayRun } from "./replayManager.js";
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
import { OFFLINE_STATUS_TEXT, SIGNED_OUT_TEXT } from "./userStatusCopy.js";
import { applyNetUserUpdate } from "./netUser.js";
import { handleTrailSaveResponse } from "./trailSaveResponse.js";
import { readSessionUsername } from "./session.js";
import { recoverUserFromUsername } from "./sessionRecovery.js";
import { formatWorldwideRuns } from "./worldwideStats.js";
import {
  resolveReauthUsername,
  shouldTriggerGuestSave,
  shouldTriggerSelectionSave,
  shouldUpdateTrailHint,
  shouldAttemptReauth,
  shouldAttemptReauthForGuestHint
} from "./userHintRecovery.js";
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

import { handleMenuEscape } from "./menuEscapeHandler.js";
import { initSocialDock } from "./socialDock.js";


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
  replayModal,
  replayModalTitle,
  replayModalStatus,
  replayModalClose,
  replayModalCanvasSlot,
  replayModalPlayToggle,
  replayModalRestart,
  replayModalStop,
  replayModalProgress,
  replayModalProgressBar,
  replayBrowserLauncher,
  replayBrowserModal,
  replayBrowserTitle,
  replayBrowserClose,
  replayBrowserSearch,
  replayBrowserSearchButton,
  replayBrowserMinScore,
  replayBrowserMaxScore,
  replayBrowserMinDuration,
  replayBrowserMaxDuration,
  replayBrowserSort,
  replayBrowserRefresh,
  replayBrowserClear,
  replayBrowserList,
  replayBrowserStatus,
  achievementsList,
  achievementsHideCompleted,
  achievementsFilterScore,
  achievementsFilterPerfects,
  achievementsFilterOrbs,
  achievementsFilterPipes,
  achievementToasts,
  socialDock,
  discordButton,
  donateButton,
  discordPopover,
  donatePopover,
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
  setMenuSubtitle,
  updateSkillCooldowns
} = ui;

// ---- Local best fallback cookie (legacy support) ----
function updatePersonalBestUIWrapper(finalScore, userBestScore) {
  updatePersonalBestUI({
    finalScore,
    userBestScore,
    elements: {
      personalBestEl: overPB,
      badgeEl: overPbBadge,
      statusEl: overPbStatus
    },
    readLocalBest,
    writeLocalBest,
    computePersonalBestStatus,
    updatePersonalBestElements
  });
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
  bestScoreFallback: 0
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

// Replay / run capture (managed via replayManager)
let lastUploadedBestSeed = null;
let lastUploadedBestScore = -Infinity;

// Tutorial manager (initialized after Game is created, but referenced by the Input callback).
let tutorial = null;
let replayManager = null;
let replayBrowserRuns = [];
let replayBrowserLoading = false;
let replayPlaybackState = null;
let replayCanvasHome = null;


// Seed of the most recently finished run (used for "Retry Previous Seed")
let lastEndedSeed = "";

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

function handleVolumeChange() {
  applyVolumeFromUI({
    musicSlider,
    sfxSlider,
    muteToggle,
    defaults: DEFAULT_AUDIO,
    setMusicVolume,
    setSfxVolume,
    setMuted,
    writeAudioSettings,
    game
  });
}

function primeVolumeControls() {
  primeVolumeUI({
    musicSlider,
    sfxSlider,
    muteToggle,
    readAudioSettings,
    defaults: DEFAULT_AUDIO
  });
  handleVolumeChange();
}

const volumeChangeHandler = () => handleVolumeChange();
musicSlider?.addEventListener("input", volumeChangeHandler);
sfxSlider?.addEventListener("input", volumeChangeHandler);
muteToggle?.addEventListener("change", volumeChangeHandler);
applySkillSettingsToUI(skillSettings);
initSocialDock({
  discordButton,
  donateButton,
  discordPopover,
  donatePopover,
  dock: socialDock,
  document
});

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
  if (game.state === 1 /* PLAY */) {
    replayManager?.queueAction({
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

replayManager = createReplayManager({
  canvas,
  game,
  input,
  menu,
  over,
  setRandSource,
  tapeRecorder: createTapeRandRecorder,
  tapePlayer: createTapeRandPlayer,
  seededRand: createSeededRand,
  playbackTicks,
  playbackTicksDeterministic,
  simDt: SIM_DT,
  requestFrame: requestAnimationFrame,
  stopMusic: musicStop,
  onStatus: (payload) => {
    if (!replayStatus || !payload) return;
    replayStatus.className = payload.className || "hint";
    replayStatus.textContent = payload.text || "";
  },
  step: driver ? (dt, actions) => driver.step(dt, actions) : null
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
  bestScoreFallback = net.user ? (net.user.bestScore | 0) : 0
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

let reauthInProgress = false;
let guestSaveTriggered = false;

function setUserHint() {
  const best = net.user ? (net.user.bestScore | 0) : 0;
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
  const username = resolveReauthUsername({
    inputValue: usernameInput?.value,
    sessionUsername: readSessionUsername()
  });
  const shouldReauth = shouldAttemptReauth({
    hintText: hint.text,
    username,
    inFlight: reauthInProgress
  }) || shouldAttemptReauthForGuestHint({
    hintText: authTrailHint?.text,
    username,
    inFlight: reauthInProgress
  });

  if (shouldReauth) {
    reauthInProgress = true;
    ensureLoggedInForSave()
      .then((recovered) => {
        if (recovered) setUserHint();
      })
      .finally(() => {
        reauthInProgress = false;
      });
  }
  if (offlineStatus) {
    offlineStatus.textContent = OFFLINE_STATUS_TEXT;
    offlineStatus.classList.toggle("hidden", net.online);
  }
  if (trailHint && authTrailHint?.text) {
    const current = trailHint.textContent;
    if (shouldUpdateTrailHint({ currentText: current, nextText: authTrailHint.text })) {
      setTrailHint(authTrailHint);
    }
  }
  syncMenuProfileBindingsFromState();
}

async function playReplayRunInModal({ run, title, label } = {}) {
  if (!run) return false;
  if (!replayManager) return false;
  const controller = createReplayPlaybackController();
  replayPlaybackState = {
    controller,
    run,
    title,
    label,
    restartRequested: false,
    stopRequested: false
  };

  moveCanvasToReplayModal();
  setReplayModalProgress({ tickIndex: 0, ticksLength: run.ticks?.length || 0 });
  setReplayModalControlsState({ playing: true, paused: false });
  updateReplayModal({
    title,
    text: `Playing ${label || "replay"}…`,
    className: "hint",
    canClose: false
  });

  const playOnce = async () => replayManager.play({
    captureMode: "none",
    run,
    playbackMode: "deterministic",
    hideUI: false,
    shouldPause: controller.shouldPause,
    waitForResume: controller.waitForResume,
    shouldStop: controller.shouldStop,
    onProgress: ({ tickIndex, ticksLength }) => setReplayModalProgress({ tickIndex, ticksLength })
  });

  while (true) {
    controller.reset();
    await playOnce();
    if (replayPlaybackState?.stopRequested) break;
    if (replayPlaybackState?.restartRequested) {
      replayPlaybackState.restartRequested = false;
      continue;
    }
    break;
  }

  const stopped = Boolean(replayPlaybackState?.stopRequested);
  replayPlaybackState = null;
  setReplayModalControlsState({ playing: false, paused: false });
  updateReplayModal({
    title,
    text: stopped ? "Replay stopped." : "Replay finished.",
    className: stopped ? "hint" : "hint good",
    canClose: true
  });
  restoreReplayCanvas();
  return !stopped;
}

async function playReplayByUsername(username) {
  if (!username) return;
  if (replayManager?.isReplaying()) {
    toggleReplayModal(true);
    updateReplayModal({
      title: "Replay",
      text: "A replay is already in progress.",
      className: "hint bad",
      canClose: true
    });
    return;
  }

  const modalTitle = `Replay: ${username}`;
  toggleReplayModal(true);
  setReplayModalControlsState({ playing: false, paused: false });
  updateReplayModal({
    title: modalTitle,
    text: `Loading ${username}'s best run…`,
    className: "hint",
    canClose: false
  });

  pauseTrailPreview();
  setUIMode(false);
  try {
    const res = await apiGetBestRun(username);
    if (!res?.ok || !res.run) {
      updateReplayModal({
        title: modalTitle,
        text: "Replay not available for this player.",
        className: "hint bad",
        canClose: true
      });
      return;
    }
    const playbackRun = hydrateBestRunPayload(res.run);
    if (!playbackRun) {
      updateReplayModal({
        title: modalTitle,
        text: "Replay data is invalid.",
        className: "hint bad",
        canClose: true
      });
      return;
    }

    await playReplayRunInModal({
      run: playbackRun,
      title: modalTitle,
      label: `${username}'s best run`
    });
  } catch (err) {
    console.error(err);
    updateReplayModal({
      title: modalTitle,
      text: "Unable to play the selected replay.",
      className: "hint bad",
      canClose: true
    });
  } finally {
    const menuVisible = !menu?.classList?.contains("hidden");
    const overVisible = !over?.classList?.contains("hidden");
    setUIMode(Boolean(menuVisible || overVisible));
    if (menuVisible) {
      resumeTrailPreview(net.user?.selectedTrail || currentTrailId || "classic");
    } else {
      pauseTrailPreview();
    }
  }
}

async function handlePlayHighscore(username) {
  await playReplayByUsername(username);
}

async function handleReplayBrowserPlay(entry) {
  const username = entry?.username || "";
  toggleReplayBrowserModal(false);
  await playReplayByUsername(username);
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
  const normalized = normalizePlayerIcons(nextIcons || playerIcons, { allowEmpty: true });
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
  const normalized = normalizePipeTextures(nextTextures || net.pipeTextures, { allowEmpty: true });
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
  const best = net.user ? (net.user.bestScore | 0) : 0;
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
  const owned = getOwnedUnlockables(net.user);
  return new Set(getUnlockedTrails(trails, achievements, { isRecordHolder, ownedIds: owned }));
}

function computeUnlockedPipeTextureSet(textures = net.pipeTextures) {
  const best = net.user ? (net.user.bestScore | 0) : 0;
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
    const current = trailHint.textContent;
    const nextText = hint?.text;
    if (shouldTriggerGuestSave({
      currentText: current,
      nextText,
      alreadyTriggered: guestSaveTriggered
    })) {
      guestSaveTriggered = true;
      saveUserBtn?.click?.();
    } else if (nextText !== GUEST_TRAIL_HINT_TEXT) {
      guestSaveTriggered = false;
    }
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
  const best = net.user ? (net.user.bestScore | 0) : 0;
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
    bestScore: net.user ? (net.user.bestScore | 0) : 0,
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

function toggleReplayModal(open) {
  if (!replayModal) return;
  replayModal.classList.toggle("hidden", !open);
  replayModal.setAttribute("aria-hidden", open ? "false" : "true");
}

function toggleReplayBrowserModal(open) {
  if (!replayBrowserModal) return;
  replayBrowserModal.classList.toggle("hidden", !open);
  replayBrowserModal.setAttribute("aria-hidden", open ? "false" : "true");
}

function updateReplayModal({ title, text, className = "hint", canClose = true } = {}) {
  if (replayModalTitle && title) {
    replayModalTitle.textContent = title;
  }
  if (replayModalStatus) {
    replayModalStatus.className = className;
    replayModalStatus.textContent = text || "";
  }
  if (replayModalClose) {
    replayModalClose.disabled = !canClose;
  }
}

function updateReplayBrowserStatus({ text, className = "hint" } = {}) {
  if (!replayBrowserStatus) return;
  replayBrowserStatus.className = className;
  replayBrowserStatus.textContent = text || "";
}

function closeReplayModal() {
  if (replayManager?.isReplaying()) return;
  toggleReplayModal(false);
}

function closeReplayBrowserModal() {
  toggleReplayBrowserModal(false);
}

function setReplayModalProgress({ tickIndex = 0, ticksLength = 0 } = {}) {
  if (!replayModalProgress || !replayModalProgressBar) return;
  const total = Math.max(1, Number(ticksLength) || 0);
  const current = Math.min(total, Math.max(0, Number(tickIndex) || 0));
  const ratio = Math.min(1, current / total);
  replayModalProgress.textContent = `Progress: ${Math.round(ratio * 100)}% (${current}/${total})`;
  replayModalProgressBar.value = String(ratio);
}

function setReplayModalControlsState({ playing = false, paused = false } = {}) {
  if (replayModalPlayToggle) {
    replayModalPlayToggle.disabled = !playing;
    replayModalPlayToggle.textContent = playing ? (paused ? "Resume" : "Pause") : "Play";
  }
  if (replayModalRestart) {
    replayModalRestart.disabled = !playing;
  }
  if (replayModalStop) {
    replayModalStop.disabled = !playing;
  }
  if (replayModalClose) {
    replayModalClose.disabled = playing;
  }
}

function createReplayPlaybackController() {
  let paused = false;
  let stopped = false;
  let resumePromise = null;
  let resumeResolve = null;

  const waitForResume = () => {
    if (!paused) return Promise.resolve();
    if (!resumePromise) {
      resumePromise = new Promise((resolve) => {
        resumeResolve = resolve;
      });
    }
    return resumePromise;
  };

  const pause = () => {
    paused = true;
  };

  const resume = () => {
    paused = false;
    if (resumeResolve) resumeResolve();
    resumeResolve = null;
    resumePromise = null;
  };

  const stop = () => {
    stopped = true;
    resume();
  };

  const reset = () => {
    paused = false;
    stopped = false;
    if (resumeResolve) resumeResolve();
    resumeResolve = null;
    resumePromise = null;
  };

  return {
    pause,
    resume,
    stop,
    reset,
    shouldPause: () => paused,
    waitForResume,
    shouldStop: () => stopped,
    isPaused: () => paused,
    isStopped: () => stopped
  };
}

function moveCanvasToReplayModal() {
  if (!canvas || !replayModalCanvasSlot) return;
  if (canvas.parentElement === replayModalCanvasSlot) return;
  if (!replayCanvasHome) {
    replayCanvasHome = { parent: canvas.parentElement, nextSibling: canvas.nextSibling };
  }
  replayModalCanvasSlot.append(canvas);
  canvas.classList.add("replay-modal-canvas");
}

function restoreReplayCanvas() {
  if (!canvas || !replayCanvasHome?.parent) return;
  if (canvas.parentElement === replayCanvasHome.parent) return;
  const { parent, nextSibling } = replayCanvasHome;
  if (nextSibling && nextSibling.parentElement === parent) {
    parent.insertBefore(canvas, nextSibling);
  } else {
    parent.append(canvas);
  }
  canvas.classList.remove("replay-modal-canvas");
}

function readReplayBrowserFilters() {
  return normalizeReplayFilters({
    search: replayBrowserSearch?.value || "",
    minScore: replayBrowserMinScore?.value,
    maxScore: replayBrowserMaxScore?.value,
    minDuration: replayBrowserMinDuration?.value,
    maxDuration: replayBrowserMaxDuration?.value,
    sort: replayBrowserSort?.value
  });
}

function renderReplayBrowserResults({ runs = replayBrowserRuns } = {}) {
  if (!replayBrowserList) return;
  const filters = readReplayBrowserFilters();
  const filtered = sortReplayEntries(filterReplayEntries(runs, filters), filters);
  renderReplayBrowserList({
    container: replayBrowserList,
    entries: filtered,
    onPlay: (entry) => handleReplayBrowserPlay(entry)
  });
  updateReplayBrowserStatus({
    className: "hint",
    text: filtered.length
      ? `${filtered.length} replay${filtered.length === 1 ? "" : "s"} ready.`
      : "No replays match your filters."
  });
}

async function refreshReplayBrowser({ useFilters = true } = {}) {
  if (replayBrowserLoading) return;
  replayBrowserLoading = true;
  updateReplayBrowserStatus({ className: "hint", text: "Loading replays…" });

  const filters = useFilters ? readReplayBrowserFilters() : normalizeReplayFilters({});
  const query = {
    search: filters.search,
    limit: 50,
    minScore: filters.minScore,
    maxScore: filters.maxScore,
    minDuration: filters.minDuration,
    maxDuration: filters.maxDuration,
    sort: filters.sort
  };

  try {
    const res = await apiListBestRuns(query);
    if (!res?.ok || !Array.isArray(res.runs)) {
      updateReplayBrowserStatus({ className: "hint bad", text: "Unable to load replay list." });
      replayBrowserRuns = [];
      renderReplayBrowserResults({ runs: [] });
      return;
    }
    replayBrowserRuns = res.runs;
    renderReplayBrowserResults({ runs: replayBrowserRuns });
  } catch (err) {
    console.error(err);
    updateReplayBrowserStatus({ className: "hint bad", text: "Unable to load replay list." });
  } finally {
    replayBrowserLoading = false;
  }
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
  if (res.trails) net.trails = normalizeTrails(res.trails, { allowEmpty: true });
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
    totalRuns: net.user?.runs,
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
    net.trails = normalizeTrails(me.trails ?? net.trails, { allowEmpty: true });
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

  const stats = await apiGetStats();
  if (stats?.ok) {
    setMenuSubtitle?.(formatWorldwideRuns(stats.totalRuns));
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

async function ensureLoggedInForSave() {
  if (net.user) return true;
  const username = resolveReauthUsername({
    inputValue: usernameInput?.value,
    sessionUsername: readSessionUsername()
  });
  if (!username) return false;
  const recovered = await recoverUserFromUsername({
    username,
    register: apiRegister,
    onSuccess: (res) => {
      net.online = true;
      setNetUser(res.user);
      net.trails = normalizeTrails(res.trails ?? net.trails, { allowEmpty: true });
      syncUnlockablesCatalog({ trails: net.trails });
      syncIconCatalog(res.icons || net.icons);
      syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
      applyAchievementsPayload(res.achievements || { definitions: ACHIEVEMENTS, state: res.user?.achievements });
    }
  });
  return recovered && Boolean(net.user);
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
    net.trails = normalizeTrails(res.trails ?? net.trails, { allowEmpty: true });
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

async function uploadBestRunArtifacts(finalScore, runStats) {
  const activeRun = replayManager?.getActiveRun();
  if (!net.user || !activeRun?.ended) return;
  const bestScore = net.user?.bestScore ?? 0;
  if (finalScore < bestScore) return;
  if (lastUploadedBestSeed === activeRun.seed && lastUploadedBestScore >= bestScore) return;

  const runForUpload = cloneReplayRun(activeRun);
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
  const best = net.user ? (net.user.bestScore | 0) : 0;
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

  if (!net.user && !(await ensureLoggedInForSave())) return;

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
    getAuthStatusFromResponse,
    recoverSession
  });
});

trailOptions?.addEventListener("mouseover", (e) => {
  const btn = e.target.closest("button[data-trail-id]");
  if (!btn) return;
  const id = btn.dataset.trailId;
  const trail = net.trails.find((item) => item.id === id) || { id, name: btn.dataset.trailName || id };
  const best = net.user ? (net.user.bestScore | 0) : 0;
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

  if (!net.user && !(await ensureLoggedInForSave())) return;

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
  if (shouldTriggerSelectionSave({ previousId: previous, nextId: id })) {
    saveUserBtn?.click?.();
  }
  if (pipeTextureHint) {
    pipeTextureHint.className = net.user ? "hint" : "hint good";
    pipeTextureHint.textContent = net.user ? "Saving pipe texture…" : "Equipped (guest mode).";
  }

  if (!net.user && !(await ensureLoggedInForSave())) return;

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

  if (!net.user && !(await ensureLoggedInForSave())) return;

  const res = await apiSetIcon(id);
  const outcome = classifyIconSaveResponse(res);
  net.online = outcome.online;

  if (outcome.needsReauth) {
    await recoverSession();
  }

  if (outcome.outcome === "saved" && res) {
    setNetUser(res.user);
    net.trails = normalizeTrails(res.trails ?? net.trails, { allowEmpty: true });
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
replayModalClose?.addEventListener("click", closeReplayModal);
replayModal?.addEventListener("click", (e) => {
  if (e.target === replayModal) closeReplayModal();
});

replayModalPlayToggle?.addEventListener("click", () => {
  if (!replayPlaybackState?.controller) return;
  if (replayPlaybackState.controller.isPaused()) {
    replayPlaybackState.controller.resume();
    setReplayModalControlsState({ playing: true, paused: false });
    updateReplayModal({
      title: replayPlaybackState.title,
      text: `Playing ${replayPlaybackState.label || "replay"}…`,
      className: "hint",
      canClose: false
    });
  } else {
    replayPlaybackState.controller.pause();
    setReplayModalControlsState({ playing: true, paused: true });
    updateReplayModal({
      title: replayPlaybackState.title,
      text: "Replay paused.",
      className: "hint",
      canClose: false
    });
  }
});

replayModalRestart?.addEventListener("click", () => {
  if (!replayPlaybackState?.controller) return;
  replayPlaybackState.restartRequested = true;
  replayPlaybackState.controller.stop();
  updateReplayModal({
    title: replayPlaybackState.title,
    text: "Restarting replay…",
    className: "hint",
    canClose: false
  });
});

replayModalStop?.addEventListener("click", () => {
  if (!replayPlaybackState?.controller) return;
  replayPlaybackState.stopRequested = true;
  replayPlaybackState.controller.stop();
  updateReplayModal({
    title: replayPlaybackState.title,
    text: "Stopping replay…",
    className: "hint",
    canClose: false
  });
});

replayBrowserLauncher?.addEventListener("click", () => {
  toggleReplayBrowserModal(true);
  refreshReplayBrowser({ useFilters: false });
});

replayBrowserClose?.addEventListener("click", closeReplayBrowserModal);
replayBrowserModal?.addEventListener("click", (e) => {
  if (e.target === replayBrowserModal) closeReplayBrowserModal();
});

replayBrowserSearchButton?.addEventListener("click", () => {
  refreshReplayBrowser({ useFilters: true });
});

replayBrowserSearch?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    refreshReplayBrowser({ useFilters: true });
  }
});

const replayBrowserFilterListener = () => {
  renderReplayBrowserResults({ runs: replayBrowserRuns });
};

replayBrowserMinScore?.addEventListener("input", replayBrowserFilterListener);
replayBrowserMaxScore?.addEventListener("input", replayBrowserFilterListener);
replayBrowserMinDuration?.addEventListener("input", replayBrowserFilterListener);
replayBrowserMaxDuration?.addEventListener("input", replayBrowserFilterListener);
replayBrowserSort?.addEventListener("change", replayBrowserFilterListener);

replayBrowserRefresh?.addEventListener("click", () => {
  refreshReplayBrowser({ useFilters: true });
});

replayBrowserClear?.addEventListener("click", () => {
  if (replayBrowserSearch) replayBrowserSearch.value = "";
  if (replayBrowserMinScore) replayBrowserMinScore.value = "";
  if (replayBrowserMaxScore) replayBrowserMaxScore.value = "";
  if (replayBrowserMinDuration) replayBrowserMinDuration.value = "";
  if (replayBrowserMaxDuration) replayBrowserMaxDuration.value = "";
  if (replayBrowserSort) replayBrowserSort.value = "score";
  renderReplayBrowserResults({ runs: replayBrowserRuns });
});

setReplayModalControlsState({ playing: false, paused: false });
setReplayModalProgress({ tickIndex: 0, ticksLength: 0 });

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
  const handledOverlayEscape = handleMenuEscape(e, {
    trailOverlay,
    iconOverlay,
    pipeTextureOverlay,
    closeTrailMenu: () => {
      toggleTrailMenu(trailOverlay, false);
      if (lastTrailHint) setTrailHint(lastTrailHint, { persist: false });
    },
    closeIconMenu: () => {
      toggleIconMenu(iconOverlay, false);
      resetIconHint(iconHint);
    },
    closePipeTextureMenu: () => {
      togglePipeTextureMenu(pipeTextureOverlay, false);
      if (pipeTextureHint) {
        pipeTextureHint.className = "hint";
        pipeTextureHint.textContent = DEFAULT_PIPE_TEXTURE_HINT;
      }
    }
  });
  if (handledOverlayEscape) return;
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
  replayManager?.reset();

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
  replayManager?.startRecording(seed);
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
  updatePersonalBestUIWrapper(finalScore, net.user?.bestScore);
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
      net.trails = normalizeTrails(res.trails ?? net.trails, { allowEmpty: true });
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

      updatePersonalBestUIWrapper(finalScore, net.user.bestScore);
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
      updatePersonalBestUIWrapper(finalScore, net.user?.bestScore);
      updateGameOverStats({ runStats, achievementsState: net.user?.achievements, skillTotals: net.user?.skillTotals });
    }
  }

  if (!net.user) {
    applyIconSelection(currentIconId, playerIcons);
  }

  const activeRun = replayManager?.markEnded();
  if (activeRun) {

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

  if (!replayManager?.isReplaying()) {
    acc += dt;

    while (acc >= SIM_DT) {
      // Capture input snapshot for THIS tick
      const snap = input.snapshot();

      // Drain actions enqueued since last tick and apply them now (live run)
      let actions = [];
      if (tutorial?.active && game.state === 1 /* PLAY */) {
        actions = tutorial.drainActions();
      } else if (game.state === 1 /* PLAY */) {
        actions = replayManager?.drainPendingActions() || [];
      }

      // Record tick data
      if (!tutorial?.active && game.state === 1 /* PLAY */) {
        replayManager?.recordTick(snap, actions);
      }

      // Apply actions for this tick to the live game (tutorial or normal run)
      const canAdvanceSim = !(tutorial?.active && tutorial.pauseSim);
      let actionsToApply = actions;
      const baseCursor = { ...snap.cursor };
      if (game.state === 1 /* PLAY */ && actions.length && canAdvanceSim) {
        if (tutorial?.active) {
          actionsToApply = [];
          for (const a of actions) {
            if (!tutorial.allowAction(a.id)) {
              tutorial.notifyBlockedAction(a.id);
              continue;
            }
            actionsToApply.push(a);
          }
        }

        if (!driver) {
          for (const a of actionsToApply) {
            // For teleport: ensure the input cursor reflects the recorded cursor for that action
            if (a && a.cursor) {
              input.cursor.x = a.cursor.x;
              input.cursor.y = a.cursor.y;
              input.cursor.has = !!a.cursor.has;
            }
            game.handleAction(a.id);
            input.cursor.x = baseCursor.x;
            input.cursor.y = baseCursor.y;
            input.cursor.has = baseCursor.has;
          }
        }

        if (tutorial?.active) {
          for (const a of actionsToApply) {
            tutorial.onActionApplied(a.id);
          }
        }
      }

      // Step simulation
      if (tutorial?.active) tutorial.beforeSimTick(SIM_DT);
      if (!(tutorial?.active && tutorial.pauseSim)) {
        if (driver) {
          driver.step(SIM_DT, actionsToApply);
        } else {
          game.update(SIM_DT);
        }
        if (tutorial?.active) tutorial.afterSimTick(SIM_DT);
      }
      checkRunAchievements();
      acc -= SIM_DT;

      if (game.state === 2 /* OVER */) {
        replayManager?.clearPendingActions();
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

  primeVolumeControls();
  renderIconOptions(currentIconId, computeUnlockedIconSet(playerIcons), playerIcons);

  exportMp4Btn?.addEventListener("click", async () => {
    try {
      replayStatus.textContent = "Exporting MP4… (replaying + encoding)";
      const webm = await replayManager.play({ captureMode: "webm" });
      if (!webm) throw new Error("No WebM captured from replay.");

      const mp4 = await transcodeWithFFmpeg({ webmBlob: webm, outExt: "mp4" });
      const activeRun = replayManager.getActiveRun();
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
      const webm = await replayManager.play({ captureMode: "webm" });
      if (!webm) throw new Error("No WebM captured from replay.");

      const gif = await transcodeWithFFmpeg({ webmBlob: webm, outExt: "gif" });
      const activeRun = replayManager.getActiveRun();
      downloadBlob(gif, `flappy-bingus-${activeRun.seed}.gif`);
      replayStatus.textContent = "GIF exported.";
    } catch (e) {
      console.error(e);
      replayStatus.textContent = "GIF export failed (see console).";
    }
  });

  if (watchReplayBtn) {
    watchReplayBtn.addEventListener("click", async () => {
      if (replayStatus) {
        replayStatus.className = "hint";
        replayStatus.textContent = "Playing replay…";
      }
      const played = await replayManager.play({ captureMode: "none" });
      if (played && replayStatus) {
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
