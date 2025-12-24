"use strict";

function wantsUnlockablesHtml(opts = {}) {
  const format = (opts.formatParam || "").toLowerCase();
  if (format === "html") return true;
  if (format === "json") return false;
  const accept = (opts.acceptHeader || "").toLowerCase();
  return accept.includes("text/html");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderUnlockablesPage({ unlockables = [], icons = [], pipeTextures = [], generatedAt = new Date().toISOString() } = {}) {
  const list = Array.isArray(unlockables) ? unlockables : [];
  const sorted = list.slice().sort((a, b) => {
    const typeA = String(a.type || "");
    const typeB = String(b.type || "");
    if (typeA !== typeB) return typeA.localeCompare(typeB);
    return String(a.name || a.id || "").localeCompare(String(b.name || b.id || ""));
  });
  const generatedLabel = escapeHtml(generatedAt);

  const cards = sorted.length
    ? sorted
        .map((u, i) => {
          const id = escapeHtml(u.id || `unlockable-${i + 1}`);
          const name = escapeHtml(u.name || u.id || "Unlockable");
          const type = escapeHtml(u.type || "unknown");
          const unlockLabel = escapeHtml(u.unlock?.label || "Unlockable");
          return `
        <article class="unlockable-card" data-unlockable-id="${id}" data-unlockable-type="${type}">
          <header>
            <div class="unlockable-name">${name}</div>
            <div class="unlockable-meta">${type.replace(/_/g, " ")} • ${unlockLabel}</div>
          </header>
          <div class="unlockable-preview">
            <canvas class="unlockable-canvas" data-unlockable-index="${i}" aria-label="Preview for ${name}"></canvas>
          </div>
        </article>`;
        })
        .join("\n")
    : `<p class="muted">No unlockables are available.</p>`;

  const serializedUnlockables = JSON.stringify(sorted)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e");
  const serializedIcons = JSON.stringify(icons)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e");
  const serializedPipeTextures = JSON.stringify(pipeTextures)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Unlockables</title>
  <style>
    :root{color-scheme:dark light;}
    body{margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0b1220;color:#e5e7eb;}
    header.page{padding:18px 16px;border-bottom:1px solid rgba(255,255,255,.12);background:#0b1020;box-shadow:0 12px 30px rgba(0,0,0,.28);}
    .wrap{max-width:1120px;margin:0 auto;padding:18px 16px;}
    h1{margin:0;font-size:22px;}
    .generated{color:#cbd5e1;font-size:14px;margin-top:4px;}
    .unlockable-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;}
    .unlockable-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;box-shadow:0 10px 32px rgba(0,0,0,.28);}
    .unlockable-card header{padding:12px 14px 6px;}
    .unlockable-name{font-weight:700;}
    .unlockable-meta{font-size:13px;color:#cbd5e1;text-transform:capitalize;}
    .unlockable-preview{position:relative;}
    .unlockable-canvas{display:block;width:100%;aspect-ratio:16/9;background:#0f172a;border-top:1px solid rgba(255,255,255,.06);}
    .muted{color:#cbd5e1;}
  </style>
</head>
<body>
  <header class="page">
    <div class="wrap">
      <h1>Unlockables</h1>
      <div class="generated">Generated at ${generatedLabel}</div>
    </div>
  </header>
  <main class="wrap">
    <div class="unlockable-grid">
      ${cards}
    </div>
  </main>

  <script type="module">
    import { TrailPreview } from "/js/trailPreview.js";
    import { createPlayerIconSprite } from "/js/playerIconSprites.js";
    import { paintPipeTextureSwatch } from "/js/pipeTextures.js";
    import { computePipeColor } from "/js/pipeColors.js";

    const unlockables = ${serializedUnlockables};
    const icons = ${serializedIcons};
    const pipeTextures = ${serializedPipeTextures};
    const iconMap = new Map(icons.map((icon) => [icon.id, icon]));
    const pipeMap = new Map(pipeTextures.map((texture) => [texture.id, texture]));
    const base = computePipeColor(0.5);
    const running = [];

    function startPreviews() {
      stopPreviews();
      unlockables.forEach((def, idx) => {
        const canvas = document.querySelector('[data-unlockable-index="' + idx + '"]');
        if (!canvas) return;
        const type = def.type;
        if (type === "trail") {
          const preview = new TrailPreview({ canvas });
          preview.setTrail(def.id);
          preview.start();
          running.push(preview);
        } else if (type === "player_texture") {
          const icon = iconMap.get(def.id);
          const sprite = createPlayerIconSprite(icon || {}, { size: canvas.width || 120 });
          const ctx = canvas.getContext("2d");
          if (ctx && sprite) ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
        } else if (type === "pipe_texture") {
          const texture = pipeMap.get(def.id);
          paintPipeTextureSwatch(canvas, texture?.id || def.id, { mode: "NORMAL", base });
        }
      });
    }

    function stopPreviews() {
      running.splice(0).forEach((p) => p.stop());
    }

    const onReady = () => startPreviews();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onReady, { once: true });
    } else {
      onReady();
    }

    window.addEventListener("pagehide", stopPreviews);
    window.addEventListener("visibilitychange", () => {
      if (document.hidden) stopPreviews();
      else startPreviews();
    });
  </script>
</body>
</html>`;
}

module.exports = { renderUnlockablesPage, wantsUnlockablesHtml };
