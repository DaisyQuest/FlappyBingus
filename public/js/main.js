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
  apiSync,
  apiRegister,
  apiGetTrailStyles,
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
  evaluateRunForAchievements,
  resolveAchievementDefinitions
} from "./achievements.js";
import { renderScoreBreakdown } from "./scoreBreakdown.js";
import { computePersonalBestStatus, updatePersonalBestElements } from "./personalBest.js";
import { updatePersonalBestUI } from "./personalBestUI.js";
import { buildGameOverStats, GAME_OVER_STAT_VIEWS } from "./gameOverStats.js";
import { buildUnlockablesCatalog, getUnlockedIdsByType, resolveUnlockablesForType, UNLOCKABLE_TYPES } from "./unlockables.js";
import { DEFAULT_CURRENCY_ID, getUserCurrencyBalance } from "./currencySystem.js";
import { buildBaseIcons } from "./iconRegistry.js";
import {
  describeIconLock,
  getFirstIconId,
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
import { setTrailStyleOverrides } from "./trailStyles.js";
import { buildTrailHint, GUEST_TRAIL_HINT_TEXT } from "./trailHint.js";
import { DEFAULT_TRAILS, mergeTrailCatalog, sortTrailsForDisplay } from "./trailProgression.js";
import { createTrailMenuStateProvider } from "./trailMenuState.js";
import { createIconMenuStateProvider } from "./iconMenuState.js";
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
import { createBootState, createNetState } from "./main/state.js";
import { createIconLookup, makeReplayCosmeticsApplier, resolveActiveCosmetics } from "./main/cosmetics.js";
import { createGameOverStatsController } from "./main/gameOverStatsController.js";
import { createReplayBytesMeasurer } from "./main/replayMetrics.js";
import { createPersonalBestUpdater } from "./main/personalBestAdapter.js";
import { createVolumeController } from "./main/audioControls.js";
import { refreshBootUI } from "./main/bootUI.js";
import { createTrailMenuController } from "./main/trailMenuController.js";
import { createIconMenuController } from "./main/iconMenuController.js";
import { createAppBootstrap } from "./appBootstrap.js";
import { createUIOrchestrator } from "./uiOrchestrator.js";
import { createGameSession } from "./gameSession.js";
import {
  computeUnlockedIconSet,
  computeUnlockedPipeTextureSet,
  computeUnlockedTrailSet
} from "./main/unlockableSets.js";

// ---- DOM ----
const { ui, elements, textStyleElements, setUIMode, updateSkillCooldownUI, initMenuParallax } = createUIOrchestrator({
  buildGameUI,
  createMenuParallaxController,
  defaultConfig: DEFAULT_CONFIG,
  document
});

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
  reduceMotionToggle,
  extremeLowDetailToggle,
  hsWrap,
  pbText,
  trailText,
  offlineStatus,
  menuPanel,
  iconText,
  pipeTextureText,
  bustercoinText,
  supportcoinText,
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
  supportButton,
  discordPopover,
  donatePopover,
  supportPopover,
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
} = elements;

// ---- Local best fallback cookie (legacy support) ----
const updatePersonalBestUIWrapper = createPersonalBestUpdater({
  elements: {
    personalBestEl: overPB,
    badgeEl: overPbBadge,
    statusEl: overPbStatus
  },
  readLocalBest,
  writeLocalBest,
  computePersonalBestStatus,
  updatePersonalBestElements,
  updatePersonalBestUI
});

const gameOverStatsController = createGameOverStatsController({
  elements: {
    overOrbCombo,
    overPerfectCombo,
    skillUsageStats,
    overOrbComboLabel,
    overPerfectComboLabel,
    skillUsageTitle,
    overStatsMode,
    overStatsToggle
  },
  buildGameOverStats,
  renderSkillUsageStats,
  statViews: GAME_OVER_STAT_VIEWS
});

let runAchievementBaseState = null;
let runAchievementIds = new Set();
let runAchievementDefs = [];

// ---- Boot + runtime state ----
const {
  boot,
  net,
  baseIcons,
  normalizedBaseIcons,
  fallbackIconId
} = createAppBootstrap({
  createBootState,
  createNetState,
  buildBaseIcons,
  normalizePlayerIcons,
  getFirstIconId,
  DEFAULT_TRAILS,
  normalizePipeTextures,
  ACHIEVEMENTS,
  normalizeAchievementState,
  buildUnlockablesCatalog
});

