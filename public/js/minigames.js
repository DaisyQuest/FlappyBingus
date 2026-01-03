// =====================
// FILE: public/js/minigames.js
// =====================
const ORBITAL_TARGET = 5;
const STREAK_TARGET = 3;
const LANTERN_COUNT = 4;
const PULSE_TARGET = 3;

const DIRECTIONS = ["Left", "Right"];
const LANES = ["Left", "Center", "Right"];

const MINIGAME_DEFINITIONS = [
  {
    id: "orbital-relay",
    title: "Orbital Relay",
    summary: "Chain floating orbs before the orbit collapses and keep the combo alive.",
    instructions: `Collect ${ORBITAL_TARGET} orbs to stabilize the relay.`,
    build: createOrbitalRelay
  },
  {
    id: "gust-runner",
    title: "Gust Runner",
    summary: "Ride shifting wind lanes to stay airborne while the tunnels reshuffle.",
    instructions: `Match ${STREAK_TARGET} wind lanes in a row.`,
    build: createGustRunner
  },
  {
    id: "mirror-dash",
    title: "Mirror Dash",
    summary: "Every dash spawns a mirrored ghost—avoid syncing with your past self.",
    instructions: `Dash opposite the ghost ${STREAK_TARGET} times.`,
    build: createMirrorDash
  },
  {
    id: "lantern-drift",
    title: "Lantern Drift",
    summary: "Light beacon gates in sequence to restore visibility through the fog.",
    instructions: `Light ${LANTERN_COUNT} lanterns in order.`,
    build: createLanternDrift
  },
  {
    id: "pulse-hatch",
    title: "Pulse Hatch",
    summary: "Tap to match pulsing pipes and hatch bonus lanes for massive score jumps.",
    instructions: `Hatch ${PULSE_TARGET} pulses while the meter surges.`,
    build: createPulseHatch
  }
];

function clearStage(stage) {
  if (!stage) return;
  stage.innerHTML = "";
}

function setStatus(status, text) {
  if (!status) return;
  status.textContent = text;
}

function clampIndex(value, max) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value >= max) return max - 1;
  return value;
}

function createSequenceRng(sequence) {
  let index = 0;
  return () => {
    if (!sequence?.length) return 0;
    const value = sequence[clampIndex(index, sequence.length)];
    index += 1;
    return value;
  };
}

function pickFrom(list, rng) {
  const roll = rng?.() ?? Math.random();
  const index = clampIndex(Math.floor(roll * list.length), list.length);
  return list[index];
}

function createOrbitalRelay({ stage, status }) {
  const doc = stage?.ownerDocument || document;
  let count = 0;
  let complete = false;

  const label = doc.createElement("div");
  label.className = "minigame-title";
  const action = doc.createElement("button");
  action.className = "cta-btn";
  action.type = "button";
  action.textContent = "Collect Orb";

  const update = () => {
    label.textContent = `Orbs collected: ${count}/${ORBITAL_TARGET}`;
    if (complete) {
      action.disabled = true;
      setStatus(status, "Relay stabilized! Great job.");
    } else {
      action.disabled = false;
      setStatus(status, `Collect ${ORBITAL_TARGET} orbs to stabilize the relay.`);
    }
  };

  const onCollect = () => {
    if (complete) return;
    count += 1;
    if (count >= ORBITAL_TARGET) {
      complete = true;
    }
    update();
  };

  action.addEventListener("click", onCollect);
  stage.append(label, action);
  update();

  return {
    reset() {
      count = 0;
      complete = false;
      update();
    },
    destroy() {
      action.removeEventListener("click", onCollect);
    }
  };
}

