"use strict";

const jpeg = require("jpeg-js");

const CARD_WIDTH = 800;
const CARD_HEIGHT = 450;
const PADDING = 32;
const PANEL_MARGIN = 24;
const PANEL_RADIUS = 0;
const FOOTER_TEXT = "https://flappybing.us";
const FOOTER_SCALE = 2;
const FOOTER_SPACING = 1;

const COLORS = Object.freeze({
  backgroundTop: [12, 20, 38],
  backgroundBottom: [26, 40, 74],
  panel: [15, 26, 48],
  panelEdge: [38, 56, 96],
  accent: [112, 211, 255],
  heading: [245, 250, 255],
  label: [156, 176, 209],
  value: [245, 250, 255]
});

const FONT_5X7 = Object.freeze({
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "?": ["01110", "10001", "00010", "00100", "00100", "00000", "00100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00110", "00110"],
  ",": ["00000", "00000", "00000", "00000", "00110", "00110", "00100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ":": ["00000", "00110", "00110", "00000", "00110", "00110", "00000"],
  "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00001", "00001", "00001", "00001", "10001", "10001", "01110"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "10001", "11001", "10101", "10011", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "01010", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"]
});

function clampByte(value) {
  return Math.max(0, Math.min(255, value | 0));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(start, end, t) {
  return [
    clampByte(lerp(start[0], end[0], t)),
    clampByte(lerp(start[1], end[1], t)),
    clampByte(lerp(start[2], end[2], t))
  ];
}

function formatRunDuration(totalSeconds) {
  const seconds = Number(totalSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const fullSeconds = Math.floor(seconds);
  const hrs = Math.floor(fullSeconds / 3600);
  const mins = Math.floor((fullSeconds % 3600) / 60);
  const secs = fullSeconds % 60;
  const pad = (value) => String(value).padStart(2, "0");
  if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(secs)}`;
  return `${mins}:${pad(secs)}`;
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function formatDate(ts) {
  const numeric = Number(ts);
  if (!Number.isFinite(numeric) || numeric <= 0) return "—";
  const date = new Date(numeric);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(
    date.getUTCHours()
  )}:${pad(date.getUTCMinutes())}`;
}

function formatReplayMeta(entry) {
  const durationSeconds = Math.max(0, Math.round((Number(entry?.durationMs) || 0) / 1000));
  return {
    score: Number(entry?.bestScore) || 0,
    duration: formatRunDuration(durationSeconds),
    recordedAt: formatDate(Number(entry?.recordedAt) || 0),
    ticks: Number(entry?.ticksLength) || 0,
    bytes: formatBytes(entry?.replayBytes)
  };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function getGlyph(char) {
  if (!char) return FONT_5X7["?"];
  const upper = char.toUpperCase();
  return FONT_5X7[upper] || FONT_5X7["?"];
}

function drawPixel(data, width, x, y, color) {
  if (x < 0 || y < 0 || x >= width) return;
  const idx = (y * width + x) * 4;
  data[idx] = color[0];
  data[idx + 1] = color[1];
  data[idx + 2] = color[2];
  data[idx + 3] = 255;
}

function fillRect(data, width, height, x, y, w, h, color) {
  const maxX = Math.min(width, x + w);
  const maxY = Math.min(height, y + h);
  for (let yy = Math.max(0, y); yy < maxY; yy += 1) {
    for (let xx = Math.max(0, x); xx < maxX; xx += 1) {
      drawPixel(data, width, xx, yy, color);
    }
  }
}

function fillVerticalGradient(data, width, height, startColor, endColor) {
  for (let y = 0; y < height; y += 1) {
    const t = height <= 1 ? 0 : y / (height - 1);
    const color = lerpColor(startColor, endColor, t);
    const rowStart = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const idx = rowStart + x * 4;
      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
      data[idx + 3] = 255;
    }
  }
}

function drawText(data, width, height, text, x, y, scale, color, spacing = 1) {
  const safeText = String(text || "");
  let cursorX = x;
  for (const char of safeText) {
    const glyph = getGlyph(char);
    for (let row = 0; row < glyph.length; row += 1) {
      const line = glyph[row];
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] !== "1") continue;
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            drawPixel(data, width, cursorX + col * scale + sx, y + row * scale + sy, color);
          }
        }
      }
    }
    cursorX += (glyph[0].length + spacing) * scale;
  }
}

function measureTextWidth(text, scale, spacing = 1) {
  const safeText = String(text || "");
  if (!safeText) return 0;
  const glyphWidth = FONT_5X7["A"].length;
  return safeText.length * (glyphWidth + spacing) * scale - spacing * scale;
}