// keybinds: start from guest cookie; override from server user when available
let binds = loadGuestBinds();
let skillSettings = readSettingsCookie() || normalizeSkillSettings(DEFAULT_SKILL_SETTINGS);

// config + assets
let CFG = null;
let trailPreview = null;
let currentTrailId = "classic";
let playerIcons = normalizedBaseIcons;
const iconLookup = createIconLookup(playerIcons);
let currentIconId = normalizeIconSelection({
  currentId: readIconCookie(),
  unlockedIds: playerIcons.map((i) => i.id),
  fallbackId: fallbackIconId
});
let currentPipeTextureId = readPipeTextureCookie() || DEFAULT_PIPE_TEXTURE_ID;
let currentPipeTextureMode = normalizePipeTextureMode(readPipeTextureModeCookie() || DEFAULT_PIPE_TEXTURE_MODE);
let activeShopTab = SHOP_TABS[0]?.type || UNLOCKABLE_TYPES.playerTexture;
let pendingPurchase = null;
const highscoreDetailsCache = new Map();
const cosmeticsDefaults = {
  trailId: "classic",
  iconId: fallbackIconId,
  pipeTextureId: DEFAULT_PIPE_TEXTURE_ID,
  pipeTextureMode: DEFAULT_PIPE_TEXTURE_MODE
};
const resolveCosmetics = () => resolveActiveCosmetics({
  user: net.user,
  currentTrailId,
  currentIconId,
  currentPipeTextureId,
  currentPipeTextureMode,
  defaults: cosmeticsDefaults
});
const measureReplayBytes = createReplayBytesMeasurer();

const menuProfileModel = createMenuProfileModel({
  refs: { usernameInput, pbText, trailText, iconText, pipeTextureText, bustercoinText, supportcoinText },
  user: net.user,
  trails: net.trails,
  icons: playerIcons,
  pipeTextures: net.pipeTextures,
  fallbackTrailId: currentTrailId,
  fallbackIconId: currentIconId,
  fallbackPipeTextureId: currentPipeTextureId,
  bestScoreFallback: 0
});
const refreshBootUIWrapper = () => refreshBootUI({
  boot,
  net,
  elements: { startBtn, tutorialBtn, bootPill, bootText }
});

// assets
let playerImg = getCachedIconSprite(iconLookup.getById(currentIconId) || iconLookup.getFallback());
boot.imgReady = true; boot.imgOk = true;
refreshBootUIWrapper();

trailPreview = trailPreviewCanvas ? new TrailPreview({
  canvas: trailPreviewCanvas,
  playerImg
}) : null;
const getTrailMenuState = createTrailMenuStateProvider({
  sortTrailsForDisplay,
  computeUnlockedTrailSet
});
const getIconMenuState = createIconMenuStateProvider({
  computeUnlockedIconSet
});
const trailMenuController = createTrailMenuController({
  elements: { trailText, trailLauncher, trailHint, trailOptions },
  getNet: () => net,
  getTrailMenuState,
  getCurrentTrailId: () => currentTrailId,
  setCurrentTrailId: (id) => { currentTrailId = id; },
  getCurrentIconId: () => currentIconId,
  getPlayerIcons: () => playerIcons,
  getPlayerImage: () => playerImg,
  getTrailDisplayName,
  normalizeTrailSelection,
  renderTrailMenuOptions,
  describeTrailLock,
  buildTrailHint,
  shouldTriggerGuestSave,
  syncMenuProfileBindingsFromState,
  syncLauncherSwatch,
  trailPreview,
  saveUserButton: saveUserBtn,
  DEFAULT_TRAIL_HINT,
  GUEST_TRAIL_HINT_TEXT
});
const iconMenuController = createIconMenuController({
  elements: { iconText, iconLauncher, iconHint, iconOptions },
  getNet: () => net,
  getIconMenuState,
  getCurrentIconId: () => currentIconId,
  setCurrentIconId: (id) => { currentIconId = id; },
  getPlayerIcons: () => playerIcons,
  setPlayerImage: (image) => {
    playerImg = image;
    game?.setPlayerImage(playerImg);
    trailPreview?.setPlayerImage(playerImg);
  },
  getIconDisplayName,
  normalizeIconSelection,
  applyIconSwatchStyles,
  renderIconMenuOptions,
  getCachedIconSprite,
  paintIconCanvas,
  syncLauncherSwatch,
  refreshTrailMenu: () => refreshTrailMenu(currentTrailId),
  writeIconCookie,
  DEFAULT_ICON_HINT,
  fallbackIconId
});
syncLauncherSwatch(currentIconId, playerIcons, playerImg);
syncPipeTextureCatalog(net.pipeTextures);
syncPipeTextureSwatch(currentPipeTextureId, net.pipeTextures);
initMenuParallax();