function createGustRunner({ stage, status, rng }) {
  const doc = stage?.ownerDocument || document;
  let streak = 0;
  let complete = false;
  let wind = pickFrom(LANES, rng);

  const windDisplay = doc.createElement("div");
  windDisplay.className = "minigame-title";

  const actions = doc.createElement("div");
  actions.className = "minigames-actions";

  const buttons = LANES.map((lane) => {
    const button = doc.createElement("button");
    button.className = "cta-btn";
    button.type = "button";
    button.textContent = lane;
    actions.append(button);
    return button;
  });
  const handlers = new Map();

  const update = () => {
    windDisplay.textContent = `Wind lane: ${wind}`;
    if (complete) {
      buttons.forEach((button) => { button.disabled = true; });
      setStatus(status, "You rode the gust perfectly!");
      return;
    }
    buttons.forEach((button) => { button.disabled = false; });
    setStatus(status, `Streak: ${streak}/${STREAK_TARGET}`);
  };

  const chooseLane = (lane) => {
    if (complete) return;
    if (lane === wind) {
      streak += 1;
    } else {
      streak = 0;
    }
    if (streak >= STREAK_TARGET) {
      complete = true;
    } else {
      wind = pickFrom(LANES, rng);
    }
    update();
  };

  buttons.forEach((button) => {
    const handler = () => chooseLane(button.textContent);
    handlers.set(button, handler);
    button.addEventListener("click", handler);
  });

  stage.append(windDisplay, actions);
  update();

  return {
    reset() {
      streak = 0;
      complete = false;
      wind = pickFrom(LANES, rng);
      update();
    },
    destroy() {
      handlers.forEach((handler, button) => {
        button.removeEventListener("click", handler);
      });
    }
  };
}

function createMirrorDash({ stage, status, rng }) {
  const doc = stage?.ownerDocument || document;
  let streak = 0;
  let complete = false;
  let ghost = pickFrom(DIRECTIONS, rng);

  const ghostDisplay = doc.createElement("div");
  ghostDisplay.className = "minigame-title";
  const actions = doc.createElement("div");
  actions.className = "minigames-actions";

  const buttons = DIRECTIONS.map((dir) => {
    const button = doc.createElement("button");
    button.className = "cta-btn";
    button.type = "button";
    button.textContent = dir;
    actions.append(button);
    return button;
  });
  const handlers = new Map();

  const update = () => {
    ghostDisplay.textContent = `Ghost dashes: ${ghost}`;
    if (complete) {
      buttons.forEach((button) => { button.disabled = true; });
      setStatus(status, "Mirror mastery achieved!");
      return;
    }
    buttons.forEach((button) => { button.disabled = false; });
    setStatus(status, `Opposite streak: ${streak}/${STREAK_TARGET}`);
  };

  const chooseDash = (dir) => {
    if (complete) return;
    const isOpposite = dir !== ghost;
    if (isOpposite) {
      streak += 1;
    } else {
      streak = 0;
    }
    if (streak >= STREAK_TARGET) {
      complete = true;
    } else {
      ghost = pickFrom(DIRECTIONS, rng);
    }
    update();
  };

  buttons.forEach((button) => {
    const handler = () => chooseDash(button.textContent);
    handlers.set(button, handler);
    button.addEventListener("click", handler);
  });

  stage.append(ghostDisplay, actions);
  update();

  return {
    reset() {
      streak = 0;
      complete = false;
      ghost = pickFrom(DIRECTIONS, rng);
      update();
    },
    destroy() {
      handlers.forEach((handler, button) => {
        button.removeEventListener("click", handler);
      });
    }
  };
}

