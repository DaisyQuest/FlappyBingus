// =====================
// FILE: server.js
// Node 24+ (no external deps)
// =====================
"use strict";

const http = require("node:http");
const fs = require("node:fs/promises");
const fssync = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const { MongoDataStore, resolveMongoConfig } = require("./db/mongo.cjs");
const { createScoreService, clampScoreDefault } = require("./services/scoreService.cjs");
const { buildTrailPreviewCatalog } = require("./services/trailCatalog.cjs");
const { renderTrailPreviewPage, wantsPreviewHtml } = require("./services/trailPreviewPage.cjs");

// --------- Config (env overrides) ----------
const PORT = Number(process.env.PORT || 3000);

const PUBLIC_DIR = process.env.PUBLIC_DIR
  ? path.resolve(process.env.PUBLIC_DIR)
  : path.join(process.cwd(), "public");

const START_TIME = Date.now();

// Mongo configuration: MONGODB_URI (supports {PASSWORD} placeholder), MONGODB_PASSWORD, MONGODB_DB
const mongoConfig = resolveMongoConfig();
const dataStore = new MongoDataStore(mongoConfig);

// Cookie that holds username (per requirements)
const USER_COOKIE = "sugar";

// Default skill keybinds (requested defaults):
// Q = Invulnerability (phase)
// E = Slow Field
// Left Mouse = Teleport
// Space = Dash
const DEFAULT_KEYBINDS = Object.freeze({
  dash: { type: "key", code: "Space" },
  phase: { type: "key", code: "KeyQ" },
  teleport: { type: "mouse", button: 0 },
  slowField: { type: "key", code: "KeyE" }
});

const TRAILS = Object.freeze([
  { id: "classic", name: "Classic", minScore: 0 },
  { id: "ember", name: "Ember Core", minScore: 100 },
  { id: "sunset", name: "Sunset Fade", minScore: 250 },
  { id: "gothic", name: "Garnet Dusk", minScore: 400 },
  { id: "glacier", name: "Glacial Drift", minScore: 575 },
  { id: "ocean", name: "Tidal Current", minScore: 750 },
  { id: "miami", name: "Neon Miami", minScore: 950 },
  { id: "aurora", name: "Aurora", minScore: 1150 },
  { id: "rainbow", name: "Prismatic Ribbon", minScore: 1350 },
  { id: "solar", name: "Solar Flare", minScore: 1550 },
  { id: "storm", name: "Stormstrike", minScore: 1750 },
  { id: "magma", name: "Forgefire", minScore: 1950 },
  { id: "plasma", name: "Plasma Arc", minScore: 2150 },
  { id: "nebula", name: "Nebula Bloom", minScore: 2350 },
  { id: "dragonfire", name: "Dragonfire", minScore: 2600 },
  { id: "ultraviolet", name: "Ultraviolet Pulse", minScore: 2800 },
  { id: "world_record", name: "World Record Cherry Blossom", minScore: 0, requiresRecordHolder: true }
]);

// --------- Domain helpers ----------
function nowMs() {
  return Date.now();
}

// --------- Helpers ----------
const RATE_LIMIT_CONFIG = Object.freeze({
  default: { limit: 120, windowMs: 60_000 },
  "/api/me": { limit: 60, windowMs: 60_000 },
  "/api/register": { limit: 20, windowMs: 60_000 },
  "/api/score": { limit: 30, windowMs: 60_000 },
  "/api/cosmetics/trail": { limit: 30, windowMs: 60_000 },
  "/api/binds": { limit: 30, windowMs: 60_000 },
  "/api/highscores": { limit: 90, windowMs: 60_000 }
});

const _rateLimitState = new Map();
let _lastRateLimitSweep = nowMs();
const RATE_LIMIT_SWEEP_INTERVAL_MS = 5 * 60_000;

function getClientAddress(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress || "unknown";
}