const buildReplayCosmeticsApplier = (targetGame) => makeReplayCosmeticsApplier({
  targetGame,
  resolveCosmetics,
  iconLookup,
  normalizePipeTextureMode,
  getCachedIconSprite
});

// ---- Input + Game ----
const ctx = canvas.getContext("2d", { alpha: false });

// Deterministic sim clock
const MAX_FRAME = 1 / 20;
let acc = 0;
let lastTs = 0;

// Tutorial manager (initialized after Game is created, but referenced by the Input callback).
let tutorial = null;
let replayManager = null;
let game = null;
let replayGame = null;
let input = null;

const handleActionQueued = ({ actionId, cursor }) => {
  if (tutorial?.active && game?.state === 1 /* PLAY */) {
    tutorial.enqueueAction({
      id: actionId,
      cursor
    });
    return;
  }
  if (game?.state === 1 /* PLAY */) {
    replayManager?.queueAction({
      id: actionId,
      cursor
    });
  }
};

const getActiveTrailId = () => {
  if (net.user?.selectedTrail) return net.user.selectedTrail;
  return currentTrailId || "classic";
};
const getActivePipeTexture = () => ({
  id: net.user?.selectedPipeTexture || currentPipeTextureId || DEFAULT_PIPE_TEXTURE_ID,
  mode: net.user?.pipeTextureMode || currentPipeTextureMode || DEFAULT_PIPE_TEXTURE_MODE
});

const session = createGameSession({
  canvas,
  ctx,
  Input,
  Game,
  GameDriver,
  getBinds: () => binds,
  getTrailId: getActiveTrailId,
  getPipeTexture: getActivePipeTexture,
  playerImg,
  onGameOver: (score) => onGameOver(score),
  onActionQueued: handleActionQueued,
  skillSettings,
  setRandSource
});
({ input, game, replayGame } = session);
const { replayIdleInput } = session;
let driver = session.driver;

const volumeController = createVolumeController({
  elements: { musicSlider, sfxSlider, muteToggle },
  defaults: DEFAULT_AUDIO,
  readAudioSettings,
  writeAudioSettings,
  applyVolumeFromUI,
  primeVolumeUI,
  setMusicVolume,
  setSfxVolume,
  setMuted,
  game
});
volumeController.bindVolumeControls();

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
  applyCosmetics: buildReplayCosmeticsApplier(replayGame)
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
  let playbackRun = null;
  let previousReplayConfig = null;
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
    playbackRun = hydrateBestRunPayload(res.run);
    if (!playbackRun) {
      updateReplayModal({
        title: modalTitle,
        text: "Replay data is invalid.",
        className: "hint bad",
        canClose: true
      });
      return;
    }

    if (playbackRun.configSnapshot && replayGame) {
      previousReplayConfig = replayGame.cfg;
      replayGame.cfg = playbackRun.configSnapshot;
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
    if (previousReplayConfig && playbackRun?.configSnapshot && replayGame) {
      replayGame.cfg = previousReplayConfig;
    }
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
  const normalized = normalizePlayerIcons(nextIcons ?? playerIcons, { allowEmpty: true });
  playerIcons = normalized;
  iconLookup.setIcons(playerIcons);
  net.icons = normalized.map((i) => ({ ...i }));
  clearIconSpriteCache();
  playerImg = getCachedIconSprite(iconLookup.getById(currentIconId) || iconLookup.getFallback());
  game?.setPlayerImage(playerImg);
  trailPreview?.setPlayerImage(playerImg);
  syncLauncherSwatch(currentIconId, playerIcons, playerImg);
  syncUnlockablesCatalog({ icons: playerIcons });
  syncMenuProfileBindingsFromState();
  iconMenuController?.refreshIconMenu?.(currentIconId);
}

