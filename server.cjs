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
const crypto = require("node:crypto");

const { MongoDataStore, resolveMongoConfig, serializeDocument } = require("./db/mongo.cjs");
const { createScoreService, clampScoreDefault } = require("./services/scoreService.cjs");
const { buildTrailPreviewCatalog } = require("./services/trailCatalog.cjs");
const { renderTrailPreviewPage, wantsPreviewHtml } = require("./services/trailPreviewPage.cjs");
const { renderUnlockablesPage, wantsUnlockablesHtml } = require("./services/unlockablesPage.cjs");
const {
  applyUnlockableMenuConfig,
  createServerConfigStore,
  DEFAULT_RATE_LIMIT_CONFIG,
  DEFAULT_SERVER_CONFIG
} = require("./services/serverConfig.cjs");
const { createGameConfigStore } = require("./services/gameConfigStore.cjs");
const { createIconRegistryStore } = require("./services/iconRegistryStore.cjs");
const {
  ACHIEVEMENTS,
  normalizeAchievementState,
  validateRunStats,
  evaluateRunForAchievements,
  buildAchievementsPayload
} = require("./services/achievements.cjs");
const {
  ACHIEVEMENT_SCHEMA,
  normalizeAchievementDefinitions,
  resolveAchievementDefinitions
} = require("./services/achievementDefinitions.cjs");
const { MAX_MEDIA_BYTES, MAX_REPLAY_BYTES, normalizeBestRunRequest, hydrateReplayFromJson } = require("./services/bestRuns.cjs");
const { DEFAULT_SKILL_TOTALS, normalizeSkillTotals } = require("./services/skillConsts.cjs");
const {
  normalizePlayerIcons,
  unlockedIcons
} = require("./services/playerIcons.cjs");
const { getBaseIconCatalog, normalizeIconCatalog, resolveIconCatalog } = require("./services/iconCatalog.cjs");
const {
  DEFAULT_PIPE_TEXTURE_ID,
  DEFAULT_PIPE_TEXTURE_MODE,
  PIPE_TEXTURES: PIPE_TEXTURE_DEFS,
  normalizePipeTextureMode,
  normalizePipeTextures
} = require("./services/pipeTextures.cjs");
const {
  UNLOCKABLE_TYPES,
  normalizeUnlock,
  buildUnlockablesCatalog,
  getUnlockedIdsByType,
  isUnlockSatisfied
} = require("./services/unlockables.cjs");
const { normalizeTrailStyleOverrides } = require("./services/trailStyleOverrides.cjs");
const {
  DEFAULT_CURRENCY_ID,
  SUPPORT_CURRENCY_ID,
  normalizeCurrencyWallet,
  getCurrencyBalance,
  debitCurrency
} = require("./services/currency.cjs");
const { renderPlayerCardJpeg } = require("./services/playerCard.cjs");
const { createReplayMp4Pipeline, normalizeRenderProfile } = require("./services/replayMp4Pipeline.cjs");

// --------- Config (env overrides) ----------
const PORT = Number(process.env.PORT || 3000);

const PUBLIC_DIR = process.env.PUBLIC_DIR
  ? path.resolve(process.env.PUBLIC_DIR)
  : path.join(process.cwd(), "public");
const GAME_CONFIG_PATH = process.env.GAME_CONFIG_PATH
  ? path.resolve(process.env.GAME_CONFIG_PATH)
  : path.join(PUBLIC_DIR, "FLAPPY_BINGUS_CONFIG.json");

const START_TIME = Date.now();

// Mongo configuration: MONGODB_URI (supports {PASSWORD} placeholder), MONGODB_PASSWORD, MONGODB_DB
const mongoConfig = resolveMongoConfig();
let dataStore = new MongoDataStore(mongoConfig);
let scoreService = null;
let replayMp4Pipeline = createReplayMp4Pipeline({ storageDir: process.env.REPLAY_MP4_DIR });

// Test-only: allow swapping the datastore to avoid network calls.
function _setDataStoreForTests(mock) {
  const safeStore = {
    recordScore: async () => {
      throw new Error("recordScore_not_mocked");
    },
    recordBestRun: async () => {
      throw new Error("recordBestRun_not_mocked");
    },
    recordSupportOffer: async () => {
      throw new Error("recordSupportOffer_not_mocked");
    },
    getBestRunByUsername: async () => null,
    listBestRuns: async () => [],
    getUserByKey: async () => null,
    ...mock
  };
  dataStore = safeStore;
  scoreService = createScoreService({
    dataStore: safeStore,
    ensureUserSchema,
    publicUser,
    listHighscores: () => topHighscores(20),
    trails: () => getResolvedUnlockables().trails,
    icons: () => getResolvedUnlockables().icons,
    pipeTextures: () => getResolvedUnlockables().pipeTextures,
    unlockables: () => getResolvedUnlockables().unlockables,
    clampScore: clampScoreDefault,
    normalizeAchievements: normalizeAchievementState,
    validateRunStats,
    evaluateAchievements: (payload) => evaluateRunForAchievements({ ...payload, definitions: getAchievementDefinitions() }),
    buildAchievementsPayload: (user, unlocked) => buildAchievementsPayload(user, unlocked, getAchievementDefinitions())
  });
}

function _setReplayMp4PipelineForTests(mock) {
  replayMp4Pipeline = mock;
}

function _setConfigStoreForTests(mock) {
  serverConfigStore = mock;
}

function _setGameConfigStoreForTests(mock) {
  gameConfigStore = mock;
}

function _setIconRegistryStoreForTests(mock) {
  iconRegistryStore = mock;
}

// Cookie that holds username (legacy)
const USER_COOKIE = "sugar";
const SESSION_COOKIE = "bingus_session";
let SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

// Default skill keybinds (requested defaults):
// Space = Dash
// Left Mouse = Teleport
// Right Mouse = Invulnerability (phase)
// E = Slow Field
const DEFAULT_KEYBINDS = Object.freeze({
  dash: { type: "key", code: "Space" },
  phase: { type: "mouse", button: 2 },
  teleport: { type: "mouse", button: 0 },
  slowField: { type: "key", code: "KeyE" }
});

const TEXT_STYLE_PRESET_VALUES = new Set([
  "basic",
  "comic_book_mild",
  "comic_book_extreme",
  "digital",
  "clean",
  "neon_pulse",
  "holographic",
  "sticker_blast",
  "random",
  "disabled",
  "custom"
]);

const DEFAULT_TEXT_STYLE_CUSTOM = Object.freeze({
  fontFamily: "system",
  fontWeight: 900,
  sizeScale: 1,
  useGameColors: true,
  useGameGlow: true,
  color: "#ffffff",
  glowColor: "#ffffff",
  strokeColor: "#000000",
  strokeWidth: 1.8,
  shadowBoost: 0,
  shadowOffsetY: 3,
  wobble: 0,
  spin: 0,
  shimmer: 0,
  sparkle: false,
  useGradient: false,
  gradientStart: "#fff3a6",
  gradientEnd: "#7ce9ff"
});

const DEFAULT_SETTINGS = Object.freeze({
  dashBehavior: "destroy",
  slowFieldBehavior: "explosion",
  teleportBehavior: "normal",
  invulnBehavior: "long",
  textStylePreset: "basic",
  textStyleCustom: DEFAULT_TEXT_STYLE_CUSTOM,
  simpleBackground: true,
  simpleTextures: false,
  simpleParticles: true,
  reducedEffects: true,
  extremeLowDetail: false
});

const ENDPOINT_GROUPS = Object.freeze([
  {
    id: "pages",
    title: "Pages & Experiences",
    description: "Human-friendly views and dashboards rendered by the server.",
    endpoints: [
      {
        path: "/",
        methods: ["GET"],
        summary: "Main game client served from the public directory.",
        page: true,
        link: "/"
      },
      {
        path: "/endpointBrowser",
        methods: ["GET"],
        summary: "Curated directory of every public endpoint.",
        page: true,
        link: "/endpointBrowser"
      },
      {
        path: "/highscores",
        methods: ["GET"],
        summary: "HTML leaderboard view.",
        page: true,
        link: "/highscores"
      },
      {
        path: "/status",
        methods: ["GET"],
        summary: "Live server + database status dashboard.",
        page: true,
        link: "/status"
      },
      {
        path: "/achievementeditor",
        methods: ["GET"],
        summary: "Admin tool for editing achievement requirements.",
        page: true,
        link: "/achievementeditor"
      },
      {
        path: "/traileditor",
        methods: ["GET"],
        summary: "Admin tool for editing trail styles and unlock rules.",
        page: true,
        link: "/traileditor"
      },
      {
        path: "/replayBrowser",
        methods: ["GET"],
        summary: "Replay browser interface.",
        page: true,
        link: "/replayBrowser"
      },
      {
        path: "/trail_previews",
        methods: ["GET"],
        summary: "Trail preview gallery (HTML when requested).",
        page: true,
        link: "/trail_previews?format=html"
      },
      {
        path: "/unlockables",
        methods: ["GET"],
        summary: "Unlockables catalog (HTML when requested).",
        page: true,
        link: "/unlockables?format=html"
      },
      {
        path: "/bigflappin",
        methods: ["GET"],
        summary: "Admin UI from the public bundle.",
        page: true,
        link: "/bigflappin"
      }
    ]
  },
  {
    id: "identity",
    title: "Identity & Session APIs",
    description: "Session bootstrapping and current-user data.",
    endpoints: [
      {
        path: "/api/me",
        methods: ["GET"],
        summary: "Returns the current player session payload."
      },
      {
        path: "/api/sync",
        methods: ["GET"],
        summary: "Fetches player state, catalogs, highscores, and stats in one payload."
      },
      {
        path: "/api/register",
        methods: ["POST"],
        summary: "Register or log in with a username."
      }
    ]
  },
  {
    id: "scores",
    title: "Scores & Runs APIs",
    description: "Submit runs, load replays, and query leaderboards.",
    endpoints: [
      {
        path: "/api/score",
        methods: ["POST"],
        summary: "Submit a score and progression updates."
      },
      {
        path: "/api/run/best",
        methods: ["GET", "POST"],
        summary: "Fetch or upload the best run for a player."
      },
      {
        path: "/api/replays",
        methods: ["GET"],
        summary: "List stored best-run replay metadata."
      },
      {
        path: "/api/replays/:username/render-mp4",
        methods: ["POST"],
        summary: "Request a replay render job to generate an MP4."
      },
      {
        path: "/api/replays/:username/render-mp4/status",
        methods: ["GET"],
        summary: "Check the status of a replay render job."
      },
      {
        path: "/api/replays/:username/mp4",
        methods: ["GET"],
        summary: "Download a completed replay MP4."
      },
      {
        path: "/playerCard",
        methods: ["GET"],
        summary: "Render a JPEG player card from replay data."
      },
      {
        path: "/api/highscores",
        methods: ["GET"],
        summary: "JSON highscores feed."
      },
      {
        path: "/api/stats",
        methods: ["GET"],
        summary: "Aggregate run statistics."
      }
    ]
  },
  {
    id: "cosmetics",
    title: "Cosmetics & Settings APIs",
    description: "Select cosmetics, spend currency, and update settings.",
    endpoints: [
      {
        path: "/api/cosmetics/trail",
        methods: ["POST"],
        summary: "Select the active trail cosmetic."
      },
      {
        path: "/api/cosmetics/icon",
        methods: ["POST"],
        summary: "Select the active player icon."
      },
      {
        path: "/api/cosmetics/pipe_texture",
        methods: ["POST"],
        summary: "Select the active pipe texture."
      },
      {
        path: "/api/shop/purchase",
        methods: ["POST"],
        summary: "Purchase a cosmetic unlockable."
      },
      {
        path: "/api/binds",
        methods: ["POST"],
        summary: "Update keybind settings."
      },
      {
        path: "/api/settings",
        methods: ["POST"],
        summary: "Update player accessibility and effect settings."
      },
      {
        path: "/api/trail-styles",
        methods: ["GET"],
        summary: "Fetch runtime trail style overrides."
      },
      {
        path: "/api/icon-registry",
        methods: ["GET"],
        summary: "Fetch the player icon registry for menu rendering."
      }
    ]
  },
  {
    id: "admin",
    title: "Admin & Config APIs",
    description: "Config and content-management endpoints.",
    endpoints: [
      {
        path: "/api/admin/config",
        methods: ["GET", "PUT"],
        summary: "Read or update server configuration."
      },
      {
        path: "/api/admin/game-config",
        methods: ["GET", "PUT"],
        summary: "Read or update game configuration."
      },
      {
        path: "/api/admin/unlockables",
        methods: ["GET"],
        summary: "Fetch unlockable definitions."
      },
      {
        path: "/api/admin/achievements",
        methods: ["GET", "PUT"],
        summary: "Read or update achievement definitions."
      },
      {
        path: "/api/admin/trail-styles",
        methods: ["GET", "PUT"],
        summary: "Read or update trail styles and unlock rules."
      },
      {
        path: "/api/admin/icon-registry",
        methods: ["GET", "PUT"],
        summary: "Read or update the player icon registry."
      },
      {
        path: "/api/admin/collections",
        methods: ["GET"],
        summary: "List available database collections."
      },
      {
        path: "/api/admin/collections/:collection",
        methods: ["GET", "POST"],
        summary: "List or insert documents in a collection."
      },
      {
        path: "/api/admin/collections/:collection/:docId",
        methods: ["GET", "PUT"],
        summary: "Fetch or replace a document by ID."
      }
    ]
  }
]);

