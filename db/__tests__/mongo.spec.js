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

  it("throws when accessing users collection without a db", async () => {
    const { MongoDataStore } = await loadModule();
    const store = new MongoDataStore({ uri: "mongodb://no", dbName: "db" });
    expect(() => store.usersCollection()).toThrow("db_not_connected");
  });
});

describe("MongoDataStore mutations and reads", () => {
  it("updates trails and keybinds", async () => {
    const { MongoDataStore } = await loadModule();
    const val = { key: "k", selectedTrail: "neon", keybinds: { dash: "Space" } };
    const coll = makeCollection({ findOneAndUpdate: vi.fn(async () => ({ value: val })) });
    const store = new MongoDataStore({ uri: "mongodb://ok", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.db = { collection: () => coll };

    await expect(store.setTrail("k", "neon")).resolves.toEqual(val);
    await expect(store.setKeybinds("k", { dash: "Space" })).resolves.toEqual(val);
    expect(coll.findOneAndUpdate).toHaveBeenCalledTimes(2);
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
});
