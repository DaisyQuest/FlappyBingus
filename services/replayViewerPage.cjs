"use strict";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function serializeConfig(config) {
  return JSON.stringify(config)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e");
}

function renderReplayViewerPage({ username = "", watermarkEnabled = false } = {}) {
  const safeUsername = escapeHtml(username);
  const configPayload = serializeConfig({
    username: String(username || ""),
    watermarkEnabled: Boolean(watermarkEnabled)
  });
  const watermark = watermarkEnabled
    ? `<div class="replay-watermark" aria-hidden="true">https://flappybing.us</div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Replay Viewer${safeUsername ? ` • ${safeUsername}` : ""}</title>
  <style>
    :root{color-scheme:dark;}
    *{box-sizing:border-box;}
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0b1220;color:#e5e7eb;}
    header{padding:18px 16px;border-bottom:1px solid rgba(255,255,255,.12);background:#0b1020;}
    .wrap{max-width:1100px;margin:0 auto;padding:0 16px;}
    h1{margin:0;font-size:22px;font-weight:800;}
    .hint{margin-top:6px;font-size:14px;color:#94a3b8;}
    .controls{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:16px 0 10px;}
    .controls label{font-size:13px;color:#cbd5f5;}
    .controls input,.controls select,.controls button{font:inherit;border-radius:10px;border:1px solid rgba(148,163,184,.4);background:#0f172a;color:#e5e7eb;padding:8px 12px;}
    .controls button{cursor:pointer;font-weight:700;}
    .controls button[data-variant="primary"]{background:#38bdf8;color:#0b1220;border-color:#38bdf8;}
    .controls button:disabled{opacity:.6;cursor:not-allowed;}
    .status{font-size:14px;color:#cbd5e1;margin-top:6px;}
    .canvas-card{position:relative;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:#0f172a;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.35);margin-bottom:24px;}
    canvas{display:block;width:100%;height:auto;aspect-ratio:16/9;background:#0b1220;}
    .replay-watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:clamp(22px,4vw,44px);font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.18);text-transform:lowercase;pointer-events:none;mix-blend-mode:screen;}
    .progress{display:flex;align-items:center;gap:10px;margin-top:8px;}
    .progress input[type="range"]{flex:1;}
    .progress .time{font-size:12px;color:#94a3b8;min-width:90px;text-align:right;}
  </style>
</head>
<body>
  <header>
    <div class="wrap">
      <h1>Replay Viewer</h1>
      <div class="hint">Load a player replay by username and control playback.</div>
      <div class="controls">
        <label>
          Username
          <input id="replayUsername" type="text" placeholder="Player username" value="${safeUsername}" spellcheck="false"/>
        </label>
        <button id="loadReplay" data-variant="primary">Load replay</button>
        <button id="playPause" disabled>Play</button>
        <button id="restartReplay" disabled>Restart</button>
        <button id="stepReplay" disabled>Step</button>
        <label>
          Speed
          <select id="replaySpeed" disabled>
            <option value="0.5">0.5×</option>
            <option value="1" selected>1×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
            <option value="3">3×</option>
          </select>
        </label>
      </div>
      <div class="progress">
        <input id="replayProgress" type="range" min="0" max="1000" value="0" disabled/>
        <div class="time" id="replayTime">0%</div>
      </div>
      <div class="status" id="replayStatus">Enter a username to load a replay.</div>
    </div>
  </header>
  <main class="wrap">
    <div class="canvas-card">
      <canvas id="replayCanvas" aria-label="Replay canvas"></canvas>
      ${watermark}
    </div>
  </main>
  <script>
    window.__REPLAY_VIEWER__ = ${configPayload};
  </script>
  <script type="module" src="/js/replayViewer.js"></script>
</body>
</html>`;
}

module.exports = { renderReplayViewerPage };
