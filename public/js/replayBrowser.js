import { loadConfig } from "./config.js";
import { Game } from "./game.js";
import { DEFAULT_PLAYER_ICON_ID, DEFAULT_PLAYER_ICONS } from "./playerIcons.js";
import { DEFAULT_PIPE_TEXTURE_ID, DEFAULT_PIPE_TEXTURE_MODE, normalizePipeTextureMode } from "./pipeTextures.js";
import { getCachedIconSprite } from "./swatchPainter.js";
import { createReplayPlaybackController } from "./replayBrowserPlayer.js";
import { createSeededRand, createTapeRandPlayer, setRandSource } from "./util.js";
import { chooseReplayRandSource } from "./replayUtils.js";
import { hydrateBestRunPayload } from "./bestRunRecorder.js";
import { formatReplayMeta, renderReplayDetails } from "./replayDetails.js";

const DEFAULT_LIMIT = 200;

export function filterReplays(replays, { query = "", minScore = 0, minDuration = 0 } = {}) {
  const q = String(query || "").trim().toLowerCase();
  const minScoreNum = Number(minScore) || 0;
  const minDurationMs = (Number(minDuration) || 0) * 1000;

  return (Array.isArray(replays) ? replays : []).filter((entry) => {
    const name = String(entry?.username || "").toLowerCase();
    if (q && !name.includes(q)) return false;
    if ((Number(entry?.bestScore) || 0) < minScoreNum) return false;
    if ((Number(entry?.durationMs) || 0) < minDurationMs) return false;
    return true;
  });
}

export function sortReplays(replays, sortMode = "score") {
  const list = (Array.isArray(replays) ? replays.slice() : []);
  if (sortMode === "recent") {
    return list.sort((a, b) => (Number(b.recordedAt) || 0) - (Number(a.recordedAt) || 0) || String(a.username).localeCompare(String(b.username)));
  }
  if (sortMode === "duration") {
    return list.sort((a, b) => (Number(b.durationMs) || 0) - (Number(a.durationMs) || 0) || (Number(b.bestScore) || 0) - (Number(a.bestScore) || 0));
  }
  return list.sort((a, b) => (Number(b.bestScore) || 0) - (Number(a.bestScore) || 0) || (Number(b.recordedAt) || 0) - (Number(a.recordedAt) || 0));
}

function createCard(doc, entry, { onSelect, isActive } = {}) {
  const meta = formatReplayMeta(entry);
  const card = doc.createElement("button");
  card.type = "button";
  card.className = "replay-card" + (isActive ? " active" : "");
  card.dataset.username = entry.username || "";

  const title = doc.createElement("div");
  title.className = "replay-card-title";
  title.textContent = entry.username || "Unknown";

  const score = doc.createElement("div");
  score.className = "replay-card-score";
  score.textContent = `${meta.score.toLocaleString()} pts`;

  const details = doc.createElement("div");
  details.className = "replay-card-details";
  details.textContent = `${meta.duration} • ${meta.ticks} ticks`;

  card.append(title, score, details);
  if (typeof onSelect === "function") {
    card.addEventListener("click", () => onSelect(entry));
  }
  return card;
}

function renderReplayList({ container, entries, onSelect, activeUsername }) {
  if (!container) return;
  container.innerHTML = "";
  if (!entries.length) {
    const empty = container.ownerDocument.createElement("div");
    empty.className = "replay-empty";
    empty.textContent = "No replays match these filters.";
    container.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    container.appendChild(
      createCard(container.ownerDocument, entry, {
        onSelect,
        isActive: activeUsername && entry.username === activeUsername
      })
    );
  });
}

export { formatReplayMeta };

async function fetchReplayList(limit = DEFAULT_LIMIT) {
  const res = await fetch(`/api/replays?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load replays (${res.status})`);
  const payload = await res.json();
  if (!payload?.ok) throw new Error(payload?.error || "Failed to load replays");
  return payload.replays || [];
}

