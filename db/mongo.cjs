"use strict";

const { MongoClient } = require("mongodb");
const { DEFAULT_SKILL_TOTALS, SKILL_IDS, normalizeSkillTotals } = require("../services/skillConsts.cjs");

const MAX_SCORE = 1_000_000_000;
const DEFAULT_TRAIL = "classic";
const DEFAULT_ICON = "hi_vis_orange";
const { DEFAULT_PIPE_TEXTURE_ID, DEFAULT_PIPE_TEXTURE_MODE } = require("../services/pipeTextures.cjs");
const { DEFAULT_CURRENCY_ID } = require("../services/currency.cjs");
const DEFAULT_ACHIEVEMENTS_STATE = Object.freeze({
  unlocked: Object.freeze({}),
  progress: Object.freeze({
    bestScore: 0,
    maxScoreNoOrbs: 0,
    maxScoreNoAbilities: 0,
    maxPerfectsInRun: 0,
    totalPerfects: 0,
    maxOrbsInRun: 0,
    totalOrbsCollected: 0,
    totalScore: 0,
    skillTotals: DEFAULT_SKILL_TOTALS
  })
});

function maskConnectionString(uri) {
  if (!uri) return "";
  try {
    const isSrv = uri.startsWith("mongodb+srv://");
    const normalized = uri.replace(/^mongodb(\+srv)?:\/\//, "http://");
    const parsed = new URL(normalized);
    const username = parsed.username ? decodeURIComponent(parsed.username) : "";
    const host = parsed.host;
    const pathname = parsed.pathname;
    const search = parsed.search;
    const protocol = isSrv ? "mongodb+srv://" : "mongodb://";
    if (username) {
      return `${protocol}${encodeURIComponent(username)}:***@${host}${pathname}${search}`;
    }
    return `${protocol}${host}${pathname}${search}`;
  } catch {
    return uri.replace(/:\/\/[^:@/]+:[^@/]+@/, "://***:***@");
  }
}

function resolveMongoConfig() {
  const dbName = process.env.MONGODB_DB || "flappybingus";
  const password = process.env.MONGODB_PASSWORD;
  let uri = process.env.MONGODB_URI || `mongodb://localhost:27017/${dbName}`;

  if (password) {
    const safePassword = encodeURIComponent(password);
    uri = uri.replace(/\{PASSWORD\}/g, safePassword).replace(/<PASSWORD>/g, safePassword);
  }

  if (!/mongodb(\+srv)?:\/\/.+\/[^/?]+/i.test(uri)) {
    const suffix = uri.endsWith("/") ? "" : "/";
    uri = `${uri}${suffix}${dbName}`;
  }

  return {
    uri,
    dbName,
    maskedUri: maskConnectionString(uri),
    serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS || 5000)
  };
}

function clampScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(MAX_SCORE, Math.floor(n)));
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

async function safeClose(client) {
  if (!client) return;
  try {
    await client.close();
  } catch {
    // ignore
  }
}

class MongoDataStore {
  constructor(options) {
    this.uri = options.uri;
    this.dbName = options.dbName;
    this.maskedUri = options.maskedUri || maskConnectionString(this.uri);
    this.serverSelectionTimeoutMS = options.serverSelectionTimeoutMS || 5000;
    this.client = null;
    this.db = null;
    this.status = {
      connected: false,
      lastError: null,
      lastErrorAt: null,
      lastAttemptAt: null,
      lastPingMs: null,
      uri: this.maskedUri,
      dbName: this.dbName
    };
  }

