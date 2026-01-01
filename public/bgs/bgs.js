import { DEFAULT_BACKGROUND_CONFIG, createBackgroundStudioRenderer, normalizeBackgroundConfig } from "/js/backgroundStudioEngine.js";
import { loadBackgroundConfig, saveBackgroundConfig } from "/js/backgroundConfigApi.js";
import { formatRunDuration } from "/js/util.js";

const dom = {
  name: document.getElementById("bg-name"),
  loop: document.getElementById("bg-loop"),
  baseColor: document.getElementById("base-color"),
  baseColorText: document.getElementById("base-color-text"),
  gradientShape: document.getElementById("gradient-shape"),
  gradientColorA: document.getElementById("gradient-color-a"),
  gradientColorAText: document.getElementById("gradient-color-a-text"),
  gradientColorB: document.getElementById("gradient-color-b"),
  gradientColorBText: document.getElementById("gradient-color-b-text"),
  gradientOpacity: document.getElementById("gradient-opacity"),
  gradientAngle: document.getElementById("gradient-angle"),
  gradientRadius: document.getElementById("gradient-radius"),
  gradientAngleRow: document.getElementById("gradient-angle-row"),
  gradientRadiusRow: document.getElementById("gradient-radius-row"),
  glowColor: document.getElementById("glow-color"),
  glowColorText: document.getElementById("glow-color-text"),
  glowIntensity: document.getElementById("glow-intensity"),
  glowRadius: document.getElementById("glow-radius"),
  glowX: document.getElementById("glow-x"),
  glowY: document.getElementById("glow-y"),
  preview: document.getElementById("preview"),
  playbackToggle: document.getElementById("toggle-play"),
  playbackScrub: document.getElementById("playback-scrub"),
  playbackTime: document.getElementById("playback-time"),
  playbackDuration: document.getElementById("playback-duration"),
  timelineBar: document.getElementById("timeline-bar"),
  timelineList: document.getElementById("timeline-list"),
  jsonField: document.getElementById("json-field"),
  exportJson: document.getElementById("export-json"),
  copyJson: document.getElementById("copy-json"),
  applyJson: document.getElementById("apply-json"),
  saveConfig: document.getElementById("save-config"),
  saveStatus: document.getElementById("save-status")
};

const EVENT_COLORS = {
  baseColorChange: "#60a5fa",
  particleBurst: "#facc15",
  randomGlow: "#f472b6"
};

let config = normalizeBackgroundConfig(DEFAULT_BACKGROUND_CONFIG);
let renderer = createBackgroundStudioRenderer({ config });
let playing = false;
let lastTs = null;

