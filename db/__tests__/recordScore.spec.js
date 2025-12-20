import { afterEach, describe, expect, it, vi } from "vitest";
import { MongoDataStore } from "../mongo.cjs";

class FakeCollection {
  constructor(doc) {
    this.doc = doc;
  }

  async findOneAndUpdate(filter, update, options) {
    if (filter.key !== (this.doc?.key ?? filter.key)) {
      return { value: null };
    }

    const upserting = !this.doc && options?.upsert;

    if (upserting && !Array.isArray(update)) {
      // For non-pipeline upserts, clone $setOnInsert directly.
      this.doc = { ...(update.$setOnInsert || {}) };
    } else if (upserting && Array.isArray(update)) {
      // For pipeline upserts, start from an empty document.
      this.doc = {};
    } else if (!this.doc) {
      return { value: null };
    }

    if (Array.isArray(update)) {
      this.applyPipelineUpdate(update);
    } else {
      this.applyClassicUpdate(update);
    }

    return { value: { ...this.doc } };
  }

  applyClassicUpdate(update) {
    if (update.$set) {
      this.doc = { ...this.doc, ...update.$set };
    }
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        this.doc[k] = (this.doc[k] ?? 0) + v;
      }
    }
    if (update.$max) {
      for (const [k, v] of Object.entries(update.$max)) {
        const current = this.doc[k] ?? Number.NEGATIVE_INFINITY;
        this.doc[k] = Math.max(current, v);
      }
    }
  }

  applyPipelineUpdate(stages) {
    for (const stage of stages) {
      if (stage.$set) {
        const next = {};
        for (const [key, expr] of Object.entries(stage.$set)) {
          next[key] = this.evaluateExpression(expr);
        }
        this.doc = { ...this.doc, ...next };
      }
    }
  }

  evaluateExpression(expr) {
    if (expr && typeof expr === "object") {
      if (Object.prototype.hasOwnProperty.call(expr, "$ifNull")) {
        const [first, fallback] = expr.$ifNull;
        const firstVal = this.evaluateExpression(first);
        return firstVal == null ? this.evaluateExpression(fallback) : firstVal;
      }
      if (Object.prototype.hasOwnProperty.call(expr, "$add")) {
        const values = expr.$add.map((v) => this.evaluateExpression(v));
        return values.reduce((sum, v) => sum + v, 0);
      }
      if (Object.prototype.hasOwnProperty.call(expr, "$max")) {
        const values = expr.$max.map((v) => this.evaluateExpression(v));
        return Math.max(...values);
      }
    }

    if (typeof expr === "string" && expr.startsWith("$")) {
      return this.doc[expr.slice(1)];
    }

    return expr;
  }
}

describe("MongoDataStore.recordScore", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates existing user atomically", async () => {
    const now = 1_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    const existing = {
      key: "jason",
      username: "jason",
      runs: 2,
      totalScore: 100,
      bestScore: 60,
      createdAt: 100,
      selectedTrail: "classic",
      keybinds: null
    };
    const collection = new FakeCollection(existing);
    store.usersCollection = () => collection;

    const result = await store.recordScore(existing, 50);

    expect(result).toEqual({
      key: "jason",
      username: "jason",
      runs: 3,
      totalScore: 150,
      bestScore: 60,
      createdAt: 100,
      selectedTrail: "classic",
      updatedAt: now,
      keybinds: null
    });
  });

  it("upserts missing user without duplicate key races", async () => {
    const now = 2_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    const collection = new FakeCollection(null);
    store.usersCollection = () => collection;

    const user = { key: "jason", username: "Jason", totalScore: 0, runs: 0, bestScore: 0 };
    const result = await store.recordScore(user, 25);

    expect(result).toEqual({
      key: "jason",
      username: "Jason",
      selectedTrail: "classic",
      keybinds: null,
      runs: 1,
      totalScore: 25,
      bestScore: 25,
      createdAt: now,
      updatedAt: now
    });
  });

  it("upserts and seeds counters when provided in payload", async () => {
    const now = 4_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    const collection = new FakeCollection(null);
    store.usersCollection = () => collection;

    const user = { key: "mel", username: "Mel", totalScore: 10, runs: 5, bestScore: 8, createdAt: 10 };
    const result = await store.recordScore(user, 7);

    expect(result).toEqual({
      key: "mel",
      username: "Mel",
      selectedTrail: "classic",
      keybinds: null,
      runs: 6,
      totalScore: 17,
      bestScore: 8,
      createdAt: 10,
      updatedAt: now
    });
  });

  it("handles missing counters by starting from zero", async () => {
    const now = 3_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const store = new MongoDataStore({ uri: "mongodb://test", dbName: "db" });
    store.ensureConnected = vi.fn();
    const existing = {
      key: "jason",
      username: "Jason",
      runs: undefined,
      totalScore: undefined,
      bestScore: undefined,
      createdAt: 50,
      selectedTrail: "classic",
      keybinds: null
    };
    const collection = new FakeCollection(existing);
    store.usersCollection = () => collection;

    const result = await store.recordScore(existing, 10);

    expect(result).toEqual({
      key: "jason",
      username: "Jason",
      runs: 1,
      totalScore: 10,
      bestScore: 10,
      createdAt: 50,
      selectedTrail: "classic",
      keybinds: null,
      updatedAt: now
    });
  });
});