const TRAILS = Object.freeze([
  { id: "classic", name: "Classic", minScore: 0, achievementId: "trail_classic_1", alwaysUnlocked: true },
  { id: "ember", name: "Ember Core", minScore: 100, achievementId: "trail_ember_100" },
  { id: "sunset", name: "Sunset Fade", minScore: 250, achievementId: "trail_sunset_250" },
  { id: "gothic", name: "Garnet Dusk", minScore: 400, achievementId: "trail_gothic_400" },
  { id: "glacier", name: "Glacial Drift", minScore: 575, achievementId: "trail_glacier_575" },
  { id: "ocean", name: "Tidal Current", minScore: 750, achievementId: "trail_ocean_750" },
  { id: "miami", name: "Neon Miami", minScore: 950, achievementId: "trail_miami_950" },
  { id: "aurora", name: "Aurora", minScore: 1150, achievementId: "trail_aurora_1150" },
  { id: "rainbow", name: "Prismatic Ribbon", achievementId: "play_10_games" },
  { id: "solar", name: "Solar Flare", minScore: 1550, achievementId: "trail_solar_1550" },
  { id: "storm", name: "Stormstrike", minScore: 1750, achievementId: "trail_storm_1750" },
  { id: "magma", name: "Forgefire", minScore: 1950, achievementId: "trail_magma_1950" },
  { id: "plasma", name: "Plasma Arc", minScore: 2150, achievementId: "trail_plasma_2150" },
  { id: "nebula", name: "Starfall Drift", minScore: 2350, achievementId: "trail_nebula_2350" },
  { id: "honeycomb", name: "Honeycomb Drift", achievementId: "pipes_broken_explosion_10" },
  { id: "lemon_slice", name: "Lemon Slice", achievementId: "run_time_60" },
  { id: "starlight_pop", name: "Starlight Pop", unlock: { type: "purchase", cost: 100 } },
  { id: "dragonfire", name: "Dragonfire", minScore: 2600, achievementId: "trail_dragonfire_2600" },
  { id: "ultraviolet", name: "Ultraviolet Pulse", minScore: 2800, achievementId: "trail_ultraviolet_2800" },
  { id: "world_record", name: "World Record Cherry Blossom", minScore: 3000, achievementId: "trail_world_record_3000", requiresRecordHolder: true }
]);

const PIPE_TEXTURES = normalizePipeTextures(PIPE_TEXTURE_DEFS);

const SERVER_CONFIG_PATH = process.env.SERVER_CONFIG_PATH;
const SERVER_CONFIG_RELOAD_MS = Number(process.env.SERVER_CONFIG_RELOAD_MS || 15_000);
let serverConfigStore = createServerConfigStore({
  configPath: SERVER_CONFIG_PATH,
  reloadIntervalMs: SERVER_CONFIG_RELOAD_MS
});
let gameConfigStore = createGameConfigStore({ configPath: GAME_CONFIG_PATH });
let iconRegistryStore = createIconRegistryStore();

function createServerConfigPersistence(store) {
  return {
    load: async () => {
      const doc = await store.getServerConfig();
      return doc?.config ?? null;
    },
    save: async (config) => {
      await store.saveServerConfig(config);
    }
  };
}

function createGameConfigPersistence(store) {
  return {
    load: async () => {
      const doc = await store.getGameConfig();
      return doc?.config ?? null;
    },
    save: async (config) => {
      await store.saveGameConfig(config);
    }
  };
}

function createIconRegistryPersistence(store) {
  return {
    load: async () => await store.getIconRegistry(),
    save: async (icons) => {
      await store.saveIconRegistry(icons);
    }
  };
}

// --------- Domain helpers ----------
function nowMs() {
  return Date.now();
}

function getServerConfig() {
  return serverConfigStore?.getConfig?.() || structuredClone(DEFAULT_SERVER_CONFIG);
}

function getAchievementDefinitions() {
  const cfg = getServerConfig();
  return resolveAchievementDefinitions(cfg?.achievements?.definitions, ACHIEVEMENTS);
}

function getTrailStyleOverrides() {
  const cfg = gameConfigStore?.getConfig?.() || {};
  const overrides = cfg?.trailStyles?.overrides;
  const result = normalizeTrailStyleOverrides({ overrides });
  return result.ok ? result.overrides : {};
}

