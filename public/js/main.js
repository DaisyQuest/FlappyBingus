// =====================
// FILE: public/js/main.js
// =====================
import { DEFAULT_CONFIG, loadConfig } from "./config.js";
import {
  DEFAULT_SKILL_SETTINGS,
  normalizeSkillSettings,
  skillSettingsEqual
} from "./settings.js";
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
import { SIM_DT } from "./simPrecision.js";

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

import { buildGameUI, setTextCustomPanelVisibility } from "./uiLayout.js";
import { createMenuParallaxController } from "./menuParallax.js";
import { TrailPreview } from "./trailPreview.js";
import { normalizeTrailSelection } from "./trailSelectUtils.js";
import { buildTrailHint, GUEST_TRAIL_HINT_TEXT } from "./trailHint.js";
import { DEFAULT_TRAILS, getUnlockedTrails, normalizeTrails, sortTrailsForDisplay } from "./trailProgression.js";
import { computePipeColor } from "./pipeColors.js";
import { hydrateBestRunPayload, maybeUploadBestRun } from "./bestRunRecorder.js";
import { renderHighscores } from "./highscores.js";
import { renderReplayDetails } from "./replayDetails.js";
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
import { createBestRunUploader, downloadBlob } from "./replayArtifacts.js";
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
import { createTrailMenuHandlers } from "./trailMenuHandlers.js";
import { createIconMenuHandlers } from "./iconMenuHandlers.js";
import { createPipeTextureMenuHandlers } from "./pipeTextureMenuHandlers.js";
import { createSessionFlows } from "./sessionFlows.js";
import {
  applyTextStyleCustomToUI,
  readTextStyleCustomFromUI
} from "./textStyleControls.js";
import { initSeedControls } from "./seedControls.js";
import { createRebindController, renderBindUI } from "./rebindControls.js";


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
  textStylePresetSelect,
  textCustomPanel,
  textFontFamily,
  textFontWeight,
  textFontWeightValue,
  textSizeScale,
  textSizeScaleValue,
  textUseGameColors,
  textColor,
  textUseGameGlow,
  textGlowColor,
  textStrokeColor,
  textStrokeWidth,
  textStrokeWidthValue,
  textShadowBoost,
  textShadowBoostValue,
  textShadowOffsetY,
  textShadowOffsetYValue,
  textWobble,
  textWobbleValue,
  textSpin,
  textSpinValue,
  textShimmer,
  textShimmerValue,
  textSparkle,
  textUseGradient,
  textGradientStart,
  textGradientEnd,
  simpleBackgroundToggle,
  simpleTexturesToggle,
  simpleParticlesToggle,
  reducedEffectsToggle,
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
  highscoreDetailsModal,
  highscoreDetailsTitle,
  highscoreDetailsBody,
  highscoreDetailsClose,
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
  themeChaosToggle,
  themeSmartRandomToggle,
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

const textStyleElements = {
  textFontFamily,
  textFontWeight,
  textFontWeightValue,
  textSizeScale,
  textSizeScaleValue,
  textUseGameColors,
  textColor,
  textUseGameGlow,
  textGlowColor,
  textStrokeColor,
  textStrokeWidth,
  textStrokeWidthValue,
  textShadowBoost,
  textShadowBoostValue,
  textShadowOffsetY,
  textShadowOffsetYValue,
  textWobble,
  textWobbleValue,
  textSpin,
  textSpinValue,
  textShimmer,
  textShimmerValue,
  textSparkle,
  textUseGradient,
  textGradientStart,
  textGradientEnd
};

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
const highscoreDetailsCache = new Map();

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

function resolveActiveCosmetics() {
  return {
    trailId: net.user?.selectedTrail || currentTrailId || "classic",
    iconId: net.user?.selectedIcon || currentIconId || DEFAULT_PLAYER_ICON_ID,
    pipeTextureId: net.user?.selectedPipeTexture || currentPipeTextureId || DEFAULT_PIPE_TEXTURE_ID,
    pipeTextureMode: net.user?.pipeTextureMode || currentPipeTextureMode || DEFAULT_PIPE_TEXTURE_MODE
  };
}