  async connect() {
    if (this.client && this.db) return this.db;
    this.status.lastAttemptAt = Date.now();
    const client = new MongoClient(this.uri, {
      serverSelectionTimeoutMS: this.serverSelectionTimeoutMS
    });
    try {
      const start = Date.now();
      await client.connect();
      const db = client.db(this.dbName);
      await db.command({ ping: 1 });
      await db.collection("users").createIndex({ key: 1 }, { unique: true });
      await db.collection("users").createIndex({ updatedAt: -1 });
      await db.collection("best_runs").createIndex({ username: 1 });
      await db.collection("best_runs").createIndex({ key: 1 }, { unique: true });
      await db.collection("best_runs").createIndex({ bestScore: -1, updatedAt: -1 });
      this.client = client;
      this.db = db;
      this.status.connected = true;
      this.status.lastError = null;
      this.status.lastErrorAt = null;
      this.status.lastPingMs = Date.now() - start;
      return db;
    } catch (err) {
      await safeClose(client);
      this.client = null;
      this.db = null;
      this.status.connected = false;
      this.status.lastError = err?.message || String(err);
      this.status.lastErrorAt = Date.now();
      throw err;
    }
  }

  async ensureConnected() {
    try {
      return await this.connect();
    } catch (err) {
      this.status.connected = false;
      this.status.lastError = err?.message || String(err);
      this.status.lastErrorAt = Date.now();
      this.client = null;
      this.db = null;
      throw err;
    }
  }

  usersCollection() {
    if (!this.db) throw new Error("db_not_connected");
    return this.db.collection("users");
  }

  bestRunsCollection() {
    if (!this.db) throw new Error("db_not_connected");
    return this.db.collection("best_runs");
  }

  async getUserByKey(key) {
    await this.ensureConnected();
    return this.usersCollection().findOne({ key });
  }

  async upsertUser(username, key, defaults) {
    await this.ensureConnected();
    const now = Date.now();
    const { username: _ignored, updatedAt: _ignoredUpdated, ...rest } = defaults || {};
    const collection = this.usersCollection();

    // Try to fetch existing user first to avoid update operator conflicts.
    const existing = await collection.findOne({ key });
    if (existing) {
      if (existing.username !== username) {
        await collection.updateOne({ key }, { $set: { username, updatedAt: now } });
        return await collection.findOne({ key });
      }
      return existing;
    }

    const insertDoc = {
      ...rest,
      key,
      username,
      createdAt: rest.createdAt ?? now,
      updatedAt: now
    };

    // Insert new user, handling concurrent creation races gracefully.
    try {
      const insertRes = await collection.insertOne(insertDoc);
      return await collection.findOne({ _id: insertRes.insertedId });
    } catch (err) {
      if (err?.code === 11000) {
        return await collection.findOne({ key });
      }
      throw err;
    }
  }