function sweepRateLimits(now = nowMs()) {
  for (const [key, entry] of _rateLimitState) {
    if (now >= entry.reset) _rateLimitState.delete(key);
  }
  _lastRateLimitSweep = now;
}

function takeRateLimitToken(key, cfg) {
  const now = nowMs();
  if (now - _lastRateLimitSweep >= RATE_LIMIT_SWEEP_INTERVAL_MS) sweepRateLimits(now);

  const entry = _rateLimitState.get(key);
  if (!entry || now >= entry.reset) {
    _rateLimitState.set(key, { count: 1, reset: now + cfg.windowMs });
    return { limited: false, retryAfterMs: cfg.windowMs };
  }

  if (entry.count >= cfg.limit) return { limited: true, retryAfterMs: entry.reset - now };
  entry.count += 1;
  return { limited: false, retryAfterMs: entry.reset - now };
}

function respondRateLimited(res, retryAfterMs) {
  sendJson(
    res,
    429,
    { ok: false, error: "rate_limited" },
    { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) }
  );
}

function rateLimit(req, res, name) {
  const cfg = { ...RATE_LIMIT_CONFIG.default, ...(RATE_LIMIT_CONFIG[name] || {}) };
  const key = `${name}:${getClientAddress(req)}`;
  const result = takeRateLimitToken(key, cfg);
  if (!result.limited) return false;
  respondRateLimited(res, result.retryAfterMs);
  return true;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function send(res, status, headers, body) {
  res.writeHead(status, {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...headers
  });
  res.end(body);
}

function sendJson(res, status, obj, extraHeaders = {}) {
  send(
    res,
    status,
    {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    },
    JSON.stringify(obj)
  );
}

function sendHtml(res, status, html, extraHeaders = {}) {
  send(
    res,
    status,
    {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    },
    html
  );
}

function notFound(res) {
  sendJson(res, 404, { ok: false, error: "not_found" });
}
function badRequest(res, msg = "bad_request") {
  sendJson(res, 400, { ok: false, error: msg });
}
function unauthorized(res) {
  sendJson(res, 401, { ok: false, error: "unauthorized" });
}

function parseCookies(header) {
  const out = Object.create(null);
  if (!header) return out;
  const parts = header.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function setCookie(res, name, value, opts = {}) {
  const maxAge = Number.isFinite(opts.maxAge) ? opts.maxAge : 60 * 60 * 24 * 365;
  const parts = [
    `${name}=${encodeURIComponent(String(value))}`,
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
    "Path=/",
    "SameSite=Lax"
  ];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function normalizeUsername(input) {
  const u = String(input ?? "").trim();
  if (u.length < 3 || u.length > 18) return null;
  if (!/^[A-Za-z0-9 _-]+$/.test(u)) return null;
  return u;
}

function keyForUsername(username) {
  return String(username).trim().toLowerCase();
}

function unlockedTrails(bestScore, { recordHolder = false } = {}) {
  const s = Number(bestScore) || 0;
  return TRAILS.filter((t) => s >= t.minScore && (!t.requiresRecordHolder || recordHolder)).map((t) => t.id);
}

function ensureUserSchema(u, { recordHolder = false } = {}) {
  if (!u || typeof u !== "object") return;
  u.bestScore = normalizeScore(u.bestScore);
  u.runs = normalizeCount(u.runs);
  u.totalScore = normalizeTotal(u.totalScore);
  if (typeof u.selectedTrail !== "string") u.selectedTrail = "classic";
  if (!u.keybinds || typeof u.keybinds !== "object")
    u.keybinds = structuredClone(DEFAULT_KEYBINDS);

  // Merge any missing bind keys with defaults
  u.keybinds = mergeKeybinds(DEFAULT_KEYBINDS, u.keybinds);

  // Ensure selected trail is unlocked
  const unlocked = unlockedTrails(u.bestScore | 0, { recordHolder });
  if (!unlocked.includes(u.selectedTrail)) u.selectedTrail = "classic";
}

function normalizeScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1_000_000_000, Math.floor(n)));
}

