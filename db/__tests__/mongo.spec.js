import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "module";

let connectBehavior;

const applyMongoMock = () => {
  const req = createRequire(import.meta.url);
  const id = req.resolve("mongodb");
  req.cache[id] = {
    exports: {
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
  find: vi.fn(() => ({
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn(async () => [])
  })),
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
      collection: vi.fn(() => makeCollection())
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
