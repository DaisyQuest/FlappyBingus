import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "module";

let connectBehavior;

const applyMongoMock = () => {
  const req = createRequire(import.meta.url);
  const id = req.resolve("mongodb");
  req.cache[id] = {
    exports: {
      ObjectId: class FakeObjectId {
        constructor(id) {
          this.id = id || "generated-object-id";
        }
        toHexString() {
          return this.id;
        }
        static isValid(value) {
          return typeof value === "string" && value.length === 24;
        }
      },
      MongoClient: class FakeMongoClient {
        constructor(uri, opts) {
          this.uri = uri;
          this.opts = opts;
          this.closed = false;
        }
        async connect() {
          if (connectBehavior.error) throw connectBehavior.error;
          this.connected = true;
          return this;
        }
        db() { return connectBehavior.db; }
        async close() { this.closed = true; }
      }
    }
  };
};

const makeCollection = (overrides = {}) => ({
  createIndex: vi.fn(async () => ({})),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  countDocuments: vi.fn(),
  deleteOne: vi.fn(async () => ({})),
  deleteMany: vi.fn(async () => ({})),
  aggregate: vi.fn(() => ({ toArray: vi.fn(async () => []) })),
  find: vi.fn(() => ({
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn(async () => [])
  })),
  replaceOne: vi.fn(async () => ({})),
  insertOne: vi.fn(async () => ({ insertedId: "inserted" })),
  bulkWrite: vi.fn(async () => ({})),
  ...overrides
});

const loadModule = async () => {
  vi.resetModules();
  applyMongoMock();
  return import("../mongo.cjs");
};