function normalizeCount(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function normalizeTotal(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function mergeKeybinds(base, inc) {
  const out = {};
  const src = inc && typeof inc === "object" ? inc : {};
  for (const k of Object.keys(base)) out[k] = normalizeBind(src[k]) || base[k];
  return out;
}

function normalizeBind(b) {
  if (!b || typeof b !== "object") return null;
  const type = b.type;
  if (type === "key") {
    const code = String(b.code || "").trim();
    if (!code || code.length > 32) return null;
    // Allow common KeyboardEvent.code formats: KeyQ, Space, ArrowLeft, Digit1, etc.
    if (!/^[A-Za-z0-9]+$/.test(code)) return null;
    return { type: "key", code };
  }
  if (type === "mouse") {
    const btn = Number(b.button);
    if (!Number.isInteger(btn)) return null;
    if (btn < 0 || btn > 4) return null; // allow extra mouse buttons if present
    return { type: "mouse", button: btn };
  }
  return null;
}

function bindToken(b) {
  if (!b) return "";
  if (b.type === "key") return `k:${b.code}`;
  if (b.type === "mouse") return `m:${b.button}`;
  return "";
}

function validateKeybindsPayload(binds) {
  if (!binds || typeof binds !== "object") return null;

  const actions = ["dash", "phase", "teleport", "slowField"];
  const out = {};
  for (const a of actions) {
    const nb = normalizeBind(binds[a]);
    if (!nb) return null;
    out[a] = nb;
  }

  // Disallow duplicates (ambiguous input)
  const seen = new Set();
  for (const a of actions) {
    const t = bindToken(out[a]);
    if (seen.has(t)) return null;
    seen.add(t);
  }
  return out;
}

function publicUser(u, { recordHolder = false } = {}) {
  if (!u) return null;
  return {
    username: u.username,
    bestScore: u.bestScore | 0,
    selectedTrail: u.selectedTrail || "classic",
    keybinds: u.keybinds || structuredClone(DEFAULT_KEYBINDS),
    runs: u.runs | 0,
    totalScore: u.totalScore | 0,
    unlockedTrails: unlockedTrails(u.bestScore | 0, { recordHolder }),
    isRecordHolder: Boolean(recordHolder)
  };
}

async function isRecordHolder(username) {
  if (!username) return false;
  const [top] = await topHighscores(1);
  return Boolean(top && top.username === username);
}

async function getUserFromReq(req, { withRecordHolder = false } = {}) {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies[USER_COOKIE];
  if (!raw) return null;
  const key = keyForUsername(raw);
  const u = await dataStore.getUserByKey(key);
  if (!u) return null;
  const recordHolder = withRecordHolder ? await isRecordHolder(u.username) : false;
  ensureUserSchema(u, { recordHolder });
  if (withRecordHolder) u.isRecordHolder = recordHolder;
  return u;
}

function buildUserDefaults(username, key) {
  const now = nowMs();
  return {
    username,
    key,
    bestScore: 0,
    selectedTrail: "classic",
    keybinds: structuredClone(DEFAULT_KEYBINDS),
    runs: 0,
    totalScore: 0,
    createdAt: now,
    updatedAt: now
  };
}

async function getOrCreateUser(username) {
  const norm = normalizeUsername(username);
  if (!norm) return null;
  const key = keyForUsername(norm);
  const defaults = buildUserDefaults(norm, key);
  const u = await dataStore.upsertUser(norm, key, defaults);
  ensureUserSchema(u);
  return u;
}

async function readJsonBody(req, limitBytes = 64 * 1024) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limitBytes) throw new Error("body_too_large");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  return JSON.parse(text);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString();
}

async function topHighscores(limit = 25) {
  return dataStore.topHighscores(limit);
}

const scoreService = createScoreService({
  dataStore,
  ensureUserSchema,
  publicUser,
  listHighscores: () => topHighscores(20),
  trails: TRAILS,
  clampScore: clampScoreDefault
});