function createId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(16).slice(2)}`;
}

function updateStatus(message, ok = false) {
  if (!dom.saveStatus) return;
  dom.saveStatus.textContent = message;
  dom.saveStatus.className = ok ? "status ok" : "status";
}

function updateConfig(nextConfig) {
  config = normalizeBackgroundConfig(nextConfig);
  renderer.setConfig(config);
  renderForm();
  renderTimeline();
  updateJsonField();
  updatePlaybackMeta();
}

function renderForm() {
  dom.name.value = config.name;
  dom.loop.value = config.loopSeconds;
  dom.baseColor.value = config.global.baseColor;
  dom.baseColorText.value = config.global.baseColor;
  dom.gradientShape.value = config.global.gradient.shape;
  dom.gradientColorA.value = config.global.gradient.colors[0];
  dom.gradientColorAText.value = config.global.gradient.colors[0];
  dom.gradientColorB.value = config.global.gradient.colors[1];
  dom.gradientColorBText.value = config.global.gradient.colors[1];
  dom.gradientOpacity.value = config.global.gradient.opacity;
  dom.gradientAngle.value = config.global.gradient.angleDeg;
  dom.gradientRadius.value = config.global.gradient.radius;
  dom.glowColor.value = config.global.glow.color;
  dom.glowColorText.value = config.global.glow.color;
  dom.glowIntensity.value = config.global.glow.intensity;
  dom.glowRadius.value = config.global.glow.radius;
  dom.glowX.value = config.global.glow.position.x;
  dom.glowY.value = config.global.glow.position.y;

  const isLinear = config.global.gradient.shape === "linear";
  dom.gradientAngleRow.style.display = isLinear ? "flex" : "none";
  dom.gradientRadiusRow.style.display = isLinear ? "none" : "flex";
}

function updateJsonField() {
  dom.jsonField.value = JSON.stringify(config, null, 2);
}

function updatePlaybackMeta() {
  dom.playbackScrub.max = String(config.loopSeconds);
  dom.playbackDuration.textContent = formatRunDuration(config.loopSeconds);
}

function renderTimeline() {
  dom.timelineBar.innerHTML = "";
  dom.timelineList.innerHTML = "";

  for (const event of config.timeline) {
    const marker = document.createElement("div");
    marker.className = "timeline-marker";
    marker.style.left = `${(event.time / config.loopSeconds) * 100}%`;
    marker.style.background = EVENT_COLORS[event.type] || "#60a5fa";
    dom.timelineBar.appendChild(marker);
  }

  for (const event of config.timeline) {
    dom.timelineList.appendChild(buildEventCard(event));
  }
}

function buildEventCard(event) {
  const card = document.createElement("div");
  card.className = "event-card";

  const header = document.createElement("header");
  const typeWrap = document.createElement("div");
  typeWrap.className = "event-type";
  const pill = document.createElement("span");
  pill.className = "event-pill";
  pill.style.background = EVENT_COLORS[event.type] || "#60a5fa";
  const title = document.createElement("span");
  title.textContent = event.type === "baseColorChange"
    ? "Base Color Change"
    : event.type === "particleBurst"
      ? "Particle Burst"
      : "Random Glow";
  typeWrap.appendChild(pill);
  typeWrap.appendChild(title);

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn ghost";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => {
    config.timeline = config.timeline.filter((entry) => entry.id !== event.id);
    updateConfig(config);
  });

  header.appendChild(typeWrap);
  header.appendChild(removeBtn);
  card.appendChild(header);

  card.appendChild(buildTimeField(event));

  if (event.type === "baseColorChange") {
    card.appendChild(buildColorField("Color", event.color, (value) => {
      event.color = value;
      updateConfig(config);
    }));
    card.appendChild(buildNumberField("Transition (sec)", event.transition, 0, config.loopSeconds, 0.1, (value) => {
      event.transition = value;
      updateConfig(config);
    }));
  }

  if (event.type === "particleBurst") {
    card.appendChild(buildPositionFields(event));
    card.appendChild(buildNumberField("Count", event.count, 1, 200, 1, (value) => {
      event.count = Math.round(value);
      updateConfig(config);
    }));
    card.appendChild(buildColorField("Color", event.color, (value) => {
      event.color = value;
      updateConfig(config);
    }));
    card.appendChild(buildNumberField("Speed", event.speed, 0, 300, 1, (value) => {
      event.speed = value;
      updateConfig(config);
    }));
    card.appendChild(buildNumberField("Spread (deg)", event.spread, 0, 360, 1, (value) => {
      event.spread = value;
      updateConfig(config);
    }));
    card.appendChild(buildNumberField("Lifetime (sec)", event.life, 0.1, 6, 0.1, (value) => {
      event.life = value;
      updateConfig(config);
    }));
  }

  if (event.type === "randomGlow") {
    card.appendChild(buildPositionFields(event));
    card.appendChild(buildColorField("Color", event.color, (value) => {
      event.color = value;
      updateConfig(config);
    }));
    card.appendChild(buildNumberField("Radius", event.radius, 0.05, 1.5, 0.05, (value) => {
      event.radius = value;
      updateConfig(config);
    }));
    card.appendChild(buildNumberField("Intensity", event.intensity, 0.05, 1.5, 0.05, (value) => {
      event.intensity = value;
      updateConfig(config);
    }));
    card.appendChild(buildNumberField("Duration (sec)", event.duration, 0.2, config.loopSeconds, 0.1, (value) => {
      event.duration = value;
      updateConfig(config);
    }));
    const randomizeField = document.createElement("label");
    randomizeField.className = "field inline";
    const label = document.createElement("span");
    label.textContent = "Randomize Position";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = event.randomize === true;
    checkbox.addEventListener("change", () => {
      event.randomize = checkbox.checked;
      updateConfig(config);
    });
    randomizeField.appendChild(label);
    randomizeField.appendChild(checkbox);
    card.appendChild(randomizeField);
  }

  return card;
}

function buildTimeField(event) {
  return buildNumberField("Time (sec)", event.time, 0, config.loopSeconds, 0.1, (value) => {
    event.time = value;
    config.timeline = config.timeline.slice().sort((a, b) => a.time - b.time);
    updateConfig(config);
  });
}

function buildNumberField(labelText, value, min, max, step, onChange) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  const label = document.createElement("span");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "number";
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  input.addEventListener("change", () => {
    onChange(Number(input.value));
  });
  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
}

function buildColorField(labelText, value, onChange) {
  const wrapper = document.createElement("label");
  wrapper.className = "field inline";
  const label = document.createElement("span");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "color";
  input.value = value;
  const text = document.createElement("input");
  text.type = "text";
  text.className = "mono";
  text.value = value;
  input.addEventListener("input", () => {
    text.value = input.value;
    onChange(input.value);
  });
  text.addEventListener("change", () => {
    onChange(text.value);
  });
  wrapper.appendChild(label);
  wrapper.appendChild(input);
  wrapper.appendChild(text);
  return wrapper;
}

function buildPositionFields(event) {
  const group = document.createElement("div");
  group.className = "field-group";

  const xField = buildNumberField("X (0-1)", event.x ?? 0.5, 0, 1, 0.01, (value) => {
    event.x = value;
    updateConfig(config);
  });
  const yField = buildNumberField("Y (0-1)", event.y ?? 0.5, 0, 1, 0.01, (value) => {
    event.y = value;
    updateConfig(config);
  });

  group.appendChild(xField);
  group.appendChild(yField);
  return group;
}

function resizeCanvas() {
  const rect = dom.preview.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  dom.preview.width = Math.max(1, Math.floor(rect.width * dpr));
  dom.preview.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = dom.preview.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderer.resize(rect.width, rect.height);
}

function tick(ts) {
  if (lastTs == null) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;
  const rect = dom.preview.getBoundingClientRect();
  const ctx = dom.preview.getContext("2d");

  if (playing) {
    renderer.update(dt, { width: rect.width, height: rect.height });
  }
  renderer.render(ctx, { width: rect.width, height: rect.height });
  dom.playbackScrub.value = renderer.getTime();
  dom.playbackTime.textContent = formatRunDuration(renderer.getTime());
  requestAnimationFrame(tick);
}

function addEvent(type) {
  const base = {
    id: createId(type),
    type,
    time: Math.min(10, config.loopSeconds * 0.1)
  };
  if (type === "baseColorChange") {
    config.timeline.push({ ...base, color: "#0b1020", transition: 1 });
  }
  if (type === "particleBurst") {
    config.timeline.push({
      ...base,
      x: 0.5,
      y: 0.5,
      count: 24,
      color: "#e0f2fe",
      speed: 70,
      spread: 180,
      life: 1.2
    });
  }
  if (type === "randomGlow") {
    config.timeline.push({
      ...base,
      x: 0.5,
      y: 0.5,
      color: "#f472b6",
      radius: 0.4,
      intensity: 0.5,
      duration: 2,
      randomize: false
    });
  }
  config.timeline.sort((a, b) => a.time - b.time);
  updateConfig(config);
}

function bindGlobalInputs() {
  dom.name.addEventListener("input", () => {
    config.name = dom.name.value;
    updateConfig(config);
  });
  dom.loop.addEventListener("change", () => {
    config.loopSeconds = Number(dom.loop.value);
    updateConfig(config);
  });
  bindColorPair(dom.baseColor, dom.baseColorText, (value) => {
    config.global.baseColor = value;
    updateConfig(config);
  });
  dom.gradientShape.addEventListener("change", () => {
    config.global.gradient.shape = dom.gradientShape.value;
    updateConfig(config);
  });
  bindColorPair(dom.gradientColorA, dom.gradientColorAText, (value) => {
    config.global.gradient.colors[0] = value;
    updateConfig(config);
  });
  bindColorPair(dom.gradientColorB, dom.gradientColorBText, (value) => {
    config.global.gradient.colors[1] = value;
    updateConfig(config);
  });
  dom.gradientOpacity.addEventListener("input", () => {
    config.global.gradient.opacity = Number(dom.gradientOpacity.value);
    updateConfig(config);
  });
  dom.gradientAngle.addEventListener("input", () => {
    config.global.gradient.angleDeg = Number(dom.gradientAngle.value);
    updateConfig(config);
  });
  dom.gradientRadius.addEventListener("input", () => {
    config.global.gradient.radius = Number(dom.gradientRadius.value);
    updateConfig(config);
  });
  bindColorPair(dom.glowColor, dom.glowColorText, (value) => {
    config.global.glow.color = value;
    updateConfig(config);
  });
  dom.glowIntensity.addEventListener("input", () => {
    config.global.glow.intensity = Number(dom.glowIntensity.value);
    updateConfig(config);
  });
  dom.glowRadius.addEventListener("input", () => {
    config.global.glow.radius = Number(dom.glowRadius.value);
    updateConfig(config);
  });
  dom.glowX.addEventListener("input", () => {
    config.global.glow.position.x = Number(dom.glowX.value);
    updateConfig(config);
  });
  dom.glowY.addEventListener("input", () => {
    config.global.glow.position.y = Number(dom.glowY.value);
    updateConfig(config);
  });
}

function bindColorPair(colorInput, textInput, onChange) {
  colorInput.addEventListener("input", () => {
    textInput.value = colorInput.value;
    onChange(colorInput.value);
  });
  textInput.addEventListener("change", () => {
    onChange(textInput.value);
  });
}

function bindPlayback() {
  dom.playbackToggle.addEventListener("click", () => {
    playing = !playing;
    dom.playbackToggle.textContent = playing ? "Pause" : "Play";
  });
  dom.playbackScrub.addEventListener("input", () => {
    const time = Number(dom.playbackScrub.value);
    renderer.seek(time, { width: dom.preview.getBoundingClientRect().width, height: dom.preview.getBoundingClientRect().height });
  });
}

function bindTimelineActions() {
  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => addEvent(btn.dataset.add));
  });
}

function bindExportImport() {
  dom.exportJson.addEventListener("click", () => {
    updateJsonField();
    const blob = new Blob([dom.jsonField.value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.id || "background"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  dom.copyJson.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(dom.jsonField.value);
      updateStatus("Copied to clipboard", true);
    } catch {
      updateStatus("Copy failed. Please copy manually.");
    }
  });

  dom.applyJson.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(dom.jsonField.value);
      updateConfig(parsed);
      updateStatus("JSON applied", true);
    } catch {
      updateStatus("Invalid JSON. Please check formatting.");
    }
  });

  dom.saveConfig.addEventListener("click", async () => {
    updateStatus("Saving…");
    try {
      await saveBackgroundConfig(config);
      updateStatus("Saved to server", true);
    } catch (err) {
      updateStatus(`Save failed: ${err.message || err}`);
    }
  });
}

async function init() {
  bindGlobalInputs();
  bindPlayback();
  bindTimelineActions();
  bindExportImport();

  const loaded = await loadBackgroundConfig();
  updateConfig(loaded.config);

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  requestAnimationFrame(tick);
}

init();
