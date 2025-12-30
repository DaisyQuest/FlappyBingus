import { loadConfig } from "./config.js";
import { Game } from "./game.js";
import { GameDriver } from "/engine/gameDriver.js";
import { DEFAULT_KEYBINDS } from "./keybinds.js";
import { createSeededRand, createTapeRandPlayer, setRandSource } from "./util.js";
import { chooseReplayRandSource } from "./replayUtils.js";
import { hydrateBestRunPayload } from "./bestRunRecorder.js";
import { apiGetBestRun } from "./api.js";
import { DEFAULT_PLAYER_ICONS } from "./playerIcons.js";
import { createPlayerIconSprite } from "./playerIconSprites.js";
import { createReplayManager } from "./replayManager.js";
import { playbackTicks } from "./replayUtils.js";

const SIM_DT = 1 / 120;

const ui = {
  canvas: document.getElementById("replayCanvas"),
  usernameInput: document.getElementById("replayUsername"),
  loadButton: document.getElementById("loadReplay"),
  playPause: document.getElementById("playPause"),
  restart: document.getElementById("restartReplay"),
  status: document.getElementById("replayStatus")
};

const configSeed = window.__REPLAY_VIEWER__ || {};
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

let playback = null;
let game = null;
let driver = null;
let replayInput = null;
let activeRun = null;
let replayManager = null;
let playing = false;

async function initGame() {
  if (!ui.canvas) return null;
  const { config } = await loadConfig();
  const playerIcon = DEFAULT_PLAYER_ICONS[0] || { id: "default" };
  const playerImg = createPlayerIconSprite(playerIcon, { size: 96 });
  replayInput = {
    cursor: { x: 0, y: 0, has: false },
    _move: { dx: 0, dy: 0 },
    getMove() {
      return this._move;
    }
  };
  game = new Game({
    canvas: ui.canvas,
    ctx: ui.canvas.getContext("2d"),
    config,
    playerImg,
    input: replayInput,
    getTrailId: () => "classic",
    getPipeTexture: () => ({ id: "basic", mode: "NORMAL" }),
    getBinds: () => DEFAULT_KEYBINDS,
    onGameOver: () => {}
  });

  driver = new GameDriver({
    game,
    syncRandSource: setRandSource,
    captureSnapshots: false
  });

  resizeCanvas(game);
  window.addEventListener("resize", () => resizeCanvas(game));
  window.visualViewport?.addEventListener("resize", () => resizeCanvas(game));

  replayManager = createReplayManager({
    game,
    input: { reset() {} },
    menu: null,
    over: null,
    setRandSource,
    tapePlayer: createTapeRandPlayer,
    seededRand: createSeededRand,
    playbackTicks,
    simDt: SIM_DT,
    requestFrame: requestAnimationFrame,
    onStatus: (payload) => {
      if (!payload?.text) return;
      const tone = payload.className?.includes("bad") ? "bad" : payload.className?.includes("good") ? "good" : "info";
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
    const res = await apiGetBestRun(username);
    if (!res?.ok || !res.run) {
      setStatus("Replay not available for this player.", { tone: "bad" });
      setControlsEnabled(false);
      return;
    }
    const hydrated = hydrateBestRunPayload(res.run);
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

initGame()
  .then(() => {
    bindControls();
    if (getUsername()) {
      loadReplay();
    }
  })
  .catch((err) => {
    console.error(err);
    setStatus("Replay viewer failed to initialize.", { tone: "bad" });
  });