function getFooterLayout(panelX, panelY, panelW, panelH, text = FOOTER_TEXT, scale = FOOTER_SCALE) {
  const textWidth = measureTextWidth(text, scale, FOOTER_SPACING);
  const textHeight = FONT_5X7["A"].length * scale;
  const minX = panelX + PADDING;
  const maxX = panelX + panelW - PADDING - textWidth;
  const x = Math.max(minX, maxX);
  const y = panelY + panelH - PADDING - textHeight;
  return { text, scale, x, y, textWidth, textHeight };
}

function buildReplayDetailsRows(entry, run) {
  const meta = formatReplayMeta(entry);
  const rows = [
    { label: "BEST SCORE", value: formatNumber(meta.score) },
    { label: "DURATION", value: meta.duration },
    { label: "RECORDED", value: meta.recordedAt },
    { label: "TICKS", value: formatNumber(meta.ticks) },
    { label: "REPLAY SIZE", value: meta.bytes }
  ];

  const stats = [];
  const runStats = run?.runStats || null;
  if (runStats) {
    const statItems = [
      ["ORBS", runStats.orbsCollected],
      ["PERFECTS", runStats.perfects],
      ["PIPES DODGED", runStats.pipesDodged],
      ["ABILITIES", runStats.abilitiesUsed]
    ];
    statItems.forEach(([label, value]) => {
      if (value === undefined || value === null) return;
      stats.push({ label, value: formatNumber(value) });
    });
  }

  return { meta, rows, stats };
}

function renderPlayerCardJpeg({ entry, run } = {}) {
  if (!entry) throw new Error("missing_entry");
  const width = CARD_WIDTH;
  const height = CARD_HEIGHT;
  const data = Buffer.alloc(width * height * 4);
  fillVerticalGradient(data, width, height, COLORS.backgroundTop, COLORS.backgroundBottom);

  const panelX = PANEL_MARGIN;
  const panelY = PANEL_MARGIN;
  const panelW = width - PANEL_MARGIN * 2;
  const panelH = height - PANEL_MARGIN * 2;

  fillRect(data, width, height, panelX, panelY, panelW, panelH, COLORS.panel);
  fillRect(data, width, height, panelX, panelY, panelW, 2, COLORS.panelEdge);
  fillRect(data, width, height, panelX, panelY + panelH - 2, panelW, 2, COLORS.panelEdge);
  fillRect(data, width, height, panelX, panelY, 4, panelH, COLORS.accent);

  const { rows, stats } = buildReplayDetailsRows(entry, run);
  const heading = String(entry.username || "Unknown player").toUpperCase();

  const contentX = panelX + PADDING;
  const contentRight = panelX + panelW - PADDING;
  const headingScale = 4;
  const headingY = panelY + 26;
  drawText(data, width, height, heading, contentX, headingY, headingScale, COLORS.heading, 1);

  let rowY = headingY + headingScale * 8 + 12;
  const labelScale = 2;
  const rowGap = 34;
  rows.forEach((row) => {
    drawText(data, width, height, row.label, contentX, rowY, labelScale, COLORS.label, 1);
    const valueWidth = measureTextWidth(row.value, labelScale, 1);
    drawText(data, width, height, row.value, contentRight - valueWidth, rowY, labelScale, COLORS.value, 1);
    rowY += rowGap;
  });

  if (stats.length > 0) {
    rowY += 10;
    drawText(data, width, height, "RUN STATS", contentX, rowY, labelScale, COLORS.label, 1);
    rowY += rowGap - 6;
    stats.forEach((row) => {
      drawText(data, width, height, row.label, contentX, rowY, labelScale, COLORS.label, 1);
      const valueWidth = measureTextWidth(row.value, labelScale, 1);
      drawText(data, width, height, row.value, contentRight - valueWidth, rowY, labelScale, COLORS.value, 1);
      rowY += rowGap;
    });
  }

  const footer = getFooterLayout(panelX, panelY, panelW, panelH);
  drawText(data, width, height, footer.text, footer.x, footer.y, footer.scale, COLORS.label, FOOTER_SPACING);

  const jpegBuffer = jpeg.encode({ data, width, height }, 90).data;
  return Buffer.from(jpegBuffer);
}

module.exports = {
  renderPlayerCardJpeg,
  formatReplayMeta,
  __testables: {
    formatRunDuration,
    formatBytes,
    formatDate,
    formatNumber,
    buildReplayDetailsRows,
    measureTextWidth,
    getGlyph,
    getFooterLayout,
    lerpColor,
    fillVerticalGradient,
    drawText,
    COLORS,
    CARD_WIDTH,
    CARD_HEIGHT,
    PANEL_RADIUS,
    FOOTER_TEXT,
    FOOTER_SCALE,
    FOOTER_SPACING
  }
};