function formatTrailName(id) {
  return String(id || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFirstIconId(icons = []) {
  if (!Array.isArray(icons) || icons.length === 0) return "";
  return icons[0]?.id || "";
}

function getTrailDefinitions(overrides = getTrailStyleOverrides()) {
  const overrideIds = Object.keys(overrides || {}).map((id) => String(id || "").trim()).filter(Boolean);
  const known = new Set(TRAILS.map((trail) => trail.id));

  const baseTrails = TRAILS.map((trail) => {
    const override = overrides?.[trail.id] || {};
    const baseUnlock = trail.unlock
      ? normalizeUnlock(trail.unlock)
      : trail.requiresRecordHolder
        ? normalizeUnlock({ type: "record", label: "Record holder", minScore: trail.minScore })
        : trail.alwaysUnlocked
          ? normalizeUnlock({ type: "free", label: "Free" })
          : normalizeUnlock({
            type: "achievement",
            id: trail.achievementId || `trail_${trail.id}`,
            minScore: Number.isFinite(trail.minScore) ? trail.minScore : null,
            label: Number.isFinite(trail.minScore) ? `Score ${trail.minScore}+` : "Achievement"
          });
    return {
      ...trail,
      name: override.name || trail.name,
      unlock: override.unlock || baseUnlock
    };
  });

  const customTrails = overrideIds
    .filter((id) => !known.has(id))
    .map((id) => {
      const override = overrides?.[id] || {};
      return {
        id,
        name: override.name || formatTrailName(id) || id,
        minScore: 0,
        alwaysUnlocked: !override.unlock,
        unlock: override.unlock || normalizeUnlock({ type: "free", label: "Free" })
      };
    });
  return [...baseTrails, ...customTrails];
}

function getIconDefinitions() {
  const storedIcons = iconRegistryStore?.getIcons?.() || [];
  return resolveIconCatalog({ storedIcons });
}

function getResolvedUnlockables() {
  const resolved = { trails: getTrailDefinitions(), icons: getIconDefinitions(), pipeTextures: PIPE_TEXTURES };
  const { unlockables } = buildUnlockablesCatalog(resolved);
  return { ...resolved, unlockables };
}

function getUnlockedIconIds(user, { resolvedUnlockables = getResolvedUnlockables(), recordHolder = false } = {}) {
  const ownedIds = Array.isArray(user?.ownedUnlockables) ? user.ownedUnlockables : [];
  return getUnlockedIdsByType({
    unlockables: resolvedUnlockables.unlockables,
    type: UNLOCKABLE_TYPES.playerTexture,
    context: {
      achievements: user?.achievements,
      bestScore: user?.bestScore,
      ownedIds,
      recordHolder
    }
  });
}

function getSessionConfig() {
  const cfg = getServerConfig();
  return cfg.session || DEFAULT_SERVER_CONFIG.session;
}

function getRateLimitConfig(pathname) {
  const cfg = getServerConfig();
  const rateLimits = cfg.rateLimits || DEFAULT_RATE_LIMIT_CONFIG;
  return rateLimits[pathname] || rateLimits.default || DEFAULT_RATE_LIMIT_CONFIG.default;
}

function getVisibleCatalog() {
  const resolved = getResolvedUnlockables();
  const config = getServerConfig();
  const menus = config?.unlockableMenus || DEFAULT_SERVER_CONFIG.unlockableMenus;
  const trailMenu = menus?.trail || DEFAULT_SERVER_CONFIG.unlockableMenus.trail;
  const playerMenu = menus?.player_texture || DEFAULT_SERVER_CONFIG.unlockableMenus.player_texture;
  const baseTrailIds = new Set(TRAILS.map((trail) => trail.id));
  const baseIconIds = new Set(getBaseIconCatalog().map((icon) => icon.id));
  const customTrailIds = resolved.trails
    .map((trail) => trail?.id)
    .filter((id) => id && !baseTrailIds.has(id));
  const customIconIds = resolved.icons
    .map((icon) => icon?.id)
    .filter((id) => id && !baseIconIds.has(id));
  const shouldMergeCustomTrails = trailMenu?.mode === "allowlist" && customTrailIds.length > 0;
  const shouldMergeCustomIcons = playerMenu?.mode === "allowlist" && customIconIds.length > 0;
  const adjustedConfig = shouldMergeCustomTrails || shouldMergeCustomIcons
    ? {
      ...config,
      unlockableMenus: {
        ...menus,
        ...(shouldMergeCustomTrails
          ? {
            trail: {
              ...trailMenu,
              ids: [
                ...(Array.isArray(trailMenu.ids) ? trailMenu.ids : []),
                ...customTrailIds.filter((id) => !trailMenu.ids?.includes(id))
              ]
            }
          }
          : {}),
        ...(shouldMergeCustomIcons
          ? {
            player_texture: {
              ...playerMenu,
              ids: [
                ...(Array.isArray(playerMenu.ids) ? playerMenu.ids : []),
                ...customIconIds.filter((id) => !playerMenu.ids?.includes(id))
              ]
            }
          }
          : {})
      }
    }
    : config;
  return applyUnlockableMenuConfig(resolved, adjustedConfig);
}

function serializeAdminDoc(doc) {
  return serializeDocument(doc);
}

function isValidCollectionName(name) {
  return typeof name === "string" && /^[a-zA-Z0-9_.-]+$/.test(name);
}

// --------- Helpers ----------
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
  const cfg = getRateLimitConfig(name);
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

function isSecureRequest(req) {
  const forwarded = req.headers["x-forwarded-proto"];
  if (typeof forwarded === "string") {
    const proto = forwarded.split(",")[0].trim().toLowerCase();
    if (proto === "https") return true;
  }
  return Boolean(req.socket?.encrypted);
}

function setCookie(res, name, value, opts = {}) {
  const maxAge = Number.isFinite(opts.maxAge) ? opts.maxAge : 60 * 60 * 24 * 365;
  const sameSite = opts.sameSite ?? "Lax";
  const parts = [
    `${name}=${encodeURIComponent(String(value))}`,
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
    "Path=/",
    `SameSite=${sameSite}`
  ];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  const serialized = parts.join("; ");
  const prev = typeof res.getHeader === "function" ? res.getHeader("Set-Cookie") : res.headers?.["Set-Cookie"];
  let next = serialized;
  if (prev) {
    if (Array.isArray(prev)) next = [...prev, serialized];
    else next = [prev, serialized];
  }
  res.setHeader("Set-Cookie", next);
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

function unlockedTrails({ achievements, bestScore = 0, ownedIds = [] } = {}, { recordHolder = false } = {}) {
  const normalized = normalizeAchievementState(achievements);
  const unlockedAchievements = normalized.unlocked || {};
  const best = Math.max(Number(bestScore) || 0, normalized.progress?.bestScore || 0);
  const owned = new Set(
    Array.isArray(ownedIds)
      ? ownedIds.map((id) => (typeof id === "string" ? id : null)).filter(Boolean)
      : []
  );
  const trails = getResolvedUnlockables().trails;

  return trails.filter((t) => {
    if (t.unlock) {
      return isUnlockSatisfied(
        { id: t.id, unlock: t.unlock },
        { achievements: normalized, bestScore: best, ownedIds: Array.from(owned), recordHolder }
      );
    }
    if (t.alwaysUnlocked) return true;
    if (t.requiresRecordHolder && !recordHolder) return false;
    const required = t.achievementId;
    const hasScoreRequirement = Number.isFinite(t.minScore);
    if (required && unlockedAchievements[required]) return true;
    if (required && hasScoreRequirement && best >= t.minScore && !unlockedAchievements[required]) return true;
    return false;
  }).map((t) => t.id);
}

function syncTrailAchievementsState(state, { bestScore = 0, totalRuns = 0, recordHolder = false, now = nowMs() } = {}) {
  const normalized = normalizeAchievementState(state);
  const safeBest = normalizeScore(bestScore);
  normalized.progress.bestScore = Math.max(normalized.progress.bestScore || 0, safeBest);
  normalized.progress.totalRuns = Math.max(normalized.progress.totalRuns || 0, normalizeCount(totalRuns));

  const trails = getResolvedUnlockables().trails;
  for (const t of trails) {
    const unlock = t.unlock;
    if (unlock?.type === "achievement" && Number.isFinite(unlock.minScore)) {
      if (safeBest < unlock.minScore) continue;
      if (!normalized.unlocked[unlock.id]) {
        normalized.unlocked[unlock.id] = now;
      }
      continue;
    }
    if (!t.achievementId) continue;
    if (t.requiresRecordHolder && !recordHolder) continue;
    if (!Number.isFinite(t.minScore)) continue;
    const meetsScore = safeBest >= t.minScore;
    if (!meetsScore) continue;
    if (!normalized.unlocked[t.achievementId]) {
      normalized.unlocked[t.achievementId] = now;
    }
  }

  return normalized;
}

function ensureUserSchema(u, { recordHolder = false } = {}) {
  if (!u || typeof u !== "object") return;
  const resolvedUnlockables = getResolvedUnlockables();
  const fallbackIconId = getFirstIconId(resolvedUnlockables.icons);
  u.bestScore = normalizeScore(u.bestScore);
  u.runs = normalizeCount(u.runs);
  u.totalScore = normalizeTotal(u.totalScore);
  u.longestRun = normalizeTotal(u.longestRun);
  u.totalTimePlayed = normalizeTotal(u.totalTimePlayed);
  u.bustercoins = normalizeCount(u.bustercoins);
  u.currencies = normalizeCurrencyWallet(u.currencies, { [DEFAULT_CURRENCY_ID]: u.bustercoins });
  u.bustercoins = getCurrencyBalance(u.currencies, DEFAULT_CURRENCY_ID);
  u.achievements = syncTrailAchievementsState(u.achievements, { bestScore: u.bestScore, totalRuns: u.runs, recordHolder });
  if (u.runs >= 10 && !u.achievements.unlocked?.play_10_games) {
    u.achievements.unlocked = { ...u.achievements.unlocked, play_10_games: nowMs() };
  }
  u.skillTotals = normalizeSkillTotals(u.skillTotals || DEFAULT_SKILL_TOTALS);
  if (typeof u.selectedTrail !== "string") u.selectedTrail = "classic";
  if (typeof u.selectedIcon !== "string") u.selectedIcon = fallbackIconId;
  const legacyOwnedIcons = Array.isArray(u.ownedIcons) ? u.ownedIcons : [];
  const ownedUnlockables = Array.isArray(u.ownedUnlockables) ? u.ownedUnlockables : [];
  const mergedOwned = Array.from(new Set(
    [...legacyOwnedIcons, ...ownedUnlockables].filter((id) => typeof id === "string" && id.length)
  ));
  u.ownedUnlockables = mergedOwned;
  u.ownedIcons = mergedOwned;
  if (!u.keybinds || typeof u.keybinds !== "object")
    u.keybinds = structuredClone(DEFAULT_KEYBINDS);
  if (!u.settings || typeof u.settings !== "object")
    u.settings = structuredClone(DEFAULT_SETTINGS);
  if (typeof u.selectedPipeTexture !== "string") u.selectedPipeTexture = DEFAULT_PIPE_TEXTURE_ID;
  u.pipeTextureMode = normalizePipeTextureMode(u.pipeTextureMode || DEFAULT_PIPE_TEXTURE_MODE);

  // Merge any missing bind keys with defaults
  u.keybinds = mergeKeybinds(DEFAULT_KEYBINDS, u.keybinds);
  u.settings = normalizeSettings(u.settings);
  // Ensure selected trail is unlocked
  const unlocked = unlockedTrails(
    { achievements: u.achievements, bestScore: u.bestScore, ownedIds: u.ownedUnlockables },
    { recordHolder }
  );
  if (!unlocked.includes(u.selectedTrail)) u.selectedTrail = "classic";

  const availableIconIds = getUnlockedIconIds(u, { resolvedUnlockables, recordHolder });
  if (!availableIconIds.includes(u.selectedIcon)) {
    u.selectedIcon = availableIconIds[0] || fallbackIconId;
  }

  const availablePipeTextures = getUnlockedIdsByType({
    unlockables: resolvedUnlockables.unlockables,
    type: UNLOCKABLE_TYPES.pipeTexture,
    context: { achievements: u.achievements, bestScore: u.bestScore, ownedIds: u.ownedUnlockables, recordHolder }
  });
  if (!availablePipeTextures.includes(u.selectedPipeTexture)) {
    u.selectedPipeTexture = availablePipeTextures[0] || DEFAULT_PIPE_TEXTURE_ID;
  }
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

const LEGACY_TEXT_STYLE_MAP = Object.freeze({
  none: "basic",
  mild: "comic_book_mild",
  extreme: "comic_book_extreme"
});

function normalizeNumber(value, fallback, { min = -Infinity, max = Infinity } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeColor(value, fallback) {
  return (typeof value === "string" && value.trim()) ? value.trim() : fallback;
}

function normalizeBoolean(value, fallback) {
  return (typeof value === "boolean") ? value : fallback;
}

function normalizeTextStylePreset(value) {
  return TEXT_STYLE_PRESET_VALUES.has(value) ? value : DEFAULT_SETTINGS.textStylePreset;
}

function normalizeTextStyleCustom(custom = {}) {
  const src = custom && typeof custom === "object" ? custom : {};
  const allowedFonts = new Set(["system", "comic", "digital", "serif", "mono"]);
  return {
    fontFamily: allowedFonts.has(src.fontFamily) ? src.fontFamily : DEFAULT_TEXT_STYLE_CUSTOM.fontFamily,
    fontWeight: normalizeNumber(src.fontWeight, DEFAULT_TEXT_STYLE_CUSTOM.fontWeight, { min: 400, max: 950 }),
    sizeScale: normalizeNumber(src.sizeScale, DEFAULT_TEXT_STYLE_CUSTOM.sizeScale, { min: 0.7, max: 1.6 }),
    useGameColors: normalizeBoolean(src.useGameColors, DEFAULT_TEXT_STYLE_CUSTOM.useGameColors),
    useGameGlow: normalizeBoolean(src.useGameGlow, DEFAULT_TEXT_STYLE_CUSTOM.useGameGlow),
    color: normalizeColor(src.color, DEFAULT_TEXT_STYLE_CUSTOM.color),
    glowColor: normalizeColor(src.glowColor, DEFAULT_TEXT_STYLE_CUSTOM.glowColor),
    strokeColor: normalizeColor(src.strokeColor, DEFAULT_TEXT_STYLE_CUSTOM.strokeColor),
    strokeWidth: normalizeNumber(src.strokeWidth, DEFAULT_TEXT_STYLE_CUSTOM.strokeWidth, { min: 0, max: 6 }),
    shadowBoost: normalizeNumber(src.shadowBoost, DEFAULT_TEXT_STYLE_CUSTOM.shadowBoost, { min: -10, max: 30 }),
    shadowOffsetY: normalizeNumber(src.shadowOffsetY, DEFAULT_TEXT_STYLE_CUSTOM.shadowOffsetY, { min: -6, max: 12 }),
    wobble: normalizeNumber(src.wobble, DEFAULT_TEXT_STYLE_CUSTOM.wobble, { min: 0, max: 6 }),
    spin: normalizeNumber(src.spin, DEFAULT_TEXT_STYLE_CUSTOM.spin, { min: -1, max: 1 }),
    shimmer: normalizeNumber(src.shimmer, DEFAULT_TEXT_STYLE_CUSTOM.shimmer, { min: 0, max: 1 }),
    sparkle: normalizeBoolean(src.sparkle, DEFAULT_TEXT_STYLE_CUSTOM.sparkle),
    useGradient: normalizeBoolean(src.useGradient, DEFAULT_TEXT_STYLE_CUSTOM.useGradient),
    gradientStart: normalizeColor(src.gradientStart, DEFAULT_TEXT_STYLE_CUSTOM.gradientStart),
    gradientEnd: normalizeColor(src.gradientEnd, DEFAULT_TEXT_STYLE_CUSTOM.gradientEnd)
  };
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

function normalizeSettings(settings) {
  const src = settings && typeof settings === "object" ? settings : {};
  const validDash = src.dashBehavior === "ricochet" || src.dashBehavior === "destroy";
  const validSlow = src.slowFieldBehavior === "slow" || src.slowFieldBehavior === "explosion";
  const validTp = src.teleportBehavior === "normal" || src.teleportBehavior === "explode";
  const validInv = src.invulnBehavior === "short" || src.invulnBehavior === "long";
  const presetCandidate = src.textStylePreset ?? LEGACY_TEXT_STYLE_MAP[src.comicBookMode];
  const validPreset = TEXT_STYLE_PRESET_VALUES.has(presetCandidate);
  const dash = validDash ? src.dashBehavior : DEFAULT_SETTINGS.dashBehavior;
  const slow = validSlow ? src.slowFieldBehavior : DEFAULT_SETTINGS.slowFieldBehavior;
  const tp = validTp ? src.teleportBehavior : DEFAULT_SETTINGS.teleportBehavior;
  const inv = validInv ? src.invulnBehavior : DEFAULT_SETTINGS.invulnBehavior;
  const textStylePreset = validPreset ? presetCandidate : DEFAULT_SETTINGS.textStylePreset;
  const textStyleCustom = normalizeTextStyleCustom(src.textStyleCustom);
  return {
    dashBehavior: dash,
    slowFieldBehavior: slow,
    teleportBehavior: tp,
    invulnBehavior: inv,
    textStylePreset,
    textStyleCustom,
    simpleBackground: typeof src.simpleBackground === "boolean" ? src.simpleBackground : DEFAULT_SETTINGS.simpleBackground,
    simpleTextures: typeof src.simpleTextures === "boolean" ? src.simpleTextures : DEFAULT_SETTINGS.simpleTextures,
    simpleParticles: typeof src.simpleParticles === "boolean" ? src.simpleParticles : DEFAULT_SETTINGS.simpleParticles,
    reducedEffects: typeof src.reducedEffects === "boolean" ? src.reducedEffects : DEFAULT_SETTINGS.reducedEffects,
    extremeLowDetail: typeof src.extremeLowDetail === "boolean"
      ? src.extremeLowDetail
      : DEFAULT_SETTINGS.extremeLowDetail
  };
}

function validateSettingsPayload(settings) {
  if (!settings || typeof settings !== "object") return null;
  const dash = settings.dashBehavior;
  const slow = settings.slowFieldBehavior;
  const tp = settings.teleportBehavior;
  const inv = settings.invulnBehavior;
  const presetCandidate = settings.textStylePreset ?? LEGACY_TEXT_STYLE_MAP[settings.comicBookMode];
  const validDash = dash === "ricochet" || dash === "destroy";
  const validSlow = slow === "slow" || slow === "explosion";
  const validTp = tp === "normal" || tp === "explode";
  const validInv = inv === "short" || inv === "long";
  const validPreset = TEXT_STYLE_PRESET_VALUES.has(presetCandidate);
  if (!validDash || !validSlow || !validTp || !validInv || !validPreset) return null;
  return {
    dashBehavior: dash,
    slowFieldBehavior: slow,
    teleportBehavior: tp,
    invulnBehavior: inv,
    textStylePreset: presetCandidate,
    textStyleCustom: normalizeTextStyleCustom(settings.textStyleCustom),
    simpleBackground: typeof settings.simpleBackground === "boolean"
      ? settings.simpleBackground
      : DEFAULT_SETTINGS.simpleBackground,
    simpleTextures: typeof settings.simpleTextures === "boolean"
      ? settings.simpleTextures
      : DEFAULT_SETTINGS.simpleTextures,
    simpleParticles: typeof settings.simpleParticles === "boolean"
      ? settings.simpleParticles
      : DEFAULT_SETTINGS.simpleParticles,
    reducedEffects: typeof settings.reducedEffects === "boolean"
      ? settings.reducedEffects
      : DEFAULT_SETTINGS.reducedEffects,
    extremeLowDetail: typeof settings.extremeLowDetail === "boolean"
      ? settings.extremeLowDetail
      : DEFAULT_SETTINGS.extremeLowDetail
  };
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
  const resolvedUnlockables = getResolvedUnlockables();
  const fallbackIconId = getFirstIconId(resolvedUnlockables.icons);
  return {
    username: u.username,
    bestScore: u.bestScore | 0,
    selectedTrail: u.selectedTrail || "classic",
    selectedIcon: u.selectedIcon || fallbackIconId,
    selectedPipeTexture: u.selectedPipeTexture || DEFAULT_PIPE_TEXTURE_ID,
    pipeTextureMode: normalizePipeTextureMode(u.pipeTextureMode || DEFAULT_PIPE_TEXTURE_MODE),
    ownedIcons: Array.isArray(u.ownedIcons) ? u.ownedIcons : [],
    ownedUnlockables: Array.isArray(u.ownedUnlockables) ? u.ownedUnlockables : [],
    keybinds: u.keybinds || structuredClone(DEFAULT_KEYBINDS),
    settings: u.settings || structuredClone(DEFAULT_SETTINGS),
    runs: u.runs | 0,
    totalScore: u.totalScore | 0,
    longestRun: u.longestRun | 0,
    totalTimePlayed: u.totalTimePlayed | 0,
    bustercoins: getCurrencyBalance(u.currencies, DEFAULT_CURRENCY_ID),
    currencies: normalizeCurrencyWallet(u.currencies, { [DEFAULT_CURRENCY_ID]: u.bustercoins }),
    skillTotals: normalizeSkillTotals(u.skillTotals || DEFAULT_SKILL_TOTALS),
    achievements: normalizeAchievementState(u.achievements),
    unlockedTrails: unlockedTrails(
      { achievements: u.achievements, bestScore: u.bestScore, ownedIds: u.ownedUnlockables },
      { recordHolder }
    ),
    unlockedIcons: getUnlockedIconIds(u, { resolvedUnlockables, recordHolder }),
    unlockedPipeTextures: getUnlockedIdsByType({
      unlockables: resolvedUnlockables.unlockables,
      type: UNLOCKABLE_TYPES.pipeTexture,
      context: { achievements: u.achievements, bestScore: u.bestScore, ownedIds: u.ownedUnlockables, recordHolder }
    }),
    isRecordHolder: Boolean(recordHolder)
  };
}

async function isRecordHolder(username) {
  if (!username) return false;
  const [top] = await topHighscores(1);
  return Boolean(top && top.username === username);
}

async function getUserFromReq(req, { withRecordHolder = false, res } = {}) {
  return getUserFromReqWithSession(req, { withRecordHolder, res });
}

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buf.toString("base64").replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
}

function base64UrlDecode(input) {
  const normalized = String(input).replaceAll("-", "+").replaceAll("_", "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64").toString("utf8");
}

function signSessionToken(payload, { nowMs: nowMsOverride = nowMs(), secret = SESSION_SECRET } = {}) {
  if (!payload?.sub) return null;
  const sessionConfig = getSessionConfig();
  const iat = Math.floor(nowMsOverride / 1000);
  const exp = payload.exp ?? (iat + sessionConfig.ttlSeconds);
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify({ ...payload, iat, exp }));
  const signingInput = `${header}.${body}`;
  const sig = crypto.createHmac("sha256", secret).update(signingInput).digest();
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

function verifySessionToken(token, { nowMs: nowMsOverride = nowMs(), secret = SESSION_SECRET } = {}) {
  if (!token || typeof token !== "string") return { ok: false, error: "missing" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, error: "invalid" };
  const [header, payload, signature] = parts;
  let headerJson;
  let payloadJson;
  try {
    headerJson = JSON.parse(base64UrlDecode(header));
    payloadJson = JSON.parse(base64UrlDecode(payload));
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (headerJson?.alg !== "HS256") return { ok: false, error: "invalid" };
  if (!payloadJson?.sub || typeof payloadJson.sub !== "string") return { ok: false, error: "invalid" };
  const signingInput = `${header}.${payload}`;
  const expected = crypto.createHmac("sha256", secret).update(signingInput).digest();
  const provided = Buffer.from(signature.replaceAll("-", "+").replaceAll("_", "/"), "base64");
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return { ok: false, error: "invalid" };
  }
  const nowSeconds = Math.floor(nowMsOverride / 1000);
  if (!Number.isFinite(payloadJson.exp) || payloadJson.exp <= nowSeconds) {
    return { ok: false, error: "expired" };
  }
  return {
    ok: true,
    username: payloadJson.sub,
    exp: payloadJson.exp,
    iat: payloadJson.iat || null
  };
}

function setSessionCookie(res, req, username, { maxAge } = {}) {
  if (!username) return;
  const sessionConfig = getSessionConfig();
  const resolvedMaxAge = Number.isFinite(maxAge) ? maxAge : sessionConfig.ttlSeconds;
  const secureCookie = isSecureRequest(req);
  const sameSite = secureCookie ? "None" : "Lax";
  const token = signSessionToken({ sub: username });
  if (!token) return;
  setCookie(res, SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: resolvedMaxAge,
    secure: secureCookie,
    sameSite
  });
}

function clearSessionCookie(res, req) {
  const secureCookie = isSecureRequest(req);
  const sameSite = secureCookie ? "None" : "Lax";
  setCookie(res, SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    secure: secureCookie,
    sameSite
  });
}

async function getUserFromReqWithSession(req, { withRecordHolder = false, res } = {}) {
  const cookies = parseCookies(req.headers.cookie);
  const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization.trim() : "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const sessionToken = bearerToken || cookies[SESSION_COOKIE];
  let session = verifySessionToken(sessionToken);
  if (!session.ok && bearerToken) {
    const cookieToken = cookies[SESSION_COOKIE];
    if (cookieToken) session = verifySessionToken(cookieToken);
  }
  let username = session.ok ? session.username : null;
  let upgradedLegacy = false;

  if (!username && session.error === "missing") {
    const raw = cookies[USER_COOKIE];
    if (raw) {
      const normalized = normalizeUsername(raw);
      if (normalized) {
        username = normalized;
        upgradedLegacy = true;
      }
    }
  }

  if (!username) {
    if (res && session.error && session.error !== "missing") {
      clearSessionCookie(res, req);
    }
    return null;
  }

  const key = keyForUsername(username);
  const u = await dataStore.getUserByKey(key);
  if (!u) return null;
  const recordHolder = withRecordHolder ? await isRecordHolder(u.username) : false;
  ensureUserSchema(u, { recordHolder });
  if (withRecordHolder) u.isRecordHolder = recordHolder;
  if (res) {
    const nowSeconds = Math.floor(nowMs() / 1000);
    const sessionConfig = getSessionConfig();
    const shouldRefresh =
      session.ok && Number.isFinite(session.exp) && session.exp - nowSeconds <= sessionConfig.refreshWindowSeconds;
    if (upgradedLegacy || shouldRefresh) {
      setSessionCookie(res, req, u.username);
    }
  }
  return u;
}

function buildSessionPayload(username) {
  const token = signSessionToken({ sub: username });
  return token ? { sessionToken: token } : {};
}

function buildUserDefaults(username, key) {
  const now = nowMs();
  const fallbackIconId = getFirstIconId(getIconDefinitions());
  return {
    username,
    key,
    bestScore: 0,
    selectedTrail: "classic",
    selectedIcon: fallbackIconId,
    selectedPipeTexture: DEFAULT_PIPE_TEXTURE_ID,
    pipeTextureMode: DEFAULT_PIPE_TEXTURE_MODE,
    ownedIcons: [],
    ownedUnlockables: [],
    keybinds: structuredClone(DEFAULT_KEYBINDS),
    settings: structuredClone(DEFAULT_SETTINGS),
    runs: 0,
    totalScore: 0,
    longestRun: 0,
    totalTimePlayed: 0,
    bustercoins: 0,
    currencies: { [DEFAULT_CURRENCY_ID]: 0 },
    skillTotals: structuredClone(DEFAULT_SKILL_TOTALS),
    achievements: normalizeAchievementState(),
    unlockables: { unlocked: {} },
    createdAt: now,
    updatedAt: now
  };
}

async function getOrCreateUser(username, { recordHolder = false } = {}) {
  const norm = normalizeUsername(username);
  if (!norm) return null;
  const key = keyForUsername(norm);
  const defaults = buildUserDefaults(norm, key);
  const u = await dataStore.upsertUser(norm, key, defaults);
  ensureUserSchema(u, { recordHolder });
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

async function readSupportOfferBody(req, limitBytes = 32 * 1024) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limitBytes) throw new Error("body_too_large");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

function normalizeSupportOfferPayload(payload = {}) {
  const src = payload && typeof payload === "object" ? payload : {};
  const username = normalizeUsername(
    src.username ??
      src.user ??
      src.subid ??
      src.sub_id ??
      src.userid ??
      src.uid ??
      src.player
  );
  const key = String(
    src.key ??
      src.user_key ??
      src.userKey ??
      ""
  ).trim();
  const transactionId = String(
    src.transactionId ??
      src.transaction_id ??
      src.txid ??
      src.transid ??
      src.leadid ??
      src.lead_id ??
      src.clickid ??
      src.click_id ??
      ""
  ).trim();
  const offerId = String(
    src.offerId ??
      src.offer_id ??
      src.campaign_id ??
      src.campaignid ??
      src.offer ??
      ""
  ).trim();
  const amount = Number(
    src.amount ??
      src.reward ??
      src.credits ??
      src.coins ??
      src.payout ??
      src.supportcoins ??
      0
  );
  const status =
    src.status ??
    src.approved ??
    src.completed ??
    src.complete ??
    src.success ??
    src.state ??
    src.event ??
    null;
  return { username, key, transactionId, offerId, amount, status };
}

function isSupportOfferApproved(status) {
  if (status === undefined || status === null || status === "") return true;
  if (typeof status === "boolean") return status;
  const normalized = String(status).trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === "1") return true;
  if (normalized === "true") return true;
  if (normalized === "yes") return true;
  if (["approved", "complete", "completed", "credited", "success", "ok"].includes(normalized)) return true;
  return false;
}

function readSupportOfferToken(req, payload) {
  if (!req || !req.headers) return "";
  const headerToken = String(req.headers["x-support-token"] || "").trim();
  if (headerToken) return headerToken;
  const payloadToken = String(payload?.token ?? payload?.secret ?? payload?.auth ?? "").trim();
  return payloadToken;
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

scoreService = createScoreService({
  dataStore,
  ensureUserSchema,
  publicUser,
  listHighscores: () => topHighscores(20),
  trails: () => getResolvedUnlockables().trails,
  icons: () => getResolvedUnlockables().icons,
  pipeTextures: () => getResolvedUnlockables().pipeTextures,
  unlockables: () => getResolvedUnlockables().unlockables,
  clampScore: clampScoreDefault,
  normalizeAchievements: normalizeAchievementState,
  validateRunStats,
  evaluateAchievements: (payload) => evaluateRunForAchievements({ ...payload, definitions: getAchievementDefinitions() }),
  buildAchievementsPayload: (user, unlocked) => buildAchievementsPayload(user, unlocked, getAchievementDefinitions())
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

function renderEndpointBrowserPage(groups) {
  const sections = groups
    .map((group) => {
      const cards = group.endpoints
        .map((endpoint) => {
          const methods = endpoint.methods
            .map((method) => `<span class="method method-${method.toLowerCase()}">${escapeHtml(method)}</span>`)
            .join("");
          const summary = endpoint.summary ? `<p>${escapeHtml(endpoint.summary)}</p>` : "";
          const link =
            endpoint.page && endpoint.link
              ? `<a class="endpoint-link" href="${escapeHtml(endpoint.link)}">Open ${escapeHtml(endpoint.path)}</a>`
              : "";
          return `<article class="endpoint-card" data-endpoint="${escapeHtml(endpoint.path)}">
              <div class="endpoint-heading">
                <div class="endpoint-path">${escapeHtml(endpoint.path)}</div>
                <div class="endpoint-methods">${methods}</div>
              </div>
              ${summary}
              ${link}
            </article>`;
        })
        .join("");

      return `<section class="endpoint-section" data-group="${escapeHtml(group.id)}">
          <header>
            <h2>${escapeHtml(group.title)}</h2>
            <p>${escapeHtml(group.description)}</p>
          </header>
          <div class="endpoint-grid">
            ${cards}
          </div>
        </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Endpoint Browser</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #060912;
      --bg-alt: #0e1526;
      --card: rgba(16, 24, 42, 0.9);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #7cf6ff;
      --accent-2: #b37cff;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --glow: 0 0 20px rgba(124, 246, 255, 0.25);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at top, #1a2340, var(--bg) 55%);
      color: var(--text);
    }
    header.hero {
      padding: 48px 24px 32px;
      text-align: center;
      background: linear-gradient(135deg, rgba(124, 246, 255, 0.15), rgba(179, 124, 255, 0.1));
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    header.hero h1 {
      margin: 0 0 12px;
      font-size: clamp(2rem, 4vw, 3rem);
      text-shadow: var(--glow);
    }
    header.hero p {
      margin: 0 auto;
      max-width: 720px;
      color: var(--muted);
      font-size: 1rem;
    }
    .hero-actions {
      margin-top: 24px;
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .hero-actions a {
      text-decoration: none;
      padding: 10px 16px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(8, 12, 24, 0.8);
      color: var(--text);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .hero-actions a:hover {
      transform: translateY(-1px);
      border-color: var(--accent);
    }
    main {
      padding: 32px 20px 64px;
      max-width: 1100px;
      margin: 0 auto;
    }
    .endpoint-section {
      margin-bottom: 40px;
    }
    .endpoint-section header h2 {
      margin: 0 0 8px;
      font-size: 1.6rem;
    }
    .endpoint-section header p {
      margin: 0;
      color: var(--muted);
    }
    .endpoint-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-top: 18px;
    }
    .endpoint-card {
      padding: 16px;
      border-radius: 16px;
      background: var(--card);
      border: 1px solid var(--card-border);
      box-shadow: 0 10px 30px rgba(8, 12, 24, 0.45);
    }
    .endpoint-heading {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }
    .endpoint-path {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 0.95rem;
      color: var(--accent);
    }
    .endpoint-methods {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .method {
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      border: 1px solid transparent;
    }
    .method-get { background: rgba(80, 200, 120, 0.15); color: #86efac; border-color: rgba(134, 239, 172, 0.4); }
    .method-post { background: rgba(255, 191, 71, 0.15); color: #fde68a; border-color: rgba(253, 230, 138, 0.35); }
    .method-put { background: rgba(129, 140, 248, 0.2); color: #c7d2fe; border-color: rgba(199, 210, 254, 0.3); }
    .endpoint-card p {
      margin: 0 0 14px;
      color: var(--muted);
      font-size: 0.9rem;
    }
    .endpoint-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      color: var(--text);
      padding: 8px 12px;
      border-radius: 12px;
      border: 1px solid rgba(124, 246, 255, 0.4);
      background: rgba(124, 246, 255, 0.08);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .endpoint-link:hover {
      transform: translateY(-1px);
      box-shadow: var(--glow);
    }
    footer {
      text-align: center;
      color: var(--muted);
      padding-top: 20px;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <header class="hero">
    <h1>Endpoint Browser</h1>
    <p>Every public route at your fingertips—crafted for quick discovery, testing, and sharing.</p>
    <div class="hero-actions">
      <a href="/">Back to game</a>
      <a href="/highscores">Highscores</a>
      <a href="/status">Status</a>
    </div>
  </header>
  <main>
    ${sections}
    <footer>Tip: API endpoints expect JSON and are rate limited. Page endpoints are safe to click.</footer>
  </main>
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
  try {
    await serverConfigStore?.maybeReload?.();
  } catch (err) {
    console.warn("[bingus] config reload failed:", err);
  }

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
    const u = await getUserFromReq(req, { withRecordHolder: true, res });
    if (!u) return unauthorized(res);
    const recordHolder = Boolean(u?.isRecordHolder);
    const catalog = getVisibleCatalog();
    sendJson(res, 200, {
      ok: true,
      user: publicUser(u, { recordHolder }),
      icons: catalog.icons,
      trails: catalog.trails,
      pipeTextures: catalog.pipeTextures,
      achievements: buildAchievementsPayload(u, [], getAchievementDefinitions()),
      ...buildSessionPayload(u.username)
    });
    return;
  }

  if (pathname === "/api/sync" && req.method === "GET") {
    if (rateLimit(req, res, "/api/sync")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true, res });
    const recordHolder = Boolean(u?.isRecordHolder);
    const catalog = getVisibleCatalog();
    const rawLimit = Number(url.searchParams.get("limit") || 20);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.floor(rawLimit)) : 20;
    const highscores = await topHighscores(limit);
    const totalRuns = await dataStore.totalRuns();
    sendJson(res, 200, {
      ok: true,
      user: u ? publicUser(u, { recordHolder }) : null,
      icons: catalog.icons,
      trails: catalog.trails,
      pipeTextures: catalog.pipeTextures,
      achievements: buildAchievementsPayload(u, [], getAchievementDefinitions()),
      highscores,
      stats: { totalRuns },
      ...(u ? buildSessionPayload(u.username) : {})
    });
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

    const recordHolder = await isRecordHolder(username);
    const u = await getOrCreateUser(username, { recordHolder });
    ensureUserSchema(u, { recordHolder });
    if (u) u.isRecordHolder = recordHolder;

    // Store session cookie for authenticated requests.
    setSessionCookie(res, req, u.username);

    const catalog = getVisibleCatalog();
    sendJson(res, 200, {
      ok: true,
      user: publicUser(u, { recordHolder }),
      icons: catalog.icons,
      trails: catalog.trails,
      pipeTextures: catalog.pipeTextures,
      achievements: buildAchievementsPayload(u, [], getAchievementDefinitions()),
      ...buildSessionPayload(u.username)
    });
    return;
  }

  // Support offer completion (CPAlead postback)
  if (pathname === "/api/support/offer-complete" && (req.method === "GET" || req.method === "POST")) {
    if (rateLimit(req, res, "/api/support/offer-complete")) return;
    if (!(await ensureDatabase(res))) return;

    const queryPayload = Object.fromEntries(url.searchParams.entries());
    let bodyPayload = {};
    if (req.method === "POST") {
      try {
        bodyPayload = await readSupportOfferBody(req);
      } catch (err) {
        if (err?.message === "body_too_large") {
          return sendJson(res, 413, { ok: false, error: "payload_too_large" });
        }
        return badRequest(res, "invalid_payload");
      }
    }

    const payload = { ...queryPayload, ...bodyPayload };
    const expectedToken = process.env.SUPPORT_REWARD_TOKEN;
    if (expectedToken) {
      const provided = readSupportOfferToken(req, payload);
      if (!provided || provided !== expectedToken) return unauthorized(res);
    }

    const normalized = normalizeSupportOfferPayload(payload);
    const resolvedKey = normalized.key || keyForUsername(normalized.username);
    if (!resolvedKey) return badRequest(res, "invalid_username");
    if (!normalized.transactionId) return badRequest(res, "invalid_transaction");
    const amount = Number.isFinite(normalized.amount) ? Math.max(0, Math.floor(normalized.amount)) : 0;
    if (!amount) return badRequest(res, "invalid_reward");
    if (!isSupportOfferApproved(normalized.status)) {
      return sendJson(res, 200, { ok: true, credited: false, skipped: "not_approved" });
    }

    const user = await dataStore.getUserByKey(resolvedKey);
    if (!user) return sendJson(res, 404, { ok: false, error: "unknown_user" });

    const result = await dataStore.recordSupportOffer({
      key: user.key,
      username: user.username,
      amount,
      transactionId: normalized.transactionId,
      offerId: normalized.offerId,
      provider: "cpalead",
      rawPayload: payload
    });

    if (result?.user) {
      ensureUserSchema(result.user, { recordHolder: false });
    }
    const supportcoins = result?.user
      ? getCurrencyBalance(result.user.currencies, SUPPORT_CURRENCY_ID)
      : null;

    sendJson(res, 200, {
      ok: true,
      credited: Boolean(result?.credited),
      supportcoins,
      reason: result?.reason || null
    });
    return;
  }

  // Submit score (updates best score + progression)
  if (pathname === "/api/score" && req.method === "POST") {
    if (rateLimit(req, res, "/api/score")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true, res });

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return badRequest(res, "invalid_json");
    }

    const { status, body: responseBody, error } = await scoreService.submitScore(
      u,
      body.score,
      body.bustercoinsEarned,
      body.runStats
    );
    if (status >= 200 && status < 300 && responseBody) {
      const catalog = getVisibleCatalog();
      sendJson(res, status, {
        ...responseBody,
        trails: catalog.trails,
        icons: catalog.icons,
        pipeTextures: catalog.pipeTextures
      });
    } else {
      if (status === 401) return unauthorized(res);
      if (status === 400) return badRequest(res, error || "invalid_score");
      sendJson(res, status, { ok: false, error: error || "score_persist_failed" });
    }
    return;
  }

  // Retrieve a stored best run by username
  if (pathname === "/api/run/best" && req.method === "GET") {
    if (rateLimit(req, res, "/api/run/best")) return;
    if (!(await ensureDatabase(res))) return;
    const username = normalizeUsername(url.searchParams.get("username"));
    if (!username) return badRequest(res, "invalid_username");

    const stored = await dataStore.getBestRunByUsername(username);
    const hydrated = hydrateReplayFromJson(stored);
    if (!hydrated) {
      sendJson(res, 404, { ok: false, error: "best_run_not_found" });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      run: {
        ...hydrated,
        replayJson: stored.replayJson,
        runStats: stored.runStats || null
      }
    });
    return;
  }

  // Upload best-run artifacts (replay + optional canvas capture)
  if (pathname === "/api/run/best" && req.method === "POST") {
    if (rateLimit(req, res, "/api/run/best")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true, res });
    if (!u) return unauthorized(res);

    let body;
    try {
      body = await readJsonBody(req, MAX_REPLAY_BYTES + MAX_MEDIA_BYTES + 512 * 1024);
    } catch (err) {
      if (err?.message === "body_too_large") {
        return sendJson(res, 413, { ok: false, error: "payload_too_large" });
      }
      return badRequest(res, "invalid_json");
    }

    const normalized = normalizeBestRunRequest(body, { bestScore: u.bestScore, validateRunStats });
    if (!normalized.ok) {
      if (normalized.error === "not_best") {
        return sendJson(res, 200, { ok: false, skipped: "not_best" });
      }
      return badRequest(res, normalized.error);
    }

    try {
      const saved = await dataStore.recordBestRun(u, normalized.payload);
      sendJson(res, 200, {
        ok: true,
        bestScore: saved?.bestScore ?? u.bestScore,
        replayBytes: saved?.replayBytes ?? normalized.payload.replayBytes,
        mediaBytes: saved?.media?.bytes ?? null
      });
    } catch (err) {
      console.error("[bingus] best run persist failed:", err);
      sendJson(res, 503, { ok: false, error: "best_run_persist_failed" });
    }
    return;
  }

  // List saved best-run replays
  if (pathname === "/api/replays" && req.method === "GET") {
    if (rateLimit(req, res, "/api/replays")) return;
    if (!(await ensureDatabase(res))) return;
    const limit = Number(url.searchParams.get("limit") || 200);
    const replays = await dataStore.listBestRuns(limit);
    sendJson(res, 200, {
      ok: true,
      count: replays.length,
      generatedAt: new Date().toISOString(),
      replays
    });
    return;
  }

  const replayRenderMatch = pathname.match(/^\/api\/replays\/([^/]+)\/render-mp4$/);
  if (replayRenderMatch && req.method === "POST") {
    if (rateLimit(req, res, "/api/replays/render-mp4")) return;
    if (!(await ensureDatabase(res))) return;
    const username = normalizeUsername(replayRenderMatch[1]);
    if (!username) return badRequest(res, "invalid_username");

    const u = await getUserFromReq(req, { withRecordHolder: true, res });
    if (!u) return unauthorized(res);
    if (keyForUsername(username) !== u.key) return unauthorized(res);

    let body = {};
    try {
      body = await readJsonBody(req, 64 * 1024);
    } catch {
      return badRequest(res, "invalid_json");
    }

    const stored = await dataStore.getBestRunByUsername(username);
    if (!stored?.replayJson) return sendJson(res, 404, { ok: false, error: "best_run_not_found" });

    const profileOptions = body?.profile && typeof body.profile === "object" ? body.profile : body;
    const result = replayMp4Pipeline.requestRender({
      replayId: username,
      replayJson: stored.replayJson,
      replayBytes: stored.replayBytes,
      replayHash: stored.replayHash,
      requestedBy: u.key,
      profileOptions
    });
    if (!result.ok) {
      if (result.error === "replay_too_large") {
        return sendJson(res, 413, { ok: false, error: result.error });
      }
      return badRequest(res, result.error || "invalid_request");
    }

    const entry = result.entry;
    sendJson(res, 200, {
      ok: true,
      status: entry.status,
      replayId: entry.replayId,
      profile: entry.profile,
      jobId: entry.jobId,
      mp4Bytes: entry.mp4Bytes || 0,
      error: entry.error || null
    });
    return;
  }

  const replayRenderStatusMatch = pathname.match(/^\/api\/replays\/([^/]+)\/render-mp4\/status$/);
  if (replayRenderStatusMatch && req.method === "GET") {
    if (rateLimit(req, res, "/api/replays/render-mp4")) return;
    if (!(await ensureDatabase(res))) return;
    const username = normalizeUsername(replayRenderStatusMatch[1]);
    if (!username) return badRequest(res, "invalid_username");

    const u = await getUserFromReq(req, { withRecordHolder: true, res });
    if (!u) return unauthorized(res);
    if (keyForUsername(username) !== u.key) return unauthorized(res);

    const profileOptions = {
      profileId: url.searchParams.get("profile") || ""
    };
    const result = replayMp4Pipeline.getStatus(username, profileOptions);
    if (!result.ok) {
      if (result.error === "not_found") return sendJson(res, 404, { ok: false, error: "not_found" });
      return badRequest(res, result.error || "invalid_request");
    }

    const entry = result.entry;
    sendJson(res, 200, {
      ok: true,
      status: entry.status,
      replayId: entry.replayId,
      profile: entry.profile,
      jobId: entry.jobId,
      mp4Bytes: entry.mp4Bytes || 0,
      error: entry.error || null
    });
    return;
  }

  const replayMp4Match = pathname.match(/^\/api\/replays\/([^/]+)\/mp4$/);
  if (replayMp4Match && req.method === "GET") {
    if (rateLimit(req, res, "/api/replays/mp4")) return;
    if (!(await ensureDatabase(res))) return;
    const username = normalizeUsername(replayMp4Match[1]);
    if (!username) return badRequest(res, "invalid_username");

    const profileOptions = {
      profileId: url.searchParams.get("profile") || ""
    };
    const result = replayMp4Pipeline.getMp4(username, profileOptions);
    if (!result.ok) return sendJson(res, 404, { ok: false, error: "not_found" });

    try {
      const mp4Buffer = await fs.readFile(result.entry.mp4Path);
      send(
        res,
        200,
        {
          "Content-Type": "video/mp4",
          "Cache-Control": "no-store"
        },
        mp4Buffer
      );
    } catch (err) {
      console.error("[bingus] mp4 read failed:", err);
      sendJson(res, 500, { ok: false, error: "mp4_read_failed" });
    }
    return;
  }

  // Render a player card JPEG from replay details
  if (pathname === "/playerCard" && req.method === "GET") {
    if (rateLimit(req, res, "/playerCard")) return;
    if (!(await ensureDatabase(res))) return;
    const username = normalizeUsername(url.searchParams.get("user"));
    if (!username) return badRequest(res, "invalid_username");
    const stored = await dataStore.getBestRunByUsername(username);
    if (!stored) {
      sendJson(res, 404, { ok: false, error: "best_run_not_found" });
      return;
    }
    try {
      const entry = {
        username: stored.username || username,
        bestScore: Number(stored.bestScore) || 0,
        recordedAt: Number(stored.recordedAt) || 0,
        durationMs: Number(stored.durationMs) || 0,
        ticksLength: Number(stored.ticksLength) || 0,
        replayBytes: Number(stored.replayBytes) || 0
      };
      const jpegBuffer = renderPlayerCardJpeg({ entry, run: { runStats: stored.runStats || null } });
      send(
        res,
        200,
        {
          "Content-Type": "image/jpeg",
          "Cache-Control": "no-store"
        },
        jpegBuffer
      );
    } catch (err) {
      console.error("[bingus] playerCard render failed:", err);
      sendJson(res, 500, { ok: false, error: "player_card_failed" });
    }
    return;
  }

  // Set selected trail cosmetic
  if (pathname === "/api/cosmetics/trail" && req.method === "POST") {
    if (rateLimit(req, res, "/api/cosmetics/trail")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true, res });
    if (!u) return unauthorized(res);

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return badRequest(res, "invalid_json");
    }
    const trailId = String(body.trailId || "").trim();
    const resolvedUnlockables = getResolvedUnlockables();
    const exists = resolvedUnlockables.trails.some((t) => t.id === trailId);
    if (!exists) return badRequest(res, "invalid_trail");

    const recordHolder = Boolean(u?.isRecordHolder);
    const unlocked = unlockedTrails(
      { achievements: u.achievements, bestScore: u.bestScore, ownedIds: u.ownedUnlockables },
      { recordHolder }
    );
    if (!unlocked.includes(trailId)) return badRequest(res, "trail_locked");

    const updated = await dataStore.setTrail(u.key, trailId);
    ensureUserSchema(updated, { recordHolder });
    const catalog = getVisibleCatalog();

    sendJson(res, 200, {
      ok: true,
      user: publicUser(updated, { recordHolder }),
      trails: catalog.trails,
      icons: catalog.icons,
      pipeTextures: catalog.pipeTextures
    });
    return;
  }

  // Set selected icon cosmetic
  if (pathname === "/api/cosmetics/icon" && req.method === "POST") {
    if (rateLimit(req, res, "/api/cosmetics/icon")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true, res });
    if (!u) return unauthorized(res);

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return badRequest(res, "invalid_json");
    }

    const iconId = String(body.iconId || "").trim();
    const resolvedUnlockables = getResolvedUnlockables();
    const exists = normalizePlayerIcons(resolvedUnlockables.icons).some((i) => i.id === iconId);
    if (!exists) return badRequest(res, "invalid_icon");

    const recordHolder = Boolean(u?.isRecordHolder);
    const unlocked = getUnlockedIconIds(u, { resolvedUnlockables, recordHolder });
    if (!unlocked.includes(iconId)) return badRequest(res, "icon_locked");

    const updated = await dataStore.setIcon(u.key, iconId);
    ensureUserSchema(updated, { recordHolder });
    const catalog = getVisibleCatalog();

    sendJson(res, 200, {
      ok: true,
      user: publicUser(updated, { recordHolder }),
      trails: catalog.trails,
      icons: catalog.icons,
      pipeTextures: catalog.pipeTextures
    });
    return;
  }

  // Set selected pipe texture cosmetic
  if (pathname === "/api/cosmetics/pipe_texture" && req.method === "POST") {
    if (rateLimit(req, res, "/api/cosmetics/pipe_texture")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true, res });
    if (!u) return unauthorized(res);

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return badRequest(res, "invalid_json");
    }

    const textureId = String(body.textureId || "").trim();
    const resolvedUnlockables = getResolvedUnlockables();
    const exists = resolvedUnlockables.pipeTextures.some((t) => t.id === textureId);
    if (!exists) return badRequest(res, "invalid_pipe_texture");

    const mode = normalizePipeTextureMode(body.mode || DEFAULT_PIPE_TEXTURE_MODE);

    const recordHolder = Boolean(u?.isRecordHolder);
    const unlocked = getUnlockedIdsByType({
      unlockables: resolvedUnlockables.unlockables,
      type: UNLOCKABLE_TYPES.pipeTexture,
      context: { achievements: u.achievements, bestScore: u.bestScore, ownedIds: u.ownedUnlockables, recordHolder }
    });
    if (!unlocked.includes(textureId)) return badRequest(res, "pipe_texture_locked");

    const updated = await dataStore.setPipeTexture(u.key, textureId, mode);
    ensureUserSchema(updated, { recordHolder });
    const catalog = getVisibleCatalog();

    sendJson(res, 200, {
      ok: true,
      user: publicUser(updated, { recordHolder }),
      trails: catalog.trails,
      icons: catalog.icons,
      pipeTextures: catalog.pipeTextures
    });
    return;
  }

  // Purchase unlockable cosmetic
  if (pathname === "/api/shop/purchase" && req.method === "POST") {
    if (rateLimit(req, res, "/api/shop/purchase")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true, res });
    if (!u) return unauthorized(res);

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return badRequest(res, "invalid_json");
    }

    const unlockId = String(body.id || "").trim();
    const unlockType = String(body.type || "").trim();
    if (!unlockId || !unlockType) return badRequest(res, "invalid_unlockable");

    const resolvedUnlockables = getResolvedUnlockables();
    const def = resolvedUnlockables.unlockables.find((item) => item.id === unlockId && item.type === unlockType);
    if (!def) return badRequest(res, "invalid_unlockable");
    if (def.unlock?.type !== "purchase") return badRequest(res, "unlock_not_purchasable");

    const recordHolder = Boolean(u?.isRecordHolder);
    const ownedIds = Array.isArray(u.ownedUnlockables) ? u.ownedUnlockables : [];
    const context = { achievements: u.achievements, bestScore: u.bestScore, ownedIds, recordHolder };
    if (isUnlockSatisfied(def, context)) return badRequest(res, "already_owned");

    const currencyId = def.unlock.currencyId || DEFAULT_CURRENCY_ID;
    const cost = Number.isFinite(def.unlock.cost) ? Math.max(0, Math.floor(def.unlock.cost)) : 0;
    const debit = debitCurrency(u.currencies, { currencyId, cost });
    if (!debit.ok) return badRequest(res, "insufficient_funds");

    const ownedNext = Array.from(new Set([...ownedIds, def.unlock.id || def.id]));
    const updated = await dataStore.purchaseUnlockable(u.key, {
      ownedUnlockables: ownedNext,
      ownedIcons: ownedNext,
      currencies: debit.wallet,
      bustercoins: getCurrencyBalance(debit.wallet, DEFAULT_CURRENCY_ID)
    });
    ensureUserSchema(updated, { recordHolder });
    const catalog = getVisibleCatalog();

    sendJson(res, 200, {
      ok: true,
      user: publicUser(updated, { recordHolder }),
      trails: catalog.trails,
      icons: catalog.icons,
      pipeTextures: catalog.pipeTextures
    });
    return;
  }

  // Set keybinds
  if (pathname === "/api/binds" && req.method === "POST") {
    if (rateLimit(req, res, "/api/binds")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true, res });
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
    const catalog = getVisibleCatalog();

    sendJson(res, 200, {
      ok: true,
      user: publicUser(updated, { recordHolder }),
      trails: catalog.trails,
      icons: catalog.icons,
      pipeTextures: catalog.pipeTextures
    });
    return;
  }

  if (pathname === "/api/settings" && req.method === "POST") {
    if (rateLimit(req, res, "/api/settings")) return;
    if (!(await ensureDatabase(res))) return;
    const u = await getUserFromReq(req, { withRecordHolder: true, res });
    if (!u) return unauthorized(res);

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return badRequest(res, "invalid_json");
    }
    const settings = validateSettingsPayload(body.settings);
    if (!settings) return badRequest(res, "invalid_settings");

    const updated = await dataStore.setSettings(u.key, settings);
    const recordHolder = Boolean(u?.isRecordHolder);
    ensureUserSchema(updated, { recordHolder });
    const catalog = getVisibleCatalog();

    sendJson(res, 200, {
      ok: true,
      user: publicUser(updated, { recordHolder }),
      trails: catalog.trails,
      icons: catalog.icons,
      pipeTextures: catalog.pipeTextures
    });
    return;
  }

  if (pathname === "/api/icon-registry" && req.method === "GET") {
    if (rateLimit(req, res, "/api/icon-registry")) return;
    const catalog = getVisibleCatalog();
    sendJson(res, 200, {
      ok: true,
      icons: catalog.icons,
      meta: { generatedAt: new Date().toISOString() }
    });
    return;
  }

  if (pathname === "/api/trail-styles" && req.method === "GET") {
    sendJson(res, 200, { ok: true, overrides: getTrailStyleOverrides() });
    return;
  }

  if (pathname === "/api/admin/config") {
    if (req.method === "GET") {
      const config = getServerConfig();
      sendJson(res, 200, { ok: true, config, meta: serverConfigStore.getMeta() });
      return;
    }
    if (req.method === "PUT") {
      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        return badRequest(res, "invalid_json");
      }
      const nextConfig = body?.config ?? body;
      const saved = await serverConfigStore.save(nextConfig);
      sendJson(res, 200, { ok: true, config: saved, meta: serverConfigStore.getMeta() });
      return;
    }
  }

  if (pathname === "/api/admin/game-config") {
    if (req.method === "GET") {
      const config = gameConfigStore.getConfig();
      sendJson(res, 200, { ok: true, config, path: GAME_CONFIG_PATH, meta: gameConfigStore.getMeta() });
      return;
    }
    if (req.method === "PUT") {
      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        return badRequest(res, "invalid_json");
      }
      try {
        const payload = body?.config ?? body;
        const saved = await gameConfigStore.save(payload);
        sendJson(res, 200, { ok: true, config: saved, path: GAME_CONFIG_PATH, meta: gameConfigStore.getMeta() });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: "game_config_write_failed", detail: err?.message || String(err) });
      }
      return;
    }
  }

  if (pathname === "/api/admin/trail-styles") {
    if (req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        overrides: getTrailStyleOverrides(),
        trails: getTrailDefinitions(),
        meta: gameConfigStore.getMeta()
      });
      return;
    }
    if (req.method === "PUT") {
      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        return badRequest(res, "invalid_json");
      }
      const overridesPayload = body?.overrides ?? body?.trailStyles?.overrides ?? body;
      const result = normalizeTrailStyleOverrides({ overrides: overridesPayload });
      if (!result.ok) {
        return sendJson(res, 400, { ok: false, error: "invalid_trail_style_overrides", details: result.errors });
      }
      const current = gameConfigStore.getConfig();
      const nextConfig = {
        ...(current || {}),
        trailStyles: {
          ...(current?.trailStyles || {}),
          overrides: result.overrides
        }
      };
      try {
        const saved = await gameConfigStore.save(nextConfig);
        const savedOverrides = saved?.trailStyles?.overrides || {};
        sendJson(res, 200, {
          ok: true,
          overrides: savedOverrides,
          trails: getTrailDefinitions(savedOverrides),
          meta: gameConfigStore.getMeta()
        });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: "trail_style_write_failed", detail: err?.message || String(err) });
      }
      return;
    }
  }

  if (pathname === "/api/admin/icon-registry") {
    if (req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        icons: getIconDefinitions(),
        meta: iconRegistryStore.getMeta()
      });
      return;
    }
    if (req.method === "PUT") {
      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        return badRequest(res, "invalid_json");
      }
      const iconsPayload = Array.isArray(body) ? body : body?.icons ?? body?.iconStyles?.icons;
      if (iconsPayload === undefined) {
        return sendJson(res, 400, { ok: false, error: "invalid_icon_catalog", details: [{ path: "icons", message: "icons_missing" }] });
      }
      const result = normalizeIconCatalog({ icons: iconsPayload });
      if (!result.ok) {
        return sendJson(res, 400, { ok: false, error: "invalid_icon_catalog", details: result.errors });
      }
      try {
        await iconRegistryStore.save(result.icons);
        sendJson(res, 200, {
          ok: true,
          icons: getIconDefinitions(),
          meta: iconRegistryStore.getMeta()
        });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: "icon_catalog_write_failed", detail: err?.message || String(err) });
      }
      return;
    }
  }

  if (pathname === "/api/admin/unlockables" && req.method === "GET") {
    const resolvedUnlockables = getResolvedUnlockables();
    sendJson(res, 200, {
      ok: true,
      unlockables: resolvedUnlockables.unlockables,
      trails: resolvedUnlockables.trails,
      icons: resolvedUnlockables.icons,
      pipeTextures: resolvedUnlockables.pipeTextures
    });
    return;
  }

  if (pathname === "/api/admin/achievements") {
    if (req.method === "GET") {
      const definitions = getAchievementDefinitions();
      sendJson(res, 200, {
        ok: true,
        achievements: {
          definitions,
          schema: ACHIEVEMENT_SCHEMA
        },
        meta: serverConfigStore.getMeta()
      });
      return;
    }
    if (req.method === "PUT") {
      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        return badRequest(res, "invalid_json");
      }
      const definitionsPayload = body?.definitions ?? body?.achievements?.definitions ?? null;

      const definitionResult = normalizeAchievementDefinitions(definitionsPayload, { fallback: null });
      if (!definitionResult.ok) {
        return sendJson(res, 400, { ok: false, error: "invalid_achievement_definitions", details: definitionResult.errors });
      }

      const current = getServerConfig();
      const nextConfig = {
        ...current,
        achievements: { definitions: definitionResult.definitions }
      };
      const saved = await serverConfigStore.save(nextConfig);
      sendJson(res, 200, {
        ok: true,
        achievements: { definitions: resolveAchievementDefinitions(saved.achievements?.definitions, ACHIEVEMENTS) },
        meta: serverConfigStore.getMeta()
      });
      return;
    }
  }

  if (pathname === "/api/admin/collections" && req.method === "GET") {
    if (!(await ensureDatabase(res))) return;
    const collections = await dataStore.listCollections();
    sendJson(res, 200, { ok: true, collections });
    return;
  }

  if (pathname.startsWith("/api/admin/collections/")) {
    const parts = pathname.replace("/api/admin/collections/", "").split("/").filter(Boolean);
    const [collectionName, docId] = parts;
    if (!isValidCollectionName(collectionName)) return badRequest(res, "invalid_collection");
    if (!(await ensureDatabase(res))) return;

    if (!docId && req.method === "GET") {
      const limit = Number(url.searchParams.get("limit") || 25);
      const docs = await dataStore.listDocuments(collectionName, limit);
      sendJson(res, 200, { ok: true, documents: docs.map(serializeAdminDoc) });
      return;
    }

    if (!docId && req.method === "POST") {
      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        return badRequest(res, "invalid_json");
      }
      const payload = body?.document ?? body;
      const created = await dataStore.insertDocument(collectionName, payload);
      sendJson(res, 201, { ok: true, document: serializeAdminDoc(created) });
      return;
    }

    if (docId && req.method === "GET") {
      const doc = await dataStore.getDocumentById(collectionName, docId);
      if (!doc) return sendJson(res, 404, { ok: false, error: "document_not_found" });
      sendJson(res, 200, { ok: true, document: serializeAdminDoc(doc) });
      return;
    }

    if (docId && req.method === "PUT") {
      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        return badRequest(res, "invalid_json");
      }
      const payload = body?.document ?? body;
      const updated = await dataStore.replaceDocument(collectionName, docId, payload);
      if (!updated) return sendJson(res, 404, { ok: false, error: "document_not_found" });
      sendJson(res, 200, { ok: true, document: serializeAdminDoc(updated) });
      return;
    }
  }

  if (pathname === "/bigflappin" && req.method === "GET") {
    try {
      const html = await fs.readFile(path.join(PUBLIC_DIR, "bigflappin", "index.html"), "utf8");
      sendHtml(res, 200, html);
    } catch (err) {
      sendJson(res, 404, { ok: false, error: "admin_not_found", detail: err?.message || String(err) });
    }
    return;
  }

  if (pathname === "/achievementeditor" && req.method === "GET") {
    try {
      const html = await fs.readFile(path.join(PUBLIC_DIR, "achievementeditor", "index.html"), "utf8");
      sendHtml(res, 200, html);
    } catch (err) {
      sendJson(res, 404, { ok: false, error: "achievement_editor_not_found", detail: err?.message || String(err) });
    }
    return;
  }

  if (pathname === "/traileditor" && req.method === "GET") {
    try {
      const html = await fs.readFile(path.join(PUBLIC_DIR, "traileditor", "index.html"), "utf8");
      sendHtml(res, 200, html);
    } catch (err) {
      sendJson(res, 404, { ok: false, error: "trail_editor_not_found", detail: err?.message || String(err) });
    }
    return;
  }

  if (pathname === "/replayBrowser" && req.method === "GET") {
    try {
      const html = await fs.readFile(path.join(PUBLIC_DIR, "replayBrowser.html"), "utf8");
      sendHtml(res, 200, html);
    } catch (err) {
      sendJson(res, 404, { ok: false, error: "replay_browser_not_found", detail: err?.message || String(err) });
    }
    return;
  }

  if (pathname === "/endpointBrowser" && req.method === "GET") {
    sendHtml(res, 200, renderEndpointBrowserPage(ENDPOINT_GROUPS));
    return;
  }

  // Highscores JSON
  if (pathname === "/api/stats" && req.method === "GET") {
    if (rateLimit(req, res, "/api/stats")) return;
    if (!(await ensureDatabase(res))) return;
    const totalRuns = await dataStore.totalRuns();
    sendJson(res, 200, { ok: true, totalRuns });
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
    const catalog = buildTrailPreviewCatalog(getResolvedUnlockables().trails);
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

  if (pathname === "/unlockables" && req.method === "GET") {
    const catalog = getVisibleCatalog();
    const payload = {
      ok: true,
      count: catalog.unlockables.length,
      generatedAt: new Date().toISOString(),
      unlockables: catalog.unlockables,
      icons: catalog.icons,
      pipeTextures: catalog.pipeTextures
    };
    const wantsHtml = wantsUnlockablesHtml({
      formatParam: url.searchParams.get("format"),
      acceptHeader: req.headers.accept
    });
    if (wantsHtml) {
      sendHtml(res, 200, renderUnlockablesPage(payload));
    } else {
      sendJson(res, 200, payload);
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

  if ((pathname === "/icon" || pathname === "/icon/") && req.method === "GET") {
    return serveStatic("/icon/index.html", res);
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
    serverConfigStore.setPersistence(createServerConfigPersistence(dataStore));
    gameConfigStore.setPersistence(createGameConfigPersistence(dataStore));
    iconRegistryStore.setPersistence(createIconRegistryPersistence(dataStore));
  } catch (err) {
    console.error("[bingus] database connection failed at startup:", err);
  }
  try {
    await serverConfigStore.load();
  } catch (err) {
    console.error("[bingus] server config load failed:", err);
  }
  try {
    await gameConfigStore.load();
  } catch (err) {
    console.error("[bingus] game config load failed:", err);
  }
  try {
    await iconRegistryStore.load();
  } catch (err) {
    console.error("[bingus] icon registry load failed:", err);
  }

  try {
    const legacyIcons = gameConfigStore.getConfig()?.iconStyles?.icons;
    if (!iconRegistryStore.getIcons().length && Array.isArray(legacyIcons) && legacyIcons.length) {
      await iconRegistryStore.save(legacyIcons);
      console.log("[bingus] migrated legacy icon registry into MongoDB");
    }
  } catch (err) {
    console.warn("[bingus] icon registry migration skipped:", err?.message || err);
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
  ICONS: getBaseIconCatalog(),
  unlockedTrails,
  unlockedIcons,
  ensureUserSchema,
  publicUser,
  isRecordHolder,
  normalizeUsername,
  keyForUsername,
  getOrCreateUser,
  _setDataStoreForTests,
  _setReplayMp4PipelineForTests,
  _setConfigStoreForTests,
  _setGameConfigStoreForTests,
  _setIconRegistryStoreForTests,
  route,
  startServer,
  __testables: {
    signSessionToken,
    verifySessionToken,
    base64UrlEncode,
    base64UrlDecode,
    buildSessionPayload,
    normalizeSupportOfferPayload,
    isSupportOfferApproved,
    readSupportOfferToken,
    _setSessionSecretForTests(secret) {
      SESSION_SECRET = secret;
    }
  }
};