  async recordScore(user, score, { bustercoinsEarned = 0, achievements, unlockables, skillUsage } = {}) {
    await this.ensureConnected();
    if (!user || !user.key) throw new Error("user_key_required");

    const now = Date.now();
    const safeScore = clampScore(score);
    const earnedCoins = Math.max(0, normalizeCount(bustercoinsEarned));
    const nextAchievements =
      achievements && typeof achievements === "object" ? achievements : null;
    const nextUnlockables =
      unlockables && typeof unlockables === "object" ? unlockables : null;
    const baseSkillTotals = normalizeSkillTotals(user.skillTotals || DEFAULT_SKILL_TOTALS);
    const runSkillTotals = normalizeSkillTotals(skillUsage);

    // Seed values from payload (only used if the doc is missing those fields)
    const safeRuns = normalizeCount(user.runs);
    const safeTotalScore = normalizeTotal(user.totalScore);
    const safeBestScore = clampScore(user.bestScore);
    const safeCoins = normalizeCount(user.bustercoins);
    const safeCurrencies =
      user.currencies && typeof user.currencies === "object"
        ? user.currencies
        : { [DEFAULT_CURRENCY_ID]: safeCoins };

    const collection = this.usersCollection();
    const currencyKey = DEFAULT_CURRENCY_ID;

    const res = await collection.findOneAndUpdate(
      { key: user.key },
      [
        {
          $set: {
            key: { $ifNull: ["$key", user.key] },
            username: { $ifNull: ["$username", user.username || user.key] },
            selectedTrail: { $ifNull: ["$selectedTrail", user.selectedTrail || DEFAULT_TRAIL] },
            selectedIcon: { $ifNull: ["$selectedIcon", user.selectedIcon || DEFAULT_ICON] },
            selectedPipeTexture: { $ifNull: ["$selectedPipeTexture", user.selectedPipeTexture || DEFAULT_PIPE_TEXTURE_ID] },
            pipeTextureMode: { $ifNull: ["$pipeTextureMode", user.pipeTextureMode || DEFAULT_PIPE_TEXTURE_MODE] },
            ownedIcons: { $ifNull: ["$ownedIcons", user.ownedIcons || []] },
            ownedUnlockables: { $ifNull: ["$ownedUnlockables", user.ownedUnlockables || user.ownedIcons || []] },
            keybinds: { $ifNull: ["$keybinds", user.keybinds || null] },
            createdAt: { $ifNull: ["$createdAt", user.createdAt || now] },

            runs: { $add: [{ $ifNull: ["$runs", safeRuns] }, 1] },
            totalScore: { $add: [{ $ifNull: ["$totalScore", safeTotalScore] }, safeScore] },
            bestScore: { $max: [{ $ifNull: ["$bestScore", safeBestScore] }, safeScore] },
            bustercoins: { $add: [{ $ifNull: ["$bustercoins", safeCoins] }, earnedCoins] },
            currencies: {
              $let: {
                vars: {
                  current: { $ifNull: ["$currencies", safeCurrencies] }
                },
                in: {
                  $mergeObjects: [
                    "$$current",
                    {
                      [currencyKey]: {
                        $add: [
                          { $ifNull: [`$$current.${currencyKey}`, safeCoins] },
                          earnedCoins
                        ]
                      }
                    }
                  ]
                }
              }
            },
            achievements: nextAchievements ?? { $ifNull: ["$achievements", user.achievements || DEFAULT_ACHIEVEMENTS_STATE] },
            unlockables: nextUnlockables ?? { $ifNull: ["$unlockables", user.unlockables || { unlocked: {} }] },
            skillTotals: {
              $let: {
                vars: {
                  current: { $ifNull: ["$skillTotals", baseSkillTotals] }
                },
                in: SKILL_IDS.reduce((acc, id) => {
                  acc[id] = {
                    $add: [
                      { $ifNull: [`$$current.${id}`, baseSkillTotals[id]] },
                      runSkillTotals[id] || 0
                    ]
                  };
                  return acc;
                }, {})
              }
            },

            updatedAt: now
          }
        }
      ],
      { returnDocument: "after", upsert: true }
    );

    if (!res.value) throw new Error("record_score_failed");
    return res.value;
  }

  async recordBestRun(user, bestRun = {}) {
    await this.ensureConnected();
    if (!user || !user.key) throw new Error("user_key_required");

    const now = Date.now();
    const safeScore = clampScore(bestRun.score);
    if (!Number.isFinite(safeScore) || safeScore <= 0) throw new Error("invalid_best_score");
    const safeTicks = normalizeCount(bestRun.ticksLength);
    const safeTape = normalizeCount(bestRun.rngTapeLength);
    const safeDuration = normalizeTotal(bestRun.durationMs);
    const safeReplayBytes = normalizeCount(bestRun.replayBytes);

    const collection = this.bestRunsCollection();
    const existing = await collection.findOne({ key: user.key });
    const currentBest = clampScore(existing?.bestScore);

    if (currentBest > safeScore) {
      return existing;
    }

    const doc = {
      key: user.key,
      username: user.username || user.key,
      bestScore: Math.max(currentBest, safeScore),
      seed: typeof bestRun.seed === "string" ? bestRun.seed : "",
      recordedAt: Number(bestRun.recordedAt || now),
      ticksLength: safeTicks,
      rngTapeLength: safeTape,
      durationMs: safeDuration,
      replayBytes: safeReplayBytes,
      replayHash: typeof bestRun.replayHash === "string" ? bestRun.replayHash : null,
      replayJson: typeof bestRun.replayJson === "string" ? bestRun.replayJson : null,
      runStats: bestRun.runStats || null,
      media: bestRun.media || null,
      updatedAt: now
    };

    await collection.updateOne({ key: user.key }, { $set: doc }, { upsert: true });
    return doc;
  }