function syncPipeTextureCatalog(nextTextures = null) {
  const normalized = normalizePipeTextures(nextTextures || net.pipeTextures, { allowEmpty: true });
  net.pipeTextures = normalized.map((t) => ({ ...t }));
  syncUnlockablesCatalog({ pipeTextures: net.pipeTextures });
  syncMenuProfileBindingsFromState();
}

const resolveAchievementsState = () => net.user?.achievements || net.achievements?.state;
const computeUnlockedPipeTextureSetForMenu = (textures = net.pipeTextures) => computeUnlockedPipeTextureSet({
  textures,
  user: net.user,
  achievementsState: resolveAchievementsState(),
  unlockables: net.unlockables?.unlockables
});
function getOwnedUnlockables(user = net.user) {
  if (!user) return [];
  if (Array.isArray(user.ownedUnlockables)) return user.ownedUnlockables;
  if (Array.isArray(user.ownedIcons)) return user.ownedIcons;
  return [];
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
  paintPipeTextureSwatch(canvas, target?.id || DEFAULT_PIPE_TEXTURE_ID, {
    mode: currentPipeTextureMode,
    base,
    strokeColor: CFG?.pipes?.colors?.stroke,
    strokeWidth: CFG?.pipes?.strokeWidth
  });
}

const refreshIconMenu = (...args) => iconMenuController.refreshIconMenu(...args);

function renderPipeTextureMenuOptions(
  selectedId = currentPipeTextureId,
  unlocked = computeUnlockedPipeTextureSetForMenu(net.pipeTextures),
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
    paintPipeTextureSwatch(canvas, texture.id, {
      mode: currentPipeTextureMode,
      base,
      strokeColor: CFG?.pipes?.colors?.stroke,
      strokeWidth: CFG?.pipes?.strokeWidth
    });
  });
  if (pipeTextureHint) {
    const text = rendered ? DEFAULT_PIPE_TEXTURE_HINT : "No pipe textures available.";
    pipeTextureHint.className = rendered ? "hint" : "hint bad";
    pipeTextureHint.textContent = text;
  }
  return rendered;
}

const applyIconSelection = (...args) => iconMenuController.applyIconSelection(...args);

