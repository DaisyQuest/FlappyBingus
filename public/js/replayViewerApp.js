import { loadConfig } from "./config.js";
import { Game } from "./game.js";
import { GameDriver } from "/engine/gameDriver.js";
import { DEFAULT_KEYBINDS } from "./keybinds.js";
import { createSeededRand, createTapeRandPlayer, setRandSource } from "./util.js";
import { hydrateBestRunPayload } from "./bestRunRecorder.js";
import { apiGetBestRun } from "./api.js";
import { DEFAULT_PLAYER_ICONS } from "./playerIcons.js";
import { createPlayerIconSprite } from "./playerIconSprites.js";
import { createReplayManager } from "./replayManager.js";
import { playbackTicks } from "./replayUtils.js";
import { Input } from "./input.js";
import { mapGameDriverState } from "./gameDriverState.js";

const SIM_DT = 1 / 120;

function resolveUi(documentRef) {
  return {
    canvas: documentRef.getElementById("replayCanvas"),
    usernameInput: documentRef.getElementById("replayUsername"),
    loadButton: documentRef.getElementById("loadReplay"),
    playPause: documentRef.getElementById("playPause"),
    restart: documentRef.getElementById("restartReplay"),
    status: documentRef.getElementById("replayStatus")
  };
}

export function createReplayViewerApp({
  documentRef = document,
  windowRef = window,
  configSeed = windowRef?.__REPLAY_VIEWER__ || {},
  loadConfigFn = loadConfig,
  apiGetBestRunFn = apiGetBestRun,
  hydrateBestRunPayloadFn = hydrateBestRunPayload,
  createReplayManagerFn = createReplayManager,
  createPlayerIconSpriteFn = createPlayerIconSprite,
  createTapeRandPlayerFn = createTapeRandPlayer,
  createSeededRandFn = createSeededRand,
  setRandSourceFn = setRandSource,
  playbackTicksFn = playbackTicks,
  GameClass = Game,
  GameDriverClass = GameDriver,
  InputClass = Input,
  defaultIcons = DEFAULT_PLAYER_ICONS,
  defaultKeybinds = DEFAULT_KEYBINDS,
  requestFrame = windowRef?.requestAnimationFrame
} = {}) {
  const ui = resolveUi(documentRef);

  if (ui.usernameInput && configSeed.username) {
    ui.usernameInput.value = configSeed.username;
  }

  const setStatus = (text, { tone = "info" } = {}) => {
    if (!ui.status) return;
    ui.status.textContent = text;
    ui.status.dataset.tone = tone;
  };

  const setControlsEnabled = (enabled) => {
    const controls = [ui.playPause, ui.restart];
    controls.forEach((el) => {
      if (el) el.disabled = !enabled;
    });
  };

  const getUsername = () => String(ui.usernameInput?.value || "").trim();

  function resizeCanvas(game) {
    if (!ui.canvas || !game) return;
    const rect = ui.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    game.resizeToRect?.(width, height);
    game.render?.();
  }

  let game = null;
  let driver = null;
  let input = null;
  let activeRun = null;
  let replayManager = null;
  let playing = false;

  async function initGame() {
    if (!ui.canvas) return null;
    const { config } = await loadConfigFn();
    const playerIcon = defaultIcons[0] || { id: "default" };
    const playerImg = createPlayerIconSpriteFn(playerIcon, { size: 96 });

    input = new InputClass(ui.canvas, () => defaultKeybinds, (actionId) => {
      if (game?.state === 1 /* PLAY */) {
        replayManager?.queueAction({
          id: actionId,
          cursor: { x: input.cursor.x, y: input.cursor.y, has: input.cursor.has }
        });
      }
    });
    input.install?.();

    game = new GameClass({
      canvas: ui.canvas,
      ctx: ui.canvas.getContext("2d"),
      config,
      playerImg,
      input,
      getTrailId: () => "classic",
      getPipeTexture: () => ({ id: "basic", mode: "NORMAL" }),
      getBinds: () => defaultKeybinds,
      onGameOver: () => {}
    });

    driver = new GameDriverClass({
      game,
      syncRandSource: setRandSourceFn,
      captureSnapshots: false,
      mapState: mapGameDriverState
    });

    resizeCanvas(game);
    windowRef?.addEventListener?.("resize", () => resizeCanvas(game));
    windowRef?.visualViewport?.addEventListener?.("resize", () => resizeCanvas(game));

    replayManager = createReplayManagerFn({
      canvas: ui.canvas,
      game,
      input,
      menu: null,
      over: null,
      setRandSource: setRandSourceFn,
      tapePlayer: createTapeRandPlayerFn,
      seededRand: createSeededRandFn,
      playbackTicks: playbackTicksFn,
      simDt: SIM_DT,
      requestFrame,
      onStatus: (payload) => {
        if (!payload?.text) return;
        const tone = payload.className?.includes("bad")
          ? "bad"
          : payload.className?.includes("good")
            ? "good"
            : "info";
        setStatus(payload.text, { tone });
      },
      step: driver ? (dt, actions) => driver.step(dt, actions) : null
    });

    setControlsEnabled(false);
    return replayManager;
  }

  async function loadReplay() {
    const username = getUsername();
    if (!username) {
      setStatus("Enter a username to load a replay.", { tone: "warn" });
      setControlsEnabled(false);
      return;
    }

    setStatus(`Loading ${username}'s replay…`);
    try {
      const res = await apiGetBestRunFn(username);
      if (!res?.ok || !res.run) {
        setStatus("Replay not available for this player.", { tone: "bad" });
        setControlsEnabled(false);
        return;
      }
      const hydrated = hydrateBestRunPayloadFn(res.run);
      if (!hydrated) {
        setStatus("Replay data is invalid.", { tone: "bad" });
        setControlsEnabled(false);
        return;
      }
      activeRun = hydrated;
      setControlsEnabled(true);
      setStatus(`Loaded ${username}'s replay.`, { tone: "good" });
    } catch (err) {
      console.error(err);
      setStatus("Unable to load replay.", { tone: "bad" });
      setControlsEnabled(false);
    }
  }

  async function playReplay() {
    if (!replayManager || !activeRun) return;
    if (playing) return;
    playing = true;
    if (ui.playPause) ui.playPause.textContent = "Playing…";
    setControlsEnabled(false);
    try {
      await replayManager.play({ captureMode: "none", run: activeRun });
      setStatus("Replay finished.", { tone: "good" });
    } catch (err) {
      console.error(err);
      setStatus("Unable to play replay.", { tone: "bad" });
    } finally {
      playing = false;
      if (ui.playPause) ui.playPause.textContent = "Play";
      setControlsEnabled(Boolean(activeRun));
    }
  }

  function bindControls() {
    ui.loadButton?.addEventListener("click", () => loadReplay());
    ui.usernameInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") loadReplay();
    });
    ui.playPause?.addEventListener("click", () => playReplay());
    ui.restart?.addEventListener("click", () => playReplay());
  }

  async function init() {
    await initGame();
    bindControls();
    if (getUsername()) {
      loadReplay();
    }
  }

  return {
    init,
    loadReplay,
    playReplay,
    setStatus,
    setControlsEnabled,
    getState: () => ({ game, driver, input, activeRun, replayManager, playing })
  };
}