  async getBestRunByUsername(username) {
    await this.ensureConnected();
    const doc = await this.bestRunsCollection().findOne({ username });
    return doc || null;
  }

  async setTrail(key, trailId) {
    await this.ensureConnected();
    const now = Date.now();
    const res = await this.usersCollection().findOneAndUpdate(
      { key },
      { $set: { selectedTrail: trailId, updatedAt: now } },
      { returnDocument: "after" }
    );
    return res.value;
  }

  async setIcon(key, iconId) {
    await this.ensureConnected();
    const now = Date.now();
    const res = await this.usersCollection().findOneAndUpdate(
      { key },
      { $set: { selectedIcon: iconId, updatedAt: now } },
      { returnDocument: "after" }
    );
    return res.value;
  }

  async setPipeTexture(key, textureId, mode) {
    await this.ensureConnected();
    const now = Date.now();
    const res = await this.usersCollection().findOneAndUpdate(
      { key },
      { $set: { selectedPipeTexture: textureId, pipeTextureMode: mode, updatedAt: now } },
      { returnDocument: "after" }
    );
    return res.value;
  }

  async purchaseUnlockable(key, { ownedUnlockables, ownedIcons, currencies, bustercoins, unlockables } = {}) {
    await this.ensureConnected();
    const now = Date.now();
    const payload = {
      ownedUnlockables: Array.isArray(ownedUnlockables) ? ownedUnlockables : [],
      ownedIcons: Array.isArray(ownedIcons) ? ownedIcons : [],
      currencies: currencies && typeof currencies === "object" ? currencies : { [DEFAULT_CURRENCY_ID]: 0 },
      bustercoins: normalizeCount(bustercoins),
      unlockables: unlockables && typeof unlockables === "object" ? unlockables : { unlocked: {} },
      updatedAt: now
    };
    const res = await this.usersCollection().findOneAndUpdate(
      { key },
      { $set: payload },
      { returnDocument: "after" }
    );
    return res.value;
  }

  async setKeybinds(key, binds) {
    await this.ensureConnected();
    const now = Date.now();
    const res = await this.usersCollection().findOneAndUpdate(
      { key },
      { $set: { keybinds: binds, updatedAt: now } },
      { returnDocument: "after" }
    );
    return res.value;
  }

  async setSettings(key, settings) {
    await this.ensureConnected();
    const now = Date.now();
    const res = await this.usersCollection().findOneAndUpdate(
      { key },
      { $set: { settings, updatedAt: now } },
      { returnDocument: "after" }
    );
    return res.value;
  }

  async topHighscores(limit) {
    await this.ensureConnected();
    const lim = Math.max(1, Math.min(200, limit | 0 || 20));
    const docs = await this.usersCollection()
      .find({}, { projection: { username: 1, bestScore: 1, updatedAt: 1 } })
      .sort({ bestScore: -1, updatedAt: -1, username: 1 })
      .limit(lim)
      .toArray();
    return docs.map((d) => ({
      username: d.username,
      bestScore: Number(d.bestScore) || 0,
      updatedAt: Number(d.updatedAt) || 0
    }));
  }

  async userCount() {
    await this.ensureConnected();
    return this.usersCollection().countDocuments();
  }

  async recentUsers(limit = 5) {
    await this.ensureConnected();
    const lim = Math.max(1, Math.min(50, limit | 0 || 5));
    const docs = await this.usersCollection()
      .find({}, { projection: { username: 1, bestScore: 1, updatedAt: 1, createdAt: 1 } })
      .sort({ updatedAt: -1 })
      .limit(lim)
      .toArray();
    return docs;
  }

  async close() {
    await safeClose(this.client);
    this.client = null;
    this.db = null;
    this.status.connected = false;
  }

  getStatus() {
    return {
      connected: this.status.connected,
      lastError: this.status.lastError,
      lastErrorAt: this.status.lastErrorAt,
      lastAttemptAt: this.status.lastAttemptAt,
      lastPingMs: this.status.lastPingMs,
      uri: this.maskedUri,
      dbName: this.dbName
    };
  }
}

module.exports = { MongoDataStore, resolveMongoConfig, maskConnectionString };
