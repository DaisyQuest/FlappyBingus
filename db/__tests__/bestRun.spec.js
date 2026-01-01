import { describe, expect, it, vi } from "vitest";
import { MongoDataStore } from "../mongo.cjs";

class FakeBestRunsCollection {
  constructor(doc = null) {
    this.doc = doc;
    this.lastUpdate = null;
    this.lastFind = null;
    this.finds = [];
    this.updateOne = vi.fn(async (query, update) => {
      this.lastUpdate = { query, update };
      this.doc = { ...(this.doc || {}), ...(update.$set || {}) };
      return { acknowledged: true };
    });
  }

  async findOne(query) {
    this.lastFind = query;
    this.finds.push(query);
    if (!this.doc) return null;
    const entries = Object.entries(query || {});
    const matches = entries.every(([key, value]) => this.doc?.[key] === value);
    return matches ? { ...this.doc } : null;
  }
}

const baseUser = { key: "user-key", username: "User" };

describe("MongoDataStore.recordBestRun", () => {
  it("upserts the first best run replay for a user", async () => {
    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    const collection = new FakeBestRunsCollection();
    store.bestRunsCollection = () => collection;

    const result = await store.recordBestRun(baseUser, {
      score: 42,
      seed: "abc",
      replayJson: '{"ticks":[]}',
      replayHash: "hash",
      ticksLength: 10,
      rngTapeLength: 3,
      replayBytes: 15,
      media: { dataUrl: "data:video/webm;base64,AAA", bytes: 24, mimeType: "video/webm" }
    });

    expect(result.bestScore).toBe(42);
    expect(collection.doc.replayJson).toContain('"ticks"');
    expect(collection.doc.media.mimeType).toBe("video/webm");
    expect(collection.doc.ticksLength).toBe(10);
    expect(collection.doc.rngTapeLength).toBe(3);
  });

  it("skips updates when the incoming score is lower than the saved best", async () => {
    const existing = {
      key: "user-key",
      username: "User",
      bestScore: 100,
      replayJson: "{}",
      replayBytes: 5,
      ticksLength: 1,
      rngTapeLength: 1
    };
    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    const collection = new FakeBestRunsCollection(existing);
    store.bestRunsCollection = () => collection;

    const result = await store.recordBestRun(baseUser, { score: 50, replayJson: "{}", ticksLength: 1 });
    expect(result.bestScore).toBe(100);
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it("throws when user key is missing", async () => {
    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.bestRunsCollection = () => new FakeBestRunsCollection();

    await expect(store.recordBestRun(null, { score: 5, replayJson: "{}", ticksLength: 1 }))
      .rejects
      .toThrow("user_key_required");
  });

  it("replaces the stored replay when the score ties or improves", async () => {
    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    const collection = new FakeBestRunsCollection({ key: "user-key", bestScore: 80, replayJson: "{}" });
    store.bestRunsCollection = () => collection;

    const result = await store.recordBestRun(baseUser, {
      score: 80,
      replayJson: '{"ticks":[1]}',
      replayHash: "hash2",
      ticksLength: 2,
      rngTapeLength: 0
    });

    expect(result.bestScore).toBe(80);
    expect(collection.doc.replayJson).toContain("ticks");
    expect(collection.doc.replayHash).toBe("hash2");
  });

  it("normalizes optional best run fields on save", async () => {
    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    const collection = new FakeBestRunsCollection();
    store.bestRunsCollection = () => collection;

    const result = await store.recordBestRun(
      { key: "user-key" },
      {
        score: 10,
        seed: 123,
        replayJson: 999,
        replayHash: 777,
        ticksLength: -5,
        rngTapeLength: -3,
        durationMs: -10,
        replayBytes: -1
      }
    );

    expect(result.seed).toBe("");
    expect(result.replayJson).toBeNull();
    expect(result.replayHash).toBeNull();
    expect(result.ticksLength).toBe(0);
    expect(result.rngTapeLength).toBe(0);
    expect(result.durationMs).toBe(0);
    expect(result.replayBytes).toBe(0);
  });

  it("retrieves a stored best run by username", async () => {
    const existing = {
      key: "user",
      username: "User",
      bestScore: 80,
      replayJson: "{}"
    };
    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    const collection = new FakeBestRunsCollection(existing);
    store.bestRunsCollection = () => collection;

    const found = await store.getBestRunByUsername("User");
    expect(found).toMatchObject(existing);
    expect(collection.finds).toEqual([{ key: "user" }]);
  });

  it("falls back to username lookup when the key search misses", async () => {
    const existing = {
      username: "User",
      bestScore: 80,
      replayJson: "{}"
    };
    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    const collection = new FakeBestRunsCollection(existing);
    store.bestRunsCollection = () => collection;

    const found = await store.getBestRunByUsername("User");
    expect(found).toMatchObject(existing);
    expect(collection.finds).toEqual([{ key: "user" }, { username: "User" }]);
  });

  it("returns null when no stored best run exists", async () => {
    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    const collection = new FakeBestRunsCollection();
    store.bestRunsCollection = () => collection;

    const found = await store.getBestRunByUsername("User");
    expect(found).toBeNull();
  });

  it("throws when provided with an invalid score", async () => {
    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    store.bestRunsCollection = () => new FakeBestRunsCollection();

    await expect(
      store.recordBestRun(baseUser, { score: 0, replayJson: "{}", ticksLength: 0 })
    ).rejects.toThrow("invalid_best_score");
  });
});