async function ensureDatabase(res) {
  try {
    await dataStore.ensureConnected();
    return true;
  } catch (err) {
    console.error("[bingus] database unavailable:", err);
    sendJson(res, 503, { ok: false, error: "database_unavailable" });
    return false;
  }
}

function renderStatusPage(status) {
  const db = status.db || {};
  const dbBadge = db.connected
    ? '<span class="badge bg-success">Connected</span>'
    : '<span class="badge bg-danger">Disconnected</span>';
  const dbError = status.dbError
    ? `<div class="alert alert-danger mt-3 mb-0"><strong>Database error:</strong> ${escapeHtml(
        status.dbError
      )}</div>`
    : "";
  const highscores = status.highscores || [];
  const recentUsers = status.recentUsers || [];
  const highscoresRows =
    highscores.length > 0
      ? highscores
          .map(
            (e, i) =>
              `<tr><td>${i + 1}</td><td>${escapeHtml(e.username)}</td><td>${e.bestScore}</td><td class="text-muted">${formatDate(
                e.updatedAt
              )}</td></tr>`
          )
          .join("")
      : '<tr><td colspan="4" class="text-muted">No scores recorded.</td></tr>';
  const recentRows =
    recentUsers.length > 0
      ? recentUsers
          .map(
            (u) =>
              `<tr><td>${escapeHtml(u.username)}</td><td>${u.bestScore | 0}</td><td class="text-muted">${formatDate(
                u.updatedAt || u.createdAt
              )}</td></tr>`
          )
          .join("")
      : '<tr><td colspan="3" class="text-muted">No users recorded.</td></tr>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Flappy Bingus – Status</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"/>
</head>
<body class="bg-dark text-light">
  <div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="h3 mb-1">Flappy Bingus Status</h1>
        <p class="mb-0 text-secondary">Live server and database health</p>
      </div>
      <div class="d-flex gap-2">
        <a class="btn btn-outline-info" href="/">Back to game</a>
        <a class="btn btn-outline-light" href="/highscores">View highscores</a>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-12 col-lg-6">
        <div class="card bg-secondary-subtle text-dark h-100">
          <div class="card-body">
            <h2 class="h5 card-title">Server</h2>
            <dl class="row mb-0">
              <dt class="col-4 text-muted">Status</dt>
              <dd class="col-8"><span class="badge bg-primary">Online</span></dd>
              <dt class="col-4 text-muted">Uptime</dt>
              <dd class="col-8">${escapeHtml(formatDuration(status.uptimeMs))}</dd>
              <dt class="col-4 text-muted">Port</dt>
              <dd class="col-8">${escapeHtml(String(status.port))}</dd>
              <dt class="col-4 text-muted">Public dir</dt>
              <dd class="col-8"><code>${escapeHtml(status.publicDir)}</code></dd>
            </dl>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-6">
        <div class="card h-100 ${db.connected ? "border-success" : "border-danger"}">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <h2 class="h5 card-title mb-0">Database</h2>
              ${dbBadge}
            </div>
            <dl class="row mb-0 mt-3">
              <dt class="col-4 text-muted">Type</dt>
              <dd class="col-8">MongoDB</dd>
              <dt class="col-4 text-muted">Database</dt>
              <dd class="col-8">${escapeHtml(db.dbName || "unknown")}</dd>
              <dt class="col-4 text-muted">URI</dt>
              <dd class="col-8"><code>${escapeHtml(db.uri || "not set")}</code></dd>
              <dt class="col-4 text-muted">Last ping</dt>
              <dd class="col-8">${db.lastPingMs ? `${db.lastPingMs} ms` : "—"}</dd>
              <dt class="col-4 text-muted">Last attempt</dt>
              <dd class="col-8">${escapeHtml(formatDate(db.lastAttemptAt))}</dd>
              <dt class="col-4 text-muted">Last error</dt>
              <dd class="col-8 text-danger">${db.lastError ? escapeHtml(db.lastError) : "—"}</dd>
            </dl>
            ${dbError}
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-12 col-lg-4">
        <div class="card h-100">
          <div class="card-body">
            <h2 class="h6 text-uppercase text-secondary">Totals</h2>
            <div class="fs-1 fw-bold">${status.userCount ?? 0}</div>
            <div class="text-muted">Registered users</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-8">
        <div class="card h-100">
          <div class="card-body">
            <h2 class="h6 text-uppercase text-secondary">Top scores</h2>
            <div class="table-responsive">
              <table class="table table-sm table-dark align-middle mb-0">
                <thead><tr><th>#</th><th>User</th><th>Best</th><th>Updated</th></tr></thead>
                <tbody>${highscoresRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-12">
        <div class="card">
          <div class="card-body">
            <h2 class="h6 text-uppercase text-secondary">Recent users</h2>
            <div class="table-responsive">
              <table class="table table-sm table-dark align-middle mb-0">
                <thead><tr><th>User</th><th>Best score</th><th>Last activity</th></tr></thead>
                <tbody>${recentRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// --------- Static serving ----------
async function serveStatic(reqPath, res) {
  // Serve engine modules for browser imports (for headless bridge + parity tests)
  if (reqPath.startsWith("/engine/")) {
    const decodedEnginePath = safeDecodePath(reqPath);
    if (decodedEnginePath == null) return notFound(res);
    const decodedEngine = decodedEnginePath.replace(/^engine[\\/]/, "");
    if (!decodedEngine) return notFound(res);
    const engineRoot = path.resolve(process.cwd(), "engine");
    const resolvedEngine = path.resolve(engineRoot, decodedEngine);
    if (!resolvedEngine.startsWith(engineRoot + path.sep) && resolvedEngine !== engineRoot) {
      return notFound(res);
    }
    try {
      const data = await fs.readFile(resolvedEngine);
      const ext = path.extname(resolvedEngine).toLowerCase();
      const type = MIME[ext] || "text/plain; charset=utf-8";
      return send(res, 200, { "Content-Type": type, "Cache-Control": "no-store" }, data);
    } catch {
      // fall through to default static handler (404)
    }
  }

  // Map root to flappybingus.html
  if (reqPath === "/") reqPath = "/flappybingus.html";

  // Optional: ignore noisy browser probes
  if (reqPath === "/favicon.ico") {
    return send(res, 204, { "Cache-Control": "no-store" }, "");
  }

  const decoded = safeDecodePath(reqPath);
  if (decoded == null) return notFound(res);

  // decoded is a relative POSIX-like path, e.g. "js/main.js"
  const resolved = path.resolve(PUBLIC_DIR, decoded);
  const root = path.resolve(PUBLIC_DIR);

  // Prevent path traversal: resolved must be within PUBLIC_DIR
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return notFound(res);
  }

  let st;
  try {
    st = await fs.stat(resolved);
  } catch (_) {
    return notFound(res);
  }

  if (st.isDirectory()) return notFound(res);

  const ext = path.extname(resolved).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const cache = "no-store";

  try {
    const data = await fs.readFile(resolved);
    send(res, 200, { "Content-Type": type, "Cache-Control": cache }, data);
  } catch (_) {
    sendJson(res, 500, { ok: false, error: "read_failed" });
  }
}

function safeDecodePath(p) {
  if (!p.startsWith("/")) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(p);
  } catch {
    return null;
  }
  decoded = decoded.replaceAll("\\", "/");
  const norm = path.posix.normalize(decoded); // keeps leading slash
  if (norm.includes("..")) return null;
  // remove leading slashes -> relative path under PUBLIC_DIR
  return norm.replace(/^\/+/, "");
}

// --------- API routes ----------
async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // CORS preflight (not strictly required for same-origin game, but fine)
  if (req.method === "OPTIONS") {
    send(
      res,
      204,
      {
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": req.headers.origin || "*",
        "Access-Control-Max-Age": "86400"
      },
      ""
    );
    return;
  }

  // Me
  if (pathname === "/api/me" && req.method === "GET") {
    if (rateLimit(req, res, "/api/me")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true });
    const recordHolder = Boolean(u?.isRecordHolder);
    sendJson(res, 200, { ok: true, user: publicUser(u, { recordHolder }), trails: TRAILS });
    return;
  }

  // Register/login by username
  if (pathname === "/api/register" && req.method === "POST") {
    if (rateLimit(req, res, "/api/register")) return;
    if (!(await ensureDatabase(res))) return;
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return badRequest(res, "invalid_json");
    }
    const username = normalizeUsername(body.username);
    if (!username) return badRequest(res, "invalid_username");

    const u = await getOrCreateUser(username);
    const recordHolder = await isRecordHolder(u?.username);
    ensureUserSchema(u, { recordHolder });
    if (u) u.isRecordHolder = recordHolder;

    // Store username in cookie "sugar"
    // httpOnly is OK because the browser doesn't need to read it; the server does.
    setCookie(res, USER_COOKIE, u.username, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      secure: Boolean(process.env.COOKIE_SECURE) // set true in production if behind HTTPS
    });

    sendJson(res, 200, { ok: true, user: publicUser(u, { recordHolder }), trails: TRAILS });
    return;
  }

  // Submit score (updates best score + progression)
  if (pathname === "/api/score" && req.method === "POST") {
    if (rateLimit(req, res, "/api/score")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true });

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return badRequest(res, "invalid_json");
    }

    const { status, body: responseBody, error } = await scoreService.submitScore(u, body.score);
    if (status >= 200 && status < 300 && responseBody) {
      sendJson(res, status, responseBody);
    } else {
      if (status === 401) return unauthorized(res);
      if (status === 400) return badRequest(res, error || "invalid_score");
      sendJson(res, status, { ok: false, error: error || "score_persist_failed" });
    }
    return;
  }

  // Set selected trail cosmetic
  if (pathname === "/api/cosmetics/trail" && req.method === "POST") {
    if (rateLimit(req, res, "/api/cosmetics/trail")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true });
    if (!u) return unauthorized(res);

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return badRequest(res, "invalid_json");
    }
    const trailId = String(body.trailId || "").trim();
    const exists = TRAILS.some((t) => t.id === trailId);
    if (!exists) return badRequest(res, "invalid_trail");

    const recordHolder = Boolean(u?.isRecordHolder);
    const unlocked = unlockedTrails(u.bestScore | 0, { recordHolder });
    if (!unlocked.includes(trailId)) return badRequest(res, "trail_locked");

    const updated = await dataStore.setTrail(u.key, trailId);
    ensureUserSchema(updated, { recordHolder });

    sendJson(res, 200, { ok: true, user: publicUser(updated, { recordHolder }), trails: TRAILS });
    return;
  }

  // Set keybinds
  if (pathname === "/api/binds" && req.method === "POST") {
    if (rateLimit(req, res, "/api/binds")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true });
    if (!u) return unauthorized(res);

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return badRequest(res, "invalid_json");
    }
    const binds = validateKeybindsPayload(body.keybinds);
    if (!binds) return badRequest(res, "invalid_keybinds");

    const updated = await dataStore.setKeybinds(u.key, binds);
    const recordHolder = Boolean(u?.isRecordHolder);
    ensureUserSchema(updated, { recordHolder });

    sendJson(res, 200, { ok: true, user: publicUser(updated, { recordHolder }), trails: TRAILS });
    return;
  }

  // Highscores JSON
  if (pathname === "/api/highscores" && req.method === "GET") {
    if (rateLimit(req, res, "/api/highscores")) return;
    if (!(await ensureDatabase(res))) return;
    const limit = Number(url.searchParams.get("limit") || 20);
    sendJson(res, 200, { ok: true, highscores: await topHighscores(limit) });
    return;
  }

  if (pathname === "/trail_previews" && req.method === "GET") {
    const catalog = buildTrailPreviewCatalog(TRAILS);
    const wantsHtml = wantsPreviewHtml({
      formatParam: url.searchParams.get("format"),
      acceptHeader: req.headers.accept
    });
    if (wantsHtml) {
      sendHtml(res, 200, renderTrailPreviewPage(catalog));
    } else {
      sendJson(res, 200, catalog);
    }
    return;
  }

  if (pathname === "/status" && req.method === "GET") {
    const status = {
      port: PORT,
      publicDir: PUBLIC_DIR,
      uptimeMs: Date.now() - START_TIME,
      db: dataStore.getStatus()
    };
    try {
      await dataStore.ensureConnected();
      status.db = dataStore.getStatus();
      status.userCount = await dataStore.userCount();
      status.highscores = await topHighscores(10);
      status.recentUsers = await dataStore.recentUsers(10);
    } catch (err) {
      status.dbError = err?.message || String(err);
    }
    sendHtml(res, 200, renderStatusPage(status));
    return;
  }

  // Simple HTML highscores page
  if (pathname === "/highscores" && req.method === "GET") {
    if (!(await ensureDatabase(res))) return;
    const list = await topHighscores(50);
    const rows = list
      .map(
        (e, i) =>
          `<tr><td class="mono">${i + 1}</td><td>${escapeHtml(
            e.username
          )}</td><td class="mono">${e.bestScore}</td></tr>`
      )
      .join("");
    sendHtml(
      res,
      200,
      `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Flappy Bingus – High Scores</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;background:#0b1220;color:#e5e7eb}
  header{padding:18px 16px;border-bottom:1px solid rgba(255,255,255,.10);background:#0b1020}
  .wrap{max-width:820px;margin:0 auto;padding:18px 16px}
  table{width:100%;border-collapse:collapse;background:#0f172a;border:1px solid rgba(255,255,255,.10);border-radius:12px;overflow:hidden}
  th,td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);text-align:left}
  th{background:rgba(255,255,255,.04)}
  .mono{font-family:ui-monospace,Menlo,Monaco,Consolas,monospace}
  a{color:#7dd3fc;text-decoration:none}
</style>
</head>
<body>
<header><div class="wrap"><b>High Scores</b> • <a href="/">Back to game</a></div></header>
<div class="wrap">
  <table>
    <thead><tr><th>#</th><th>User</th><th>Best</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="3">No scores yet.</td></tr>`}</tbody>
  </table>
</div>
</body></html>`
    );
    return;
  }

  // Static files (this is what must serve /js/main.js)
  return serveStatic(pathname, res);
}

// --------- Server start ----------
async function startServer() {
  if (!fssync.existsSync(PUBLIC_DIR)) {
    console.warn(`[bingus] PUBLIC_DIR missing: ${PUBLIC_DIR}`);
  }
  try {
    await dataStore.ensureConnected();
    const st = dataStore.getStatus();
    console.log(`[bingus] database ready at ${st.uri} (db ${st.dbName})`);
  } catch (err) {
    console.error("[bingus] database connection failed at startup:", err);
  }

  const server = http.createServer((req, res) => {
    route(req, res).catch((err) => {
      console.error("[bingus] handler error:", err);
      sendJson(res, 500, { ok: false, error: "internal_error" });
    });
  });

  server.listen(PORT, () => {
    console.log(`[bingus] listening on :${PORT}`);
    console.log(`[bingus] serving public from ${PUBLIC_DIR}`);
    console.log(`[bingus] mongo target ${mongoConfig.maskedUri} (db ${mongoConfig.dbName})`);
    console.log(`[bingus] NOTE: put your client file at ${path.join(PUBLIC_DIR, "js", "main.js")} so /js/main.js works`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  TRAILS,
  unlockedTrails,
  ensureUserSchema,
  publicUser,
  isRecordHolder,
  normalizeUsername,
  keyForUsername,
  route,
  startServer
};
