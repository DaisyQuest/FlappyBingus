"use strict";

/**
 * Determine whether the caller expects an HTML response instead of JSON.
 * @param {{formatParam?:string|null,acceptHeader?:string|undefined}} opts
 * @returns {boolean}
 */
function wantsPreviewHtml(opts = {}) {
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

/**
 * Render a small HTML gallery that draws animated trail previews in-browser.
 * The gallery uses the existing front-end TrailPreview renderer so the output
 * matches what players see in the lobby.
 * @param {{previews?:Array<{id?:string,name?:string,minScore?:number,previewSeed?:string}>,generatedAt?:string}} catalog
 * @returns {string} HTML
 */
function renderTrailPreviewPage(catalog = {}) {
  const previews = Array.isArray(catalog.previews) ? catalog.previews : [];
  const generatedAt = escapeHtml(catalog.generatedAt || new Date().toISOString());
  const cards =
    previews.length > 0
      ? previews
          .map((p, i) => {
            const safeId = escapeHtml(p.id || `trail-${i + 1}`);
            const safeName = escapeHtml(p.name || safeId);
            const minScore = Number.isFinite(p.minScore) ? p.minScore : 0;
            const safeSeed = escapeHtml(p.previewSeed || `trail-preview-${safeId}`);
            return `
        <article class="preview-card" data-trail-id="${safeId}">
          <header>
            <div class="trail-name">${safeName}</div>
            <div class="trail-meta">Unlocks at ${minScore} score • Seed: <code>${safeSeed}</code></div>
          </header>
          <div class="preview-canvas-wrap">
            <canvas class="preview-canvas" data-preview-index="${i}" aria-label="Preview for ${safeName}"></canvas>
          </div>
        </article>`;
          })
          .join("\n")
      : `<p class="muted">No trail previews are available.</p>`;

  const serialized = JSON.stringify(
    previews.map((p) => ({
      id: p.id || "classic",
      name: p.name || p.id || "Trail",
      minScore: Number.isFinite(p.minScore) ? p.minScore : 0,
      previewSeed: p.previewSeed || `trail-preview-${p.id || "classic"}`
    }))
  )
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Trail Previews</title>
  <style>
    :root{color-scheme:dark light;}
    body{margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0b1220;color:#e5e7eb;}
    header.page{padding:18px 16px;border-bottom:1px solid rgba(255,255,255,.12);background:#0b1020;box-shadow:0 12px 30px rgba(0,0,0,.28);}
    .wrap{max-width:1040px;margin:0 auto;padding:18px 16px;}
    h1{margin:0;font-size:22px;}
    .generated{color:#cbd5e1;font-size:14px;margin-top:4px;}
    .preview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;}
    .preview-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;box-shadow:0 10px 32px rgba(0,0,0,.28);}
    .preview-card header{padding:12px 14px 6px;}
    .trail-name{font-weight:700;}
    .trail-meta{font-size:13px;color:#cbd5e1;}
    .preview-canvas-wrap{position:relative;}
    .preview-canvas{display:block;width:100%;aspect-ratio:16/9;background:#0f172a;border-top:1px solid rgba(255,255,255,.06);}
    .muted{color:#cbd5e1;}
    code{font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;}
  </style>
</head>
<body>
  <header class="page">
    <div class="wrap">
      <h1>Trail Previews</h1>
      <div class="generated">Generated at ${generatedAt}</div>
    </div>
  </header>
  <main class="wrap">
    <div class="preview-grid">
      ${cards}
    </div>
  </main>

  <script type="module">
    import { TrailPreview } from "/js/trailPreview.js";

    const previews = ${serialized};
    const running = [];

    function startPreviews() {
      stopPreviews();
      previews.forEach((info, idx) => {
        const canvas = document.querySelector(\`[data-preview-index="\${idx}"]\`);
        if (!canvas) return;
        const preview = new TrailPreview({ canvas });
        preview.setTrail(info.id);
        preview.start();
        running.push(preview);
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

module.exports = { renderTrailPreviewPage, wantsPreviewHtml };