function makeReplayCosmeticsApplier(targetGame) {
  return function applyReplayCosmetics(cosmetics) {
    if (!targetGame) return () => {};
    const fallback = resolveActiveCosmetics();
    const resolved = {
      trailId: typeof cosmetics?.trailId === "string" && cosmetics.trailId.trim()
        ? cosmetics.trailId.trim()
        : fallback.trailId,
      iconId: typeof cosmetics?.iconId === "string" && cosmetics.iconId.trim()
        ? cosmetics.iconId.trim()
        : fallback.iconId,
      pipeTextureId: typeof cosmetics?.pipeTextureId === "string" && cosmetics.pipeTextureId.trim()
        ? cosmetics.pipeTextureId.trim()
        : fallback.pipeTextureId,
      pipeTextureMode: normalizePipeTextureMode(cosmetics?.pipeTextureMode || fallback.pipeTextureMode)
    };

    const prevGetTrailId = targetGame.getTrailId;
    const prevGetPipeTexture = targetGame.getPipeTexture;
    const prevPlayerImg = targetGame.playerImg;

    targetGame.getTrailId = () => resolved.trailId;
    targetGame.getPipeTexture = () => ({ id: resolved.pipeTextureId, mode: resolved.pipeTextureMode });

    const icon = playerIcons.find((entry) => entry.id === resolved.iconId) || playerIcons[0];
    if (icon) targetGame.setPlayerImage(getCachedIconSprite(icon));

    return () => {
      targetGame.getTrailId = prevGetTrailId;
      targetGame.getPipeTexture = prevGetPipeTexture;
      targetGame.setPlayerImage(prevPlayerImg);
    };
  };
}

// ---- Input + Game ----
const ctx = canvas.getContext("2d", { alpha: false });

// Deterministic sim clock
const MAX_FRAME = 1 / 20;
let acc = 0;
let lastTs = 0;

// Tutorial manager (initialized after Game is created, but referenced by the Input callback).
let tutorial = null;
let replayManager = null;

const uploadBestRunArtifacts = createBestRunUploader({
  getActiveRun: () => replayManager?.getActiveRun(),
  getUser: () => net.user,
  cloneReplayRun,
  maybeUploadBestRun,
  uploadBestRun: apiUploadBestRun,
  setStatus: ({ className, text }) => {
    if (!replayStatus) return;
    if (className) replayStatus.className = className;
    if (text !== undefined) replayStatus.textContent = text;
  }
});

const renderBindUIWrapper = (listeningActionId = null) => {
  renderBindUI({
    bindWrap,
    binds,
    actions: ACTIONS,
    listeningActionId,
    humanizeBind
  });
};


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

const replayIdleInput = {
  cursor: { x: 0, y: 0, has: false },
  _move: { dx: 0, dy: 0 },
  getMove() { return this._move; }
};

const buildGameInstance = ({ onGameOver, input: gameInput }) => new Game({
  canvas,
  ctx,
  config: null,
  playerImg,
  input: gameInput,
  getTrailId: () => {
    if (net.user?.selectedTrail) return net.user.selectedTrail;
    return currentTrailId || "classic";
  },
  getPipeTexture: () => ({
    id: net.user?.selectedPipeTexture || currentPipeTextureId || DEFAULT_PIPE_TEXTURE_ID,
    mode: net.user?.pipeTextureMode || currentPipeTextureMode || DEFAULT_PIPE_TEXTURE_MODE
  }),
  getBinds: () => binds,
  onGameOver
});

let game = buildGameInstance({ onGameOver: (score) => onGameOver(score), input });
let replayGame = buildGameInstance({ onGameOver: () => {}, input: replayIdleInput });
game.setSkillSettings(skillSettings);
replayGame.setSkillSettings(skillSettings);

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
  playbackGame: replayGame,
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
  step: driver ? (dt, actions) => driver.step(dt, actions) : null,
  applyCosmetics: makeReplayCosmeticsApplier(replayGame)
});