async function fetchReplayRun(username) {
  const res = await fetch(`/api/run/best?username=${encodeURIComponent(username)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const payload = await res.json();
  if (!payload?.ok) return null;
  return hydrateBestRunPayload(payload.run);
}

function configureRandSources({ run, game }) {
  if (!run) return;
  const replayRand = chooseReplayRandSource(run, {
    tapePlayer: createTapeRandPlayer,
    seededRand: createSeededRand
  });
  if (replayRand) setRandSource(replayRand);
  if (typeof game?.setBackgroundRand === "function") {
    const bgSeed = run.backgroundSeed || (run.seed ? `${run.seed}:background` : "");
    if (bgSeed) game.setBackgroundRand(createSeededRand(bgSeed));
  }
  if (typeof game?.setVisualRand === "function") {
    const visualSeed = run.visualSeed || (run.seed ? `${run.seed}:visual` : "");
    if (visualSeed) game.setVisualRand(createSeededRand(visualSeed));
  }
}

export async function initReplayBrowser(root = document.querySelector("[data-replay-browser]")) {
  if (!root) return null;
  const doc = root.ownerDocument || document;
  const canvas = doc.getElementById("replayCanvas");
  const status = doc.getElementById("replayStatus");
  const listWrap = doc.getElementById("replayList");
  const countEl = doc.getElementById("replayCount");
  const filterInput = doc.getElementById("replayFilterInput");
  const minScoreInput = doc.getElementById("replayMinScore");
  const minDurationInput = doc.getElementById("replayMinDuration");
  const sortSelect = doc.getElementById("replaySort");
  const clearFiltersBtn = doc.getElementById("replayClearFilters");
  const refreshBtn = doc.getElementById("replayRefresh");
  const detailPanel = doc.getElementById("replayDetails");
  const playBtn = doc.getElementById("replayPlay");
  const pauseBtn = doc.getElementById("replayPause");
  const restartBtn = doc.getElementById("replayRestart");
  const stepBtn = doc.getElementById("replayStep");
  const speedSelect = doc.getElementById("replaySpeed");
  const progressFill = doc.getElementById("replayProgressFill");
  const progressMeta = doc.getElementById("replayProgressMeta");

  const { config } = await loadConfig();
  const ctx = canvas?.getContext("2d");
  const icon = DEFAULT_PLAYER_ICONS.find((entry) => entry.id === DEFAULT_PLAYER_ICON_ID) || DEFAULT_PLAYER_ICONS[0];
  const playerImg = getCachedIconSprite(icon);
  const defaultCosmetics = {
    trailId: "classic",
    iconId: icon.id,
    pipeTextureId: DEFAULT_PIPE_TEXTURE_ID,
    pipeTextureMode: DEFAULT_PIPE_TEXTURE_MODE
  };

  const game = new Game({
    canvas,
    ctx,
    config,
    playerImg,
    input: {
      cursor: { x: 0, y: 0, has: false },
      getMove: () => ({ dx: 0, dy: 0 })
    }
  });
  game.setAudioEnabled(false);
  game.resizeToWindow();
  game.setStateMenu();

  const applyReplayCosmetics = (cosmetics) => {
    const resolved = {
      trailId: typeof cosmetics?.trailId === "string" && cosmetics.trailId.trim()
        ? cosmetics.trailId.trim()
        : defaultCosmetics.trailId,
      iconId: typeof cosmetics?.iconId === "string" && cosmetics.iconId.trim()
        ? cosmetics.iconId.trim()
        : defaultCosmetics.iconId,
      pipeTextureId: typeof cosmetics?.pipeTextureId === "string" && cosmetics.pipeTextureId.trim()
        ? cosmetics.pipeTextureId.trim()
        : defaultCosmetics.pipeTextureId,
      pipeTextureMode: normalizePipeTextureMode(cosmetics?.pipeTextureMode || defaultCosmetics.pipeTextureMode)
    };

    const prevGetTrailId = game.getTrailId;
    const prevGetPipeTexture = game.getPipeTexture;
    const prevPlayerImg = game.playerImg;
    game.getTrailId = () => resolved.trailId;
    game.getPipeTexture = () => ({ id: resolved.pipeTextureId, mode: resolved.pipeTextureMode });

    const nextIcon = DEFAULT_PLAYER_ICONS.find((entry) => entry.id === resolved.iconId) || icon;
    game.setPlayerImage(getCachedIconSprite(nextIcon));

    return () => {
      game.getTrailId = prevGetTrailId;
      game.getPipeTexture = prevGetPipeTexture;
      game.setPlayerImage(prevPlayerImg);
    };
  };

  const controller = createReplayPlaybackController({
    game,
    applyCosmetics: applyReplayCosmetics,
    onProgress: ({ index, total, playing, speed }) => {
      if (progressFill) {
        const pct = total > 0 ? Math.round((index / total) * 100) : 0;
        progressFill.style.width = `${pct}%`;
      }
      if (progressMeta) {
        progressMeta.textContent = `${index.toLocaleString()} / ${total.toLocaleString()} ticks`;
      }
      if (playBtn) playBtn.textContent = playing ? "Playing…" : "Play";
      if (pauseBtn) pauseBtn.textContent = playing ? "Pause" : "Paused";
      if (speedSelect) speedSelect.value = String(speed);
    }
  });

  let allReplays = [];
  let filtered = [];
  let selectedEntry = null;
  const runCache = new Map();

  const setStatus = (text, className = "") => {
    if (!status) return;
    status.textContent = text;
    status.className = ["replay-browser-status", className].filter(Boolean).join(" ");
  };

  const setControlsEnabled = (enabled) => {
    [playBtn, pauseBtn, restartBtn, stepBtn, speedSelect].forEach((el) => {
      if (!el) return;
      el.disabled = !enabled;
    });
  };

  const applyFilters = () => {
    const filterState = {
      query: filterInput?.value || "",
      minScore: minScoreInput?.value || 0,
      minDuration: minDurationInput?.value || 0
    };
    filtered = sortReplays(filterReplays(allReplays, filterState), sortSelect?.value || "score");
    renderReplayList({
      container: listWrap,
      entries: filtered,
      onSelect: handleSelect,
      activeUsername: selectedEntry?.username
    });
    if (countEl) {
      countEl.textContent = `${filtered.length.toLocaleString()} replay${filtered.length === 1 ? "" : "s"} shown`;
    }
  };

  const handleSelect = async (entry) => {
    if (!entry) return;
    selectedEntry = entry;
    setStatus(`Loading replay for ${entry.username}…`);
    renderReplayDetails({ container: detailPanel, entry, run: runCache.get(entry.username) || null });
    applyFilters();

    let run = runCache.get(entry.username);
    if (!run) {
      run = await fetchReplayRun(entry.username);
      if (run) runCache.set(entry.username, run);
    }

    if (!run) {
      setStatus("Replay data is unavailable.", "bad");
      setControlsEnabled(false);
      return;
    }

    configureRandSources({ run, game });
    controller.loadRun(run);
    renderReplayDetails({ container: detailPanel, entry, run });
    setStatus(`Ready to replay ${entry.username}.`);
    setControlsEnabled(true);
  };

  const reloadList = async () => {
    try {
      setStatus("Loading replays…");
      setControlsEnabled(false);
      allReplays = await fetchReplayList(DEFAULT_LIMIT);
      applyFilters();
      if (!allReplays.length) {
        setStatus("No saved replays yet.");
        renderReplayDetails({ container: detailPanel, entry: null });
        return;
      }
      setStatus("Select a replay to begin.");
    } catch (err) {
      console.error(err);
      setStatus("Unable to load replays right now.", "bad");
      if (countEl) countEl.textContent = "Replay list unavailable";
    }
  };

  filterInput?.addEventListener("input", applyFilters);
  minScoreInput?.addEventListener("input", applyFilters);
  minDurationInput?.addEventListener("input", applyFilters);
  sortSelect?.addEventListener("change", applyFilters);
  clearFiltersBtn?.addEventListener("click", () => {
    if (filterInput) filterInput.value = "";
    if (minScoreInput) minScoreInput.value = "";
    if (minDurationInput) minDurationInput.value = "";
    if (sortSelect) sortSelect.value = "score";
    applyFilters();
  });
  refreshBtn?.addEventListener("click", reloadList);

  playBtn?.addEventListener("click", () => {
    if (!controller.play()) setStatus("Select a replay first.", "bad");
  });
  pauseBtn?.addEventListener("click", () => controller.pause());
  restartBtn?.addEventListener("click", () => controller.restart());
  stepBtn?.addEventListener("click", () => controller.stepOnce());
  speedSelect?.addEventListener("change", () => controller.setSpeed(speedSelect.value));

  window.addEventListener("resize", () => game.resizeToWindow());
  window.visualViewport?.addEventListener("resize", () => game.resizeToWindow());

  await reloadList();
  return { game, controller };
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initReplayBrowser().catch((err) => console.error(err));
  });
}

export const __testables = {
  renderReplayList,
  renderReplayDetails
};