function createLanternDrift({ stage, status, rng }) {
  const doc = stage?.ownerDocument || document;
  let order = [];
  let index = 0;
  let complete = false;

  const title = doc.createElement("div");
  title.className = "minigame-title";

  const actions = doc.createElement("div");
  actions.className = "minigames-actions";

  const buttons = Array.from({ length: LANTERN_COUNT }, (_, i) => {
    const button = doc.createElement("button");
    button.className = "cta-btn";
    button.type = "button";
    button.textContent = `Lantern ${i + 1}`;
    actions.append(button);
    return button;
  });
  const handlers = new Map();

  const buildOrder = () => {
    const base = buttons.map((button) => button.textContent);
    order = base.sort(() => (rng?.() ?? Math.random()) - 0.5);
  };

  const update = () => {
    title.textContent = `Next: ${order[index] ?? "Complete"}`;
    if (complete) {
      buttons.forEach((button) => { button.disabled = true; });
      setStatus(status, "All lanterns aligned!");
      return;
    }
    buttons.forEach((button) => { button.disabled = false; });
    setStatus(status, `Lit ${index}/${LANTERN_COUNT} lanterns.`);
  };

  const resetLanterns = () => {
    buttons.forEach((button) => button.classList.remove("selected"));
  };

  const selectLantern = (label, button) => {
    if (complete) return;
    if (label === order[index]) {
      button.classList.add("selected");
      index += 1;
    } else {
      index = 0;
      resetLanterns();
    }
    if (index >= LANTERN_COUNT) {
      complete = true;
    }
    update();
  };

  buttons.forEach((button) => {
    const handler = () => selectLantern(button.textContent, button);
    handlers.set(button, handler);
    button.addEventListener("click", handler);
  });

  buildOrder();
  stage.append(title, actions);
  update();

  return {
    reset() {
      index = 0;
      complete = false;
      resetLanterns();
      buildOrder();
      update();
    },
    destroy() {
      handlers.forEach((handler, button) => {
        button.removeEventListener("click", handler);
      });
    }
  };
}

function createPulseHatch({ stage, status }) {
  const doc = stage?.ownerDocument || document;
  let pulse = 0;
  let hatchCount = 0;
  let complete = false;

  const display = doc.createElement("div");
  display.className = "minigame-title";

  const actions = doc.createElement("div");
  actions.className = "minigames-actions";
  const pulseBtn = doc.createElement("button");
  pulseBtn.className = "cta-btn";
  pulseBtn.type = "button";
  pulseBtn.textContent = "Pulse";
  const hatchBtn = doc.createElement("button");
  hatchBtn.className = "cta-btn";
  hatchBtn.type = "button";
  hatchBtn.textContent = "Hatch";
  actions.append(pulseBtn, hatchBtn);

  const update = () => {
    const state = pulse % 2 === 0 ? "Calm" : "Surge";
    display.textContent = `Pulse meter: ${state}`;
    if (complete) {
      pulseBtn.disabled = true;
      hatchBtn.disabled = true;
      setStatus(status, "Bonus lanes unlocked!");
      return;
    }
    pulseBtn.disabled = false;
    hatchBtn.disabled = false;
    setStatus(status, `Hatches: ${hatchCount}/${PULSE_TARGET}`);
  };

  const onPulse = () => {
    if (complete) return;
    pulse += 1;
    update();
  };

  const onHatch = () => {
    if (complete) return;
    if (pulse % 2 === 1) {
      hatchCount += 1;
    }
    if (hatchCount >= PULSE_TARGET) {
      complete = true;
    }
    update();
  };

  pulseBtn.addEventListener("click", onPulse);
  hatchBtn.addEventListener("click", onHatch);

  stage.append(display, actions);
  update();

  return {
    reset() {
      pulse = 0;
      hatchCount = 0;
      complete = false;
      update();
    },
    destroy() {
      pulseBtn.removeEventListener("click", onPulse);
      hatchBtn.removeEventListener("click", onHatch);
    }
  };
}

function setMinigamesOverlayOpen(refs, open) {
  if (!refs?.minigamesOverlay) return false;
  const shouldOpen = Boolean(open);
  refs.minigamesOverlay.classList.toggle("hidden", !shouldOpen);
  refs.minigamesOverlay.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  return shouldOpen;
}