window.addEventListener("resize", () => {
  game.resizeToWindow();
  replayGame.resizeToWindow();
  trailPreview?.resize();
});
// On some browsers, zoom changes fire visualViewport resize without window resize.
window.visualViewport?.addEventListener("resize", () => {
  game.resizeToWindow();
  replayGame.resizeToWindow();
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

async function handlePlayHighscore(username) {
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

    const played = await replayManager.play({
      captureMode: "none",
      run: playbackRun,
      playbackMode: "deterministic"
    });
    if (played) {
      updateReplayModal({
        title: modalTitle,
        text: `Playing ${username}'s best run… done.`,
        className: "hint good",
        canClose: true
      });
    } else {
      updateReplayModal({
        title: modalTitle,
        text: "Unable to play the selected replay.",
        className: "hint bad",
        canClose: true
      });
    }
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

function measureReplayBytes(replayJson) {
  if (typeof replayJson !== "string") return 0;
  if (typeof TextEncoder === "undefined") return replayJson.length;
  return new TextEncoder().encode(replayJson).byteLength;
}

async function handleHighscoreDetails(entry) {
  const username = entry?.username;
  if (!username) return;
  if (highscoreDetailsTitle) {
    highscoreDetailsTitle.textContent = "Best Run Details";
  }
  toggleHighscoreDetailsModal(true);
  setHighscoreDetailsMessage(`Loading ${username}'s best run…`, "hint");

  try {
    let cached = highscoreDetailsCache.get(username);
    if (!cached) {
      const res = await apiGetBestRun(username);
      if (!res?.ok || !res.run) {
        setHighscoreDetailsMessage("Best run details are unavailable.", "hint bad");
        return;
      }

      const hydrated = hydrateBestRunPayload(res.run);
      const replayBytes = Number(res.run.replayBytes) || measureReplayBytes(res.run.replayJson);
      const detailEntry = {
        username,
        bestScore: Number(entry?.bestScore) || 0,
        durationMs: Number(hydrated?.durationMs ?? res.run.durationMs ?? 0),
        recordedAt: Number(hydrated?.recordedAt ?? res.run.recordedAt ?? 0),
        ticksLength: Number(hydrated?.ticksLength ?? res.run.ticksLength ?? 0),
        replayBytes
      };

      const detailRun = hydrated
        ? { ...hydrated, runStats: res.run.runStats ?? hydrated.runStats ?? null }
        : { runStats: res.run.runStats ?? null };

      cached = { entry: detailEntry, run: detailRun };
      highscoreDetailsCache.set(username, cached);
    }

    renderHighscoreDetails(cached.entry, cached.run);
  } catch (err) {
    console.error(err);
    setHighscoreDetailsMessage("Unable to load best run details.", "hint bad");
  }
}

function renderHighscoresUI() {
  renderHighscores({
    container: hsWrap,
    online: net.online,
    highscores: net.highscores,
    currentUser: net.user,
    onPlayRun: handlePlayHighscore,
    onShowDetails: handleHighscoreDetails
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

function toggleHighscoreDetailsModal(open) {
  if (!highscoreDetailsModal) return;
  highscoreDetailsModal.classList.toggle("hidden", !open);
  highscoreDetailsModal.setAttribute("aria-hidden", open ? "false" : "true");
}

function setHighscoreDetailsMessage(text = "", className = "hint") {
  if (!highscoreDetailsBody) return;
  highscoreDetailsBody.className = className;
  highscoreDetailsBody.textContent = text;
}

function renderHighscoreDetails(entry, run) {
  if (!highscoreDetailsBody) return;
  highscoreDetailsBody.className = "replay-detail-body";
  renderReplayDetails({ container: highscoreDetailsBody, entry, run });
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

function closeReplayModal() {
  if (replayManager?.isReplaying()) return;
  toggleReplayModal(false);
}

function closeHighscoreDetailsModal() {
  toggleHighscoreDetailsModal(false);
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

function applySkillSettingsToUI(settings = skillSettings) {
  const normalized = normalizeSkillSettings(settings || DEFAULT_SKILL_SETTINGS);
  markSkillOptionSelection(dashBehaviorOptions, normalized.dashBehavior);
  markSkillOptionSelection(teleportBehaviorOptions, normalized.teleportBehavior);
  markSkillOptionSelection(invulnBehaviorOptions, normalized.invulnBehavior);
  markSkillOptionSelection(slowFieldBehaviorOptions, normalized.slowFieldBehavior);
  if (textStylePresetSelect) textStylePresetSelect.value = normalized.textStylePreset;
  setTextCustomPanelVisibility(textCustomPanel, normalized.textStylePreset);
  applyTextStyleCustomToUI(textStyleElements, normalized.textStyleCustom);
  if (simpleBackgroundToggle) simpleBackgroundToggle.checked = normalized.simpleBackground;
  if (simpleTexturesToggle) simpleTexturesToggle.checked = normalized.simpleTextures;
  if (simpleParticlesToggle) simpleParticlesToggle.checked = normalized.simpleParticles;
  if (reducedEffectsToggle) reducedEffectsToggle.checked = normalized.reducedEffects;
}

async function updateSkillSettings(next, { persist = true } = {}) {
  const normalized = normalizeSkillSettings(next || DEFAULT_SKILL_SETTINGS);
  const changed = !skillSettingsEqual(skillSettings, normalized);
  skillSettings = normalized;
  game.setSkillSettings(skillSettings);
  replayGame.setSkillSettings(skillSettings);
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
const { refreshProfileAndHighscores, recoverSession, registerUser } = createSessionFlows({
  apiGetMe,
  apiGetHighscores,
  apiGetStats,
  apiRegister,
  apiSetKeybinds,
  setMenuSubtitle,
  formatWorldwideRuns,
  net,
  setNetUser,
  normalizeTrails,
  syncUnlockablesCatalog,
  syncIconCatalog,
  syncPipeTextureCatalog,
  applyAchievementsPayload,
  normalizeAchievementState,
  ACHIEVEMENTS,
  mergeBinds,
  DEFAULT_KEYBINDS,
  updateSkillSettings,
  setUserHint,
  refreshTrailMenu,
  applyIconSelection,
  normalizePipeTextureMode,
  writePipeTextureModeCookie,
  refreshPipeTextureMenu,
  applyPipeTextureSelection,
  syncMenuProfileBindingsFromState,
  renderHighscoresUI,
  renderAchievements,
  renderBindUI: renderBindUIWrapper,
  refreshBootUI,
  playerIcons,
  getCurrentIconId: () => currentIconId,
  getCurrentPipeTextureId: () => currentPipeTextureId,
  getCurrentPipeTextureMode: () => currentPipeTextureMode,
  setCurrentPipeTextureMode: (mode) => { currentPipeTextureMode = mode; },
  setBinds: (nextBinds) => { binds = nextBinds; },
  getSkillSettings: () => skillSettings,
  usernameInput,
  userHint
});

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
saveUserBtn.addEventListener("click", registerUser);

// ---- Replay UI ----

// ---- Cosmetics selection ----
createTrailMenuHandlers({
  elements: {
    trailLauncher,
    trailOverlay,
    trailOverlayClose,
    trailOptions
  },
  getNet: () => net,
  getCurrentTrailId: () => currentTrailId,
  getCurrentIconId: () => currentIconId,
  getPlayerIcons: () => playerIcons,
  getLastTrailHint: () => lastTrailHint,
  apiSetTrail,
  refreshTrailMenu,
  toggleTrailMenu,
  setTrailHint,
  applyTrailSelection,
  ensureLoggedInForSave,
  openPurchaseModal,
  handleTrailSaveResponse,
  setNetUser,
  setUserHint,
  buildTrailHint,
  normalizeTrails,
  syncUnlockablesCatalog,
  syncIconCatalog,
  syncPipeTextureCatalog,
  applyIconSelection,
  getAuthStatusFromResponse,
  recoverSession,
  sortTrailsForDisplay,
  computeUnlockedTrailSet,
  describeTrailLock,
  trailHoverText,
  DEFAULT_TRAIL_HINT,
  DEFAULT_CURRENCY_ID,
  UNLOCKABLE_TYPES
}).bind();

createPipeTextureMenuHandlers({
  elements: {
    pipeTextureLauncher,
    pipeTextureOverlay,
    pipeTextureOptions,
    pipeTextureModeOptions,
    pipeTextureHint
  },
  getNet: () => net,
  getCurrentPipeTextureId: () => currentPipeTextureId,
  setCurrentPipeTextureId: (id) => { currentPipeTextureId = id; },
  getCurrentPipeTextureMode: () => currentPipeTextureMode,
  setCurrentPipeTextureMode: (mode) => { currentPipeTextureMode = mode; },
  refreshPipeTextureMenu,
  togglePipeTextureMenu,
  shouldClosePipeTextureMenu,
  normalizePipeTextureMode,
  writePipeTextureModeCookie,
  renderPipeTextureModeButtons,
  syncPipeTextureSwatch,
  renderPipeTextureMenuOptions,
  computeUnlockedPipeTextureSet,
  openPurchaseModal,
  applyPipeTextureSelection,
  shouldTriggerSelectionSave,
  triggerUserSave: () => saveUserBtn?.click?.(),
  ensureLoggedInForSave,
  apiSetPipeTexture,
  getAuthStatusFromResponse,
  recoverSession,
  setUserHint,
  setNetUser,
  syncPipeTextureCatalog,
  describePipeTextureLock,
  pipeTextureHoverText,
  DEFAULT_PIPE_TEXTURE_HINT,
  DEFAULT_CURRENCY_ID,
  UNLOCKABLE_TYPES
}).bind();

createIconMenuHandlers({
  elements: {
    iconOptions,
    iconHint,
    iconLauncher,
    iconOverlay,
    iconOverlayClose
  },
  getNet: () => net,
  getPlayerIcons: () => playerIcons,
  getCurrentIconId: () => currentIconId,
  computeUnlockedIconSet,
  openPurchaseModal,
  applyIconSelection,
  ensureLoggedInForSave,
  apiSetIcon,
  classifyIconSaveResponse,
  setNetUser,
  normalizeTrails,
  syncUnlockablesCatalog,
  syncIconCatalog,
  syncPipeTextureCatalog,
  setUserHint,
  recoverSession,
  renderIconOptions,
  toggleIconMenu,
  resetIconHint,
  describeIconLock,
  iconHoverText,
  DEFAULT_CURRENCY_ID,
  UNLOCKABLE_TYPES
}).bind();

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
highscoreDetailsClose?.addEventListener("click", closeHighscoreDetailsModal);
highscoreDetailsModal?.addEventListener("click", (e) => {
  if (e.target === highscoreDetailsModal) closeHighscoreDetailsModal();
});

// ---- Keybind rebinding flow ----
const rebindController = createRebindController({
  bindWrap,
  bindHint,
  actions: ACTIONS,
  getBinds: () => binds,
  setBinds: (next) => { binds = next; },
  getNetUser: () => net.user,
  apiSetKeybinds,
  saveGuestBinds,
  setNetUser,
  applyRebindWithSwap,
  humanizeBind,
  keyEventToBind,
  pointerEventToBind,
  renderBindUI: renderBindUIWrapper
});

bindWrap.addEventListener("click", (e) => rebindController.handleClick(e));

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
const updateTextCustomSettings = () => {
  const custom = readTextStyleCustomFromUI(textStyleElements);
  updateSkillSettings({ ...skillSettings, textStyleCustom: custom });
};

textStylePresetSelect?.addEventListener("change", (e) => {
  const value = e.target?.value;
  updateSkillSettings({ ...skillSettings, textStylePreset: value });
});

[
  textFontFamily,
  textFontWeight,
  textSizeScale,
  textUseGameColors,
  textColor,
  textUseGameGlow,
  textGlowColor,
  textStrokeColor,
  textStrokeWidth,
  textShadowBoost,
  textShadowOffsetY,
  textWobble,
  textSpin,
  textShimmer,
  textSparkle,
  textUseGradient,
  textGradientStart,
  textGradientEnd
].forEach((input) => {
  if (!input) return;
  const handler = () => updateTextCustomSettings();
  input.addEventListener("change", handler);
  if (input instanceof HTMLInputElement && input.type === "range") {
    input.addEventListener("input", handler);
  }
});

simpleBackgroundToggle?.addEventListener("change", () => {
  updateSkillSettings({ ...skillSettings, simpleBackground: simpleBackgroundToggle.checked });
});
simpleTexturesToggle?.addEventListener("change", () => {
  updateSkillSettings({ ...skillSettings, simpleTextures: simpleTexturesToggle.checked });
});
simpleParticlesToggle?.addEventListener("change", () => {
  updateSkillSettings({ ...skillSettings, simpleParticles: simpleParticlesToggle.checked });
});
reducedEffectsToggle?.addEventListener("change", () => {
  updateSkillSettings({ ...skillSettings, reducedEffects: reducedEffectsToggle.checked });
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
  rebindController.reset();

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
  rebindController.reset();

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
  rebindController.reset();

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
  const activeRun = replayManager?.startRecording(seed);
  if (activeRun) {
    activeRun.cosmetics = resolveActiveCosmetics();
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
  initSeedControls({
    seedInput,
    seedRandomBtn,
    seedHint,
    readSeed,
    writeSeed,
    genRandomSeed
  });

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
  replayGame.cfg = CFG;
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
      themeStatus,
      themeChaosToggle,
      themeSmartRandomToggle
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
      if (replayGame.cfg?.pipes?.colors) {
        replayGame.cfg.pipes.colors = {
          green: values.pipeGreen,
          blue: values.pipeBlue,
          wisteria: values.pipeWisteria,
          red: values.pipeRed
        };
      }
    }
  });

  game.resizeToWindow();
  replayGame.resizeToWindow();
  game.setStateMenu();
  replayGame.setStateMenu();
  renderBindUIWrapper();

  await refreshProfileAndHighscores();
  refreshBootUI();

  resumeTrailPreview(net.user?.selectedTrail || currentTrailId || "classic");
  requestAnimationFrame((t) => {
    lastTs = t;
    requestAnimationFrame(frame);
  });
})();
