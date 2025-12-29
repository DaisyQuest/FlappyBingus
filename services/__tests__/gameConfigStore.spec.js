import { describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import { createGameConfigStore, resolveConfigPath } from "../gameConfigStore.cjs";

describe("game config store", () => {
  it("requires a config path", () => {
    expect(() => resolveConfigPath()).toThrow("config_path_required");
  });

  it("loads persisted config and writes it to disk", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bingus-game-config-"));
    const configPath = path.join(dir, "game.json");
    const persistence = {
      load: vi.fn(async () => ({ scoring: { pipeDodge: 3 } }))
    };
    const store = createGameConfigStore({ configPath, persistence });

    const loaded = await store.load();

    expect(persistence.load).toHaveBeenCalled();
    expect(loaded.scoring.pipeDodge).toBe(3);
    const raw = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(raw.scoring.pipeDodge).toBe(3);
    expect(store.getMeta().lastPersistedAt).toBeTypeOf("number");
  });

  it("falls back to disk when no persisted config exists", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bingus-game-config-"));
    const configPath = path.join(dir, "game.json");
    await fs.writeFile(configPath, JSON.stringify({ pipes: { speed: 9 } }));
    const persistence = {
      load: vi.fn(async () => null)
    };
    const store = createGameConfigStore({ configPath, persistence });

    const loaded = await store.load();

    expect(persistence.load).toHaveBeenCalled();
    expect(loaded.pipes.speed).toBe(9);
  });

  it("accepts empty objects from persistence", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bingus-game-config-"));
    const configPath = path.join(dir, "game.json");
    const persistence = {
      load: vi.fn(async () => ({}))
    };
    const store = createGameConfigStore({ configPath, persistence });

    const loaded = await store.load();

    expect(persistence.load).toHaveBeenCalled();
    expect(loaded).toEqual({});
    const raw = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(raw).toEqual({});
  });

  it("returns an empty config when the file is missing", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bingus-game-config-"));
    const configPath = path.join(dir, "missing.json");
    const store = createGameConfigStore({ configPath });

    const loaded = await store.load();

    expect(loaded).toEqual({});
  });

  it("persists updates and syncs them to disk", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bingus-game-config-"));
    const configPath = path.join(dir, "game.json");
    const persistence = {
      save: vi.fn(async () => undefined)
    };
    const store = createGameConfigStore({ configPath, persistence });

    const saved = await store.save({ scoring: { pipeDodge: 6 } });

    expect(persistence.save).toHaveBeenCalledWith({ scoring: { pipeDodge: 6 } });
    const raw = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(raw.scoring.pipeDodge).toBe(6);
    expect(saved.scoring.pipeDodge).toBe(6);
    expect(store.getMeta().lastSavedAt).toBeTypeOf("number");
    expect(store.getMeta().lastPersistedAt).toBeTypeOf("number");
  });
});