function initMinigames({ ui, document, rngs = {} } = {}) {
  const refs = ui ?? {};
  const doc = document || refs.minigamesOverlay?.ownerDocument || (typeof window !== "undefined" ? window.document : null);
  const {
    minigamesOverlay,
    minigamesList,
    minigamesDetailTitle,
    minigamesDetailSummary,
    minigamesDetailInstructions,
    minigamesStage,
    minigamesStart,
    minigamesReset,
    minigamesLauncher,
    minigamesClose
  } = refs;

  if (!doc || !minigamesOverlay || !minigamesList || !minigamesDetailTitle || !minigamesDetailSummary
    || !minigamesDetailInstructions || !minigamesStage || !minigamesStart || !minigamesReset
    || !minigamesLauncher || !minigamesClose) {
    return null;
  }

  let activeDef = null;
  let activeSession = null;

  const listButtons = MINIGAME_DEFINITIONS.map((def) => {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "minigame-card";
    button.dataset.minigameId = def.id;

    const title = doc.createElement("div");
    title.className = "minigame-title";
    title.textContent = def.title;
    const summary = doc.createElement("div");
    summary.className = "minigame-desc";
    summary.textContent = def.summary;

    button.append(title, summary);
    minigamesList.append(button);
    return button;
  });

  const teardownSession = () => {
    if (activeSession?.destroy) {
      activeSession.destroy();
    }
    activeSession = null;
  };

  const updateSelection = (nextDef) => {
    if (!nextDef) return false;
    activeDef = nextDef;
    listButtons.forEach((button) => {
      button.classList.toggle("selected", button.dataset.minigameId === nextDef.id);
    });
    minigamesDetailTitle.textContent = nextDef.title;
    minigamesDetailSummary.textContent = nextDef.summary;
    minigamesDetailInstructions.textContent = nextDef.instructions;
    minigamesStart.textContent = "Start";
    minigamesReset.disabled = true;
    teardownSession();
    clearStage(minigamesStage);
    setStatus(minigamesDetailInstructions, nextDef.instructions);
    return true;
  };

  const startMinigame = () => {
    if (!activeDef) return false;
    teardownSession();
    clearStage(minigamesStage);
    const rng = rngs[activeDef.id];
    activeSession = activeDef.build({
      stage: minigamesStage,
      status: minigamesDetailInstructions,
      rng
    });
    minigamesReset.disabled = false;
    minigamesStart.textContent = "Restart";
    return true;
  };

  const resetMinigame = () => {
    if (!activeSession?.reset) return false;
    activeSession.reset();
    return true;
  };

  const onListClick = (event) => {
    const button = event.target.closest("button[data-minigame-id]");
    if (!button) return;
    const def = MINIGAME_DEFINITIONS.find((entry) => entry.id === button.dataset.minigameId);
    if (def) updateSelection(def);
  };

  minigamesList.addEventListener("click", onListClick);
  minigamesStart.addEventListener("click", startMinigame);
  minigamesReset.addEventListener("click", resetMinigame);
  minigamesLauncher.addEventListener("click", () => setMinigamesOverlayOpen(refs, true));
  minigamesClose.addEventListener("click", () => {
    setMinigamesOverlayOpen(refs, false);
    teardownSession();
    clearStage(minigamesStage);
  });

  updateSelection(MINIGAME_DEFINITIONS[0]);

  return {
    destroy() {
      teardownSession();
      minigamesList.removeEventListener("click", onListClick);
      minigamesStart.removeEventListener("click", startMinigame);
      minigamesReset.removeEventListener("click", resetMinigame);
      minigamesLauncher.replaceWith(minigamesLauncher.cloneNode(true));
      minigamesClose.replaceWith(minigamesClose.cloneNode(true));
    }
  };
}

export {
  MINIGAME_DEFINITIONS,
  initMinigames,
  setMinigamesOverlayOpen,
  createSequenceRng
};

export const __testables = {
  createOrbitalRelay,
  createGustRunner,
  createMirrorDash,
  createLanternDrift,
  createPulseHatch,
  clampIndex,
  pickFrom
};