beforeEach(() => {
  connectBehavior = {
    error: null,
    db: {
      command: vi.fn(async () => ({})),
      collection: vi.fn(() => makeCollection()),
      listCollections: vi.fn(() => ({ toArray: vi.fn(async () => []) }))
    }
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("config helpers", () => {
  it("masks connection strings safely", async () => {
    const { maskConnectionString } = await loadModule();
    expect(maskConnectionString("mongodb://user:pass@localhost/db")).toContain("user:***@");
    expect(maskConnectionString("mongodb+srv://u:p@test.mongodb.net/db?retryWrites=true")).toContain("mongodb+srv://u:***@");
    expect(maskConnectionString("mongodb://localhost/db")).toBe("mongodb://localhost/db");
  });

  it("falls back to regex masking when URL parsing fails", async () => {
    const { maskConnectionString } = await loadModule();
    const originalUrl = global.URL;
    global.URL = vi.fn(() => { throw new Error("boom"); });

    try {
      const masked = maskConnectionString("mongodb://user:pass@localhost/db");
      expect(masked).toBe("mongodb://***:***@localhost/db");
    } finally {
      global.URL = originalUrl;
    }
  });

  it("fills defaults and substitutes passwords when resolving config", async () => {
    const { resolveMongoConfig } = await loadModule();
    const prevDb = process.env.MONGODB_DB;
    const prevPw = process.env.MONGODB_PASSWORD;
    const prevUri = process.env.MONGODB_URI;
    process.env.MONGODB_DB = "bingus";
    process.env.MONGODB_PASSWORD = "s3cr3t!";
    process.env.MONGODB_URI = "mongodb://localhost:27017/<PASSWORD>";
    const cfg = resolveMongoConfig();
    expect(cfg.uri).toContain("mongodb://localhost:27017/s3cr3t!");
    expect(cfg.dbName).toBe("bingus");
    process.env.MONGODB_DB = prevDb;
    process.env.MONGODB_PASSWORD = prevPw;
    process.env.MONGODB_URI = prevUri;
  });

  it("appends the database name when missing from the URI", async () => {
    const { resolveMongoConfig } = await loadModule();
    const prevUri = process.env.MONGODB_URI;
    const prevDb = process.env.MONGODB_DB;
    const prevPw = process.env.MONGODB_PASSWORD;

    process.env.MONGODB_URI = "mongodb://localhost:27017";
    delete process.env.MONGODB_DB;
    delete process.env.MONGODB_PASSWORD;

    const cfg = resolveMongoConfig();

    expect(cfg.uri).toBe("mongodb://localhost:27017/flappybingus");

    process.env.MONGODB_URI = prevUri;
    process.env.MONGODB_DB = prevDb;
    process.env.MONGODB_PASSWORD = prevPw;
  });

  it("preserves trailing slashes when appending the database name", async () => {
    const { resolveMongoConfig } = await loadModule();
    const prevUri = process.env.MONGODB_URI;
    const prevDb = process.env.MONGODB_DB;
    const prevPw = process.env.MONGODB_PASSWORD;
    process.env.MONGODB_URI = "mongodb://localhost:27017/";
    process.env.MONGODB_DB = "flappybingus";
    delete process.env.MONGODB_PASSWORD;

    const cfg = resolveMongoConfig();

    expect(cfg.uri).toContain("/flappybingus");

    process.env.MONGODB_URI = prevUri;
    process.env.MONGODB_DB = prevDb;
    process.env.MONGODB_PASSWORD = prevPw;
  });

  it("falls back to defaults when no connection string is provided", async () => {
    const { resolveMongoConfig } = await loadModule();
    const prevUri = process.env.MONGODB_URI;
    const prevDb = process.env.MONGODB_DB;

    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_DB;

    const cfg = resolveMongoConfig();
    expect(cfg.uri).toBe("mongodb://localhost:27017/flappybingus");

    process.env.MONGODB_URI = prevUri;
    process.env.MONGODB_DB = prevDb;
  });

  it("serializes ObjectId and Date values for admin output", async () => {
    const { serializeDocument, parseDocumentId } = await loadModule();
    const now = new Date("2024-01-01T00:00:00.000Z");
    const doc = {
      _id: parseDocumentId("a".repeat(24)),
      nested: { createdAt: now },
      list: [{ _id: parseDocumentId("b".repeat(24)) }]
    };
    const serialized = serializeDocument(doc);
    expect(serialized._id).toBe("a".repeat(24));
    expect(serialized.nested.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(serialized.list[0]._id).toBe("b".repeat(24));
  });

  it("parses ObjectId-like strings for admin document lookups", async () => {
    const { parseDocumentId } = await loadModule();
    const hexId = "a".repeat(24);
    const parsed = parseDocumentId(hexId);
    expect(parsed.toHexString()).toBe(hexId);
    const passthrough = parseDocumentId("custom-id");
    expect(passthrough).toBe("custom-id");
  });
});

describe("MongoDataStore connection lifecycle", () => {
  it("connects and seeds indexes, updating status on success", async () => {
    const { MongoDataStore } = await loadModule();
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db", serverSelectionTimeoutMS: 1234 });
    const db = await store.connect();
    expect(db).toBe(connectBehavior.db);
    expect(store.status.connected).toBe(true);
    expect(store.status.lastPingMs).toBeGreaterThanOrEqual(0);
    const users = connectBehavior.db.collection.mock.results[0].value;
    expect(users.createIndex).toHaveBeenCalled();
  });

  it("captures errors and clears state when connect fails", async () => {
    const { MongoDataStore } = await loadModule();
    connectBehavior.error = new Error("nope");
    const store = new MongoDataStore({ uri: "mongodb://fail", dbName: "db" });
    await expect(store.connect()).rejects.toThrow("nope");
    expect(store.status.connected).toBe(false);
    expect(store.client).toBeNull();
    expect(store.status.lastError).toBe("nope");
  });

  it("propagates ensureConnected failures while recording status", async () => {
    const { MongoDataStore } = await loadModule();
    const store = new MongoDataStore({ uri: "mongodb://fail", dbName: "db" });
    vi.spyOn(store, "connect").mockRejectedValue(new Error("boom"));
    await expect(store.ensureConnected()).rejects.toThrow("boom");
    expect(store.status.connected).toBe(false);
    expect(store.status.lastError).toBe("boom");
  });

  it("captures non-Error failures with a stringified lastError", async () => {
    const { MongoDataStore } = await loadModule();
    const store = new MongoDataStore({ uri: "mongodb://fail", dbName: "db" });
    const err = { reason: "kaput", toString: () => "kaput" };
    vi.spyOn(store, "connect").mockRejectedValue(err);

    await expect(store.ensureConnected()).rejects.toEqual(err);
    expect(store.status.lastError).toBe("kaput");
  });

  it("throws when accessing users collection without a db", async () => {
    const { MongoDataStore } = await loadModule();
    const store = new MongoDataStore({ uri: "mongodb://no", dbName: "db" });
    expect(() => store.usersCollection()).toThrow("db_not_connected");
  });

  it("fetches users by key while ensuring connectivity", async () => {
    const { MongoDataStore } = await loadModule();
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    const found = { key: "abc" };
    store.usersCollection = () => ({ findOne: vi.fn(async (query) => ({ ...found, ...query })) });

    const user = await store.getUserByKey("abc");

    expect(store.ensureConnected).toHaveBeenCalled();
    expect(user).toEqual({ key: "abc" });
  });

  it("returns cached connections without re-initializing a client", async () => {
    const { MongoDataStore } = await loadModule();
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.client = { cached: true };
    store.db = { name: "db" };

    const db = await store.connect();

    expect(db).toEqual({ name: "db" });
    expect(store.status.lastAttemptAt).toBeNull();
  });
});

describe("MongoDataStore icon registry helpers", () => {
  it("maps icon registry documents into icon definitions", async () => {
    const { MongoDataStore } = await loadModule();
    const collection = makeCollection({
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn(async () => ([
          { _id: "alpha", name: "Alpha", unlock: { type: "free" }, updatedAt: 1 },
          { _id: "beta", id: "beta", name: "Beta", unlock: { type: "free" } },
          { _id: "", name: "Bad" }
        ]))
      }))
    });
    connectBehavior.db.collection = vi.fn(() => collection);
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    await store.connect();
    const icons = await store.getIconRegistry();
    expect(icons).toEqual([
      { id: "alpha", name: "Alpha", unlock: { type: "free" } },
      { id: "beta", name: "Beta", unlock: { type: "free" } }
    ]);
  });

  it("persists icon registry updates and removes stale entries", async () => {
    const { MongoDataStore } = await loadModule();
    const bulkWrite = vi.fn(async () => ({}));
    const deleteMany = vi.fn(async () => ({}));
    const collection = makeCollection({ bulkWrite, deleteMany });
    connectBehavior.db.collection = vi.fn(() => collection);
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    await store.connect();
    await store.saveIconRegistry([{ id: "spark", name: "Spark", unlock: { type: "free" } }]);
    expect(bulkWrite).toHaveBeenCalledWith([
      {
        replaceOne: {
          filter: { _id: "spark" },
          replacement: {
            _id: "spark",
            id: "spark",
            name: "Spark",
            unlock: { type: "free" },
            updatedAt: expect.any(Number)
          },
          upsert: true
        }
      }
    ], { ordered: false });
    expect(deleteMany).toHaveBeenCalledWith({ _id: { $nin: ["spark"] } });
  });

  it("clears icon registry entries when saving an empty catalog", async () => {
    const { MongoDataStore } = await loadModule();
    const bulkWrite = vi.fn(async () => ({}));
    const deleteMany = vi.fn(async () => ({}));
    const collection = makeCollection({ bulkWrite, deleteMany });
    connectBehavior.db.collection = vi.fn(() => collection);
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    await store.connect();
    await store.saveIconRegistry([]);
    expect(bulkWrite).not.toHaveBeenCalled();
    expect(deleteMany).toHaveBeenCalledWith({});
  });
});

describe("MongoDataStore mutations and reads", () => {
  it("updates trails and keybinds", async () => {
    const { MongoDataStore } = await loadModule();
    const val = {
      key: "k",
      selectedTrail: "neon",
      keybinds: { dash: "Space" },
      settings: { dashBehavior: "destroy", slowFieldBehavior: "slow", teleportBehavior: "normal", invulnBehavior: "short" }
    };
    const coll = makeCollection({ findOneAndUpdate: vi.fn(async () => ({ value: val })) });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.db = { collection: () => coll };

    await expect(store.setTrail("k", "neon")).resolves.toEqual(val);
    await expect(store.setKeybinds("k", { dash: "Space" })).resolves.toEqual(val);
    await expect(store.setSettings("k", { dashBehavior: "destroy" })).resolves.toEqual(val);
    expect(coll.findOneAndUpdate).toHaveBeenCalledTimes(3);
  });

  it("loads and saves server config documents", async () => {
    const { MongoDataStore } = await loadModule();
    const doc = { _id: "active", config: { session: { ttlSeconds: 12 } }, updatedAt: 123 };
    const coll = makeCollection({
      findOne: vi.fn(async () => doc),
      replaceOne: vi.fn(async () => ({}))
    });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.db = { collection: vi.fn(() => coll) };

    const loaded = await store.getServerConfig();
    const saved = await store.saveServerConfig({ session: { ttlSeconds: 99 } });

    expect(loaded).toEqual(doc);
    expect(coll.findOne).toHaveBeenCalledWith({ _id: "active" });
    expect(coll.replaceOne).toHaveBeenCalledWith(
      { _id: "active" },
      expect.objectContaining({ _id: "active", config: { session: { ttlSeconds: 99 } }, updatedAt: expect.any(Number) }),
      { upsert: true }
    );
    expect(saved.config.session.ttlSeconds).toBe(99);
  });

  it("loads and saves game config documents", async () => {
    const { MongoDataStore } = await loadModule();
    const doc = { _id: "active", config: { scoring: { pipeDodge: 2 } }, updatedAt: 321 };
    const coll = makeCollection({
      findOne: vi.fn(async () => doc),
      replaceOne: vi.fn(async () => ({}))
    });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.db = { collection: vi.fn(() => coll) };

    const loaded = await store.getGameConfig();
    const saved = await store.saveGameConfig({ scoring: { pipeDodge: 4 } });

    expect(loaded).toEqual(doc);
    expect(coll.findOne).toHaveBeenCalledWith({ _id: "active" });
    expect(coll.replaceOne).toHaveBeenCalledWith(
      { _id: "active" },
      expect.objectContaining({ _id: "active", config: { scoring: { pipeDodge: 4 } }, updatedAt: expect.any(Number) }),
      { upsert: true }
    );
    expect(saved.config.scoring.pipeDodge).toBe(4);
  });

  it("returns top highscores with sane limits and coercion", async () => {
    const { MongoDataStore } = await loadModule();
    const docs = [
      { username: "a", bestScore: "10", updatedAt: "5" },
      { username: "b", bestScore: 5, updatedAt: 2 }
    ];
    const chain = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn(async () => docs)
    };
    const coll = makeCollection({ find: vi.fn(() => chain) });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => coll;

    const result = await store.topHighscores(500);
    expect(chain.limit).toHaveBeenCalledWith(200);
    expect(result[0]).toEqual({ username: "a", bestScore: 10, updatedAt: 5 });
  });

  it("returns recent users capped at reasonable limits", async () => {
    const { MongoDataStore } = await loadModule();
    const chain = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn(async () => [{ username: "x" }])
    };
    const coll = makeCollection({ find: vi.fn(() => chain) });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => coll;

    const result = await store.recentUsers(999);
    expect(chain.limit).toHaveBeenCalledWith(50);
    expect(result[0].username).toBe("x");
  });

  it("counts users via the collection API", async () => {
    const { MongoDataStore } = await loadModule();
    const coll = makeCollection({ countDocuments: vi.fn(async () => 42) });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => coll;

    const count = await store.userCount();
    expect(count).toBe(42);
  });

  it("sums total runs across users", async () => {
    const { MongoDataStore } = await loadModule();
    const aggregateResult = [{ totalRuns: 12.8 }];
    const coll = makeCollection({
      aggregate: vi.fn(() => ({ toArray: vi.fn(async () => aggregateResult) }))
    });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => coll;

    const total = await store.totalRuns();
    expect(total).toBe(12);
    expect(coll.aggregate).toHaveBeenCalledWith([
      { $group: { _id: null, totalRuns: { $sum: { $ifNull: ["$runs", 0] } } } }
    ]);
  });

  it("defaults total runs to zero when aggregation returns nothing", async () => {
    const { MongoDataStore } = await loadModule();
    const coll = makeCollection({
      aggregate: vi.fn(() => ({ toArray: vi.fn(async () => []) }))
    });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => coll;

    const total = await store.totalRuns();
    expect(total).toBe(0);
  });

  it("renames an existing user when the username changes", async () => {
    const { MongoDataStore } = await loadModule();
    const firstUser = { key: "abc", username: "Old" };
    const renamedUser = { key: "abc", username: "New" };
    const collection = {
      findOne: vi.fn()
        .mockResolvedValueOnce(firstUser)
        .mockResolvedValueOnce(renamedUser),
      updateOne: vi.fn(async () => ({}))
    };
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => collection;

    const result = await store.upsertUser("New", "abc", {});
    expect(collection.updateOne).toHaveBeenCalledWith({ key: "abc" }, { $set: { username: "New", updatedAt: expect.any(Number) } });
    expect(result).toEqual(renamedUser);
  });

  it("retries lookups when insert races trigger duplicate key errors", async () => {
    const { MongoDataStore } = await loadModule();
    const collection = {
      findOne: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ key: "dup", username: "Dup" }),
      insertOne: vi.fn(async () => { throw { code: 11000 }; })
    };
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => collection;

    const result = await store.upsertUser("Dup", "dup", {});
    expect(collection.insertOne).toHaveBeenCalled();
    expect(collection.findOne).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ key: "dup", username: "Dup" });
  });

  it("returns existing users unchanged when usernames match", async () => {
    const { MongoDataStore } = await loadModule();
    const existing = { key: "abc", username: "Same" };
    const collection = {
      findOne: vi.fn().mockResolvedValue(existing)
    };
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => collection;

    const result = await store.upsertUser("Same", "abc", {});

    expect(collection.findOne).toHaveBeenCalledTimes(1);
    expect(result).toBe(existing);
  });

  it("upserts new users and returns the freshly inserted document", async () => {
    const { MongoDataStore } = await loadModule();
    const inserted = { _id: "1", key: "abc", username: "Fresh" };
    const collection = {
      findOne: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(inserted),
      insertOne: vi.fn(async () => ({ insertedId: "1" }))
    };
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => collection;

    const result = await store.upsertUser("Fresh", "abc", { createdAt: 1 });

    expect(collection.insertOne).toHaveBeenCalledWith(expect.objectContaining({ key: "abc", username: "Fresh" }));
    expect(result).toBe(inserted);
  });

  it("rethrows unexpected insert errors", async () => {
    const { MongoDataStore } = await loadModule();
    const collection = {
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn(async () => { const err = new Error("kaput"); err.code = 42; throw err; })
    };
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => collection;

    await expect(store.upsertUser("Boom", "abc", {})).rejects.toThrow("kaput");
  });

  it("upserts with default metadata when no defaults are provided", async () => {
    const { MongoDataStore } = await loadModule();
    const now = 9_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const inserted = { _id: "1", key: "abc", username: "Fresh" };
    const collection = {
      findOne: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(inserted),
      insertOne: vi.fn(async () => ({ insertedId: "1" }))
    };
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => collection;

    const result = await store.upsertUser("Fresh", "abc", undefined);

    expect(collection.insertOne).toHaveBeenCalledWith({ key: "abc", username: "Fresh", createdAt: now, updatedAt: now });
    expect(result).toBe(inserted);
  });

  it("clamps highscore queries to defaults and sanitizes values", async () => {
    const { MongoDataStore } = await loadModule();
    const docs = [
      { username: "zero", bestScore: null, updatedAt: undefined }
    ];
    const chain = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn(async () => docs)
    };
    const coll = makeCollection({ find: vi.fn(() => chain) });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => coll;

    const result = await store.topHighscores(0);

    expect(chain.limit).toHaveBeenCalledWith(20);
    expect(result[0]).toEqual({ username: "zero", bestScore: 0, updatedAt: 0 });
  });

  it("caps recent user queries at a minimum of one and defaults on falsy values", async () => {
    const { MongoDataStore } = await loadModule();
    const chain = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn(async () => [{ username: "x" }])
    };
    const coll = makeCollection({ find: vi.fn(() => chain) });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => coll;

    await store.recentUsers(0);
    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  it("persists score submissions with normalized counters and achievements", async () => {
    const { MongoDataStore } = await loadModule();
    const coll = makeCollection({
      findOneAndUpdate: vi.fn(async () => ({
        value: { key: "k", bestScore: 50, bustercoins: 7, currencies: { bustercoin: 7 }, runs: 2 }
      }))
    });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => coll;

    const user = {
      key: "k",
      username: "User",
      runs: 1,
      totalScore: 10,
      bestScore: 40,
      bustercoins: 4,
      currencies: { bustercoin: 4 },
      achievements: { unlocked: {}, progress: {} },
      skillTotals: { dash: 1, phase: 2, teleport: 3, slowField: 4 }
    };

    const updated = await store.recordScore(user, 50.9, {
      bustercoinsEarned: 3.2,
      achievements: { unlocked: { a: 1 }, progress: { bestScore: 50 } },
      skillUsage: { dash: 1, phase: 1, teleport: 1, slowField: 1 },
      runTime: 90
    });

    expect(store.ensureConnected).toHaveBeenCalled();
    expect(coll.findOneAndUpdate).toHaveBeenCalledWith(
      { key: "k" },
      expect.any(Array),
      { returnDocument: "after", upsert: true }
    );
    const [, pipeline] = coll.findOneAndUpdate.mock.calls[0];
    const setStage = pipeline[0].$set;
    expect(setStage.bestScore).toBeDefined();
    expect(setStage.longestRun).toBeDefined();
    expect(setStage.totalTimePlayed).toBeDefined();
    expect(setStage.skillTotals).toBeDefined();
    expect(updated).toEqual({ key: "k", bestScore: 50, bustercoins: 7, currencies: { bustercoin: 7 }, runs: 2 });
  });

  it("updates purchase payloads in the datastore", async () => {
    const { MongoDataStore } = await loadModule();
    const coll = makeCollection({
      findOneAndUpdate: vi.fn(async () => ({
        value: { key: "k", ownedUnlockables: ["u1"], currencies: { bustercoin: 5 } }
      }))
    });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.usersCollection = () => coll;

    const updated = await store.purchaseUnlockable("k", {
      ownedUnlockables: ["u1"],
      currencies: { bustercoin: 5 },
      bustercoins: 5,
      unlockables: { unlocked: {} }
    });

    expect(coll.findOneAndUpdate).toHaveBeenCalledWith(
      { key: "k" },
      { $set: expect.objectContaining({ ownedUnlockables: ["u1"], bustercoins: 5 }) },
      { returnDocument: "after" }
    );
    expect(updated).toEqual({ key: "k", ownedUnlockables: ["u1"], currencies: { bustercoin: 5 } });
  });

  it("records support offers and credits supportcoins", async () => {
    const { MongoDataStore } = await loadModule();
    const offers = makeCollection({
      insertOne: vi.fn(async () => ({ insertedId: "offer-id" }))
    });
    const users = makeCollection({
      findOneAndUpdate: vi.fn(async () => ({ value: { key: "k", currencies: { supportcoin: 3 } } }))
    });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.supportOffersCollection = () => offers;
    store.usersCollection = () => users;

    const result = await store.recordSupportOffer({
      key: "k",
      username: "User",
      amount: 3,
      transactionId: "txn-1",
      offerId: "offer-1",
      provider: "support-offer"
    });

    expect(offers.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: "txn-1", amount: 3, provider: "support-offer" })
    );
    expect(users.findOneAndUpdate).toHaveBeenCalledWith(
      { key: "k" },
      {
        $inc: { "currencies.supportcoin": 3 },
        $set: expect.objectContaining({ updatedAt: expect.any(Number) })
      },
      { returnDocument: "after" }
    );
    expect(result.credited).toBe(true);
    expect(result.user).toEqual({ key: "k", currencies: { supportcoin: 3 } });
  });

  it("defaults support offers to support-offer when no provider is supplied", async () => {
    const { MongoDataStore } = await loadModule();
    const offers = makeCollection({
      insertOne: vi.fn(async () => ({ insertedId: "offer-id" }))
    });
    const users = makeCollection({
      findOneAndUpdate: vi.fn(async () => ({ value: { key: "k", currencies: { supportcoin: 3 } } }))
    });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.supportOffersCollection = () => offers;
    store.usersCollection = () => users;

    await store.recordSupportOffer({
      key: "k",
      username: "User",
      amount: 3,
      transactionId: "txn-1",
      offerId: "offer-1"
    });

    expect(offers.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: "txn-1", amount: 3, provider: "support-offer" })
    );
  });

  it("returns duplicate status for repeated support transactions", async () => {
    const { MongoDataStore } = await loadModule();
    const offers = makeCollection({
      insertOne: vi.fn(async () => {
        const err = new Error("dup");
        err.code = 11000;
        throw err;
      })
    });
    const users = makeCollection();
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.supportOffersCollection = () => offers;
    store.usersCollection = () => users;

    const result = await store.recordSupportOffer({ key: "k", amount: 2, transactionId: "dup" });

    expect(result).toEqual({ credited: false, reason: "duplicate" });
    expect(users.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("removes support offers when the user no longer exists", async () => {
    const { MongoDataStore } = await loadModule();
    const offers = makeCollection({
      insertOne: vi.fn(async () => ({ insertedId: "offer-id" })),
      deleteOne: vi.fn(async () => ({}))
    });
    const users = makeCollection({
      findOneAndUpdate: vi.fn(async () => ({ value: null }))
    });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.supportOffersCollection = () => offers;
    store.usersCollection = () => users;

    const result = await store.recordSupportOffer({ key: "k", amount: 1, transactionId: "lost" });

    expect(offers.deleteOne).toHaveBeenCalledWith({ transactionId: "lost" });
    expect(result).toEqual({ credited: false, reason: "user_not_found" });
  });

  it("throws when recordSupportOffer is missing required data", async () => {
    const { MongoDataStore } = await loadModule();
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    await expect(store.recordSupportOffer({ amount: 1, transactionId: "t" })).rejects.toThrow("user_key_required");
    store.ensureConnected = vi.fn();
    await expect(store.recordSupportOffer({ key: "k", amount: 0, transactionId: "t" }))
      .rejects.toThrow("invalid_support_amount");
    await expect(store.recordSupportOffer({ key: "k", amount: 1, transactionId: "" }))
      .rejects.toThrow("invalid_support_transaction");
  });

  it("throws when recordScore is called without a user key or when the update yields no document", async () => {
    const { MongoDataStore } = await loadModule();
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    await expect(store.recordScore({}, 10)).rejects.toThrow("user_key_required");

    store.ensureConnected = vi.fn();
    store.usersCollection = () => makeCollection({ findOneAndUpdate: vi.fn(async () => ({ value: null })) });
    await expect(store.recordScore({ key: "k" }, 10)).rejects.toThrow("record_score_failed");
  });
});

describe("MongoDataStore admin helpers", () => {
  it("lists collections by name", async () => {
    const { MongoDataStore } = await loadModule();
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.db = {
      listCollections: vi.fn(() => ({ toArray: vi.fn(async () => [{ name: "users" }, { name: "runs" }]) }))
    };

    const names = await store.listCollections();

    expect(names).toEqual(["users", "runs"]);
  });

  it("lists documents with a limit cap", async () => {
    const { MongoDataStore } = await loadModule();
    const collection = makeCollection({
      find: vi.fn(() => ({
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn(async () => [{ _id: "id-1" }])
      }))
    });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.db = { collection: vi.fn(() => collection) };

    const docs = await store.listDocuments("users", 2);

    expect(collection.find).toHaveBeenCalledWith({});
    expect(docs).toEqual([{ _id: "id-1" }]);
  });

  it("replaces documents without allowing _id mutation", async () => {
    const { MongoDataStore } = await loadModule();
    const collection = makeCollection({
      replaceOne: vi.fn(async () => ({})),
      findOne: vi.fn(async (query) => ({ ...query, name: "updated" }))
    });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.db = { collection: vi.fn(() => collection) };

    const result = await store.replaceDocument("users", "abc123", { _id: "ignore", name: "updated" });

    expect(collection.replaceOne).toHaveBeenCalled();
    expect(result.name).toBe("updated");
  });

  it("inserts documents and returns the stored record", async () => {
    const { MongoDataStore } = await loadModule();
    const collection = makeCollection({
      insertOne: vi.fn(async () => ({ insertedId: "new-id" })),
      findOne: vi.fn(async () => ({ _id: "new-id", name: "created" }))
    });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.db = { collection: vi.fn(() => collection) };

    const result = await store.insertDocument("users", { name: "created" });

    expect(collection.insertOne).toHaveBeenCalled();
    expect(result.name).toBe("created");
  });
});

describe("cleanup and status", () => {
  it("closes client safely and reports status fields", async () => {
    const { MongoDataStore } = await loadModule();
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.client = { close: vi.fn(async () => {}) };
    store.status.connected = true;

    await store.close();
    expect(store.client).toBeNull();
    expect(store.status.connected).toBe(false);

    const status = store.getStatus();
    expect(status.uri).toBe(store.maskedUri);
    expect(status.dbName).toBe(store.dbName);
  });

  it("ignores close requests when no client exists", async () => {
    const { MongoDataStore } = await loadModule();
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });

    await expect(store.close()).resolves.toBeUndefined();
  });
});