function applyPipeTextureSelection(
  id = currentPipeTextureId,
  textures = net.pipeTextures,
  unlocked = computeUnlockedPipeTextureSetForMenu(textures)
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

const applyTrailSelection = (...args) => trailMenuController.applyTrailSelection(...args);
const setTrailHint = (...args) => trailMenuController.setTrailHint(...args);
const resumeTrailPreview = (...args) => trailMenuController.resumeTrailPreview(...args);
const pauseTrailPreview = (...args) => trailMenuController.pauseTrailPreview(...args);
const refreshTrailMenu = (...args) => trailMenuController.refreshTrailMenu(...args);
const getLastTrailHint = () => trailMenuController.getLastTrailHint();

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
  const unlocked = computeUnlockedPipeTextureSetForMenu(net.pipeTextures);
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
  if (res.trails) net.trails = mergeTrailCatalog(res.trails, { current: net.trails });
  if (res.icons) syncIconCatalog(res.icons);
  if (res.pipeTextures) syncPipeTextureCatalog(res.pipeTextures);
  syncUnlockablesCatalog({ trails: net.trails });

  refreshTrailMenu();
  refreshPipeTextureMenu(currentPipeTextureId);
  refreshIconMenu(currentIconId);
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
  const definitions = resolveAchievementDefinitions(
    payload.definitions?.length ? payload.definitions : net.achievements?.definitions
  );
  const state = normalizeAchievementState(payload.state || payload);
  net.achievements = { definitions, state };
  if (net.user) net.user.achievements = state;
  renderAchievements({ definitions, state });
  notifyAchievements(payload.unlocked);
  gameOverStatsController.update({ achievementsState: state, skillTotals: net.user?.skillTotals });
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
  const definitions = resolveAchievementDefinitions(net.achievements?.definitions);
  const { unlocked } = evaluateRunForAchievements({
    previous: runAchievementBaseState,
    runStats,
    score: runStats.totalScore,
    totalScore: net.user?.totalScore,
    totalRuns: net.user?.runs,
    bestScore: net.user?.bestScore,
    now: Date.now(),
    definitions
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
  if (extremeLowDetailToggle) extremeLowDetailToggle.checked = normalized.extremeLowDetail;
  if (reduceMotionToggle) reduceMotionToggle.checked = normalized.reduceMotion;
  if (typeof window !== "undefined") window.__reduceMotion = normalized.reduceMotion;
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
  apiSync,
  apiRegister,
  apiSetKeybinds,
  setMenuSubtitle,
  formatWorldwideRuns,
  net,
  setNetUser,
  mergeTrailCatalog,
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
  refreshBootUI: refreshBootUIWrapper,
  playerIcons,
  getPlayerIcons: () => playerIcons,
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
      net.trails = mergeTrailCatalog(res.trails, { current: net.trails });
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
  getLastTrailHint,
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
  mergeTrailCatalog,
  syncUnlockablesCatalog,
  syncIconCatalog,
  syncPipeTextureCatalog,
  applyIconSelection,
  getAuthStatusFromResponse,
  recoverSession,
  getTrailMenuState,
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
  computeUnlockedPipeTextureSet: computeUnlockedPipeTextureSetForMenu,
  openPurchaseModal,
  applyPipeTextureSelection,
  shouldTriggerSelectionSave,
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
  getIconMenuState,
  openPurchaseModal,
  applyIconSelection,
  ensureLoggedInForSave,
  apiSetIcon,
  classifyIconSaveResponse,
  setNetUser,
  mergeTrailCatalog,
  syncUnlockablesCatalog,
  syncIconCatalog,
  syncPipeTextureCatalog,
  setUserHint,
  recoverSession,
  refreshIconMenu,
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
reduceMotionToggle?.addEventListener("change", () => {
  updateSkillSettings({ ...skillSettings, reduceMotion: reduceMotionToggle.checked });
});
extremeLowDetailToggle?.addEventListener("change", () => {
  updateSkillSettings({ ...skillSettings, extremeLowDetail: extremeLowDetailToggle.checked });
});

overStatsToggle?.addEventListener("click", () => {
  const nextView = gameOverStatsController.getCurrentView() === GAME_OVER_STAT_VIEWS.lifetime
    ? GAME_OVER_STAT_VIEWS.run
    : GAME_OVER_STAT_VIEWS.lifetime;
  gameOverStatsController.update({
    view: nextView,
    runStats: gameOverStatsController.getLastRunStats(),
    achievementsState: net.user?.achievements,
    skillTotals: net.user?.skillTotals
  });
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
      const lastHint = getLastTrailHint();
      if (lastHint) setTrailHint(lastHint, { persist: false });
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
    activeRun.cosmetics = resolveCosmetics();
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
  gameOverStatsController.setLastRunStats(runStats);
  gameOverStatsController.setCurrentView(GAME_OVER_STAT_VIEWS.run);
  renderScoreBreakdown(scoreBreakdown, runStats, finalScore);
  updatePersonalBestUIWrapper(finalScore, net.user?.bestScore);
  gameOverStatsController.update({
    view: gameOverStatsController.getCurrentView(),
    runStats,
    achievementsState: net.user?.achievements,
    skillTotals: net.user?.skillTotals
  });

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
      net.trails = mergeTrailCatalog(res.trails, { current: net.trails });
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
      gameOverStatsController.update({
        runStats,
        achievementsState: net.user.achievements,
        skillTotals: net.user?.skillTotals
      });
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
      gameOverStatsController.update({
        runStats,
        achievementsState: net.user?.achievements,
        skillTotals: net.user?.skillTotals
      });
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

    const renderAlpha = clamp(acc / SIM_DT, 0, 1);
    game.render(renderAlpha);
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

  volumeController.primeVolumeControls();
  refreshIconMenu(currentIconId);

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

  const trailStyleRes = await apiGetTrailStyles();
  if (trailStyleRes?.overrides && typeof trailStyleRes.overrides === "object") {
    net.trailStyleOverrides = trailStyleRes.overrides;
    setTrailStyleOverrides(trailStyleRes.overrides);
  }

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
        red: values.pipeRed,
        stroke: values.pipeStroke
      };
      if (replayGame.cfg?.pipes?.colors) {
        replayGame.cfg.pipes.colors = {
          green: values.pipeGreen,
          blue: values.pipeBlue,
          wisteria: values.pipeWisteria,
          red: values.pipeRed,
          stroke: values.pipeStroke
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
  refreshBootUIWrapper();

  resumeTrailPreview(net.user?.selectedTrail || currentTrailId || "classic");
  requestAnimationFrame((t) => {
    lastTs = t;
    requestAnimationFrame(frame);
  });
})();
