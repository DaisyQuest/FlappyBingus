import { describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createBackgroundConfigStore } from "../services/backgroundConfigStore.cjs";

async function makeTempPath() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bg-config-"));
  return path.join(dir, "background-config.json");
}

describe("backgroundConfigStore", () => {
  it("loads from persistence and writes to disk", async () => {
    const filePath = await makeTempPath();
    const persistence = {
      load: vi.fn(async () => ({ id: "mongo", loopSeconds: 120 })),
      save: vi.fn(async () => {})
    };
    const store = createBackgroundConfigStore({ configPath: filePath, persistence, now: () => 1111 });

    const loaded = await store.load();
    expect(loaded.id).toBe("mongo");
    const written = JSON.parse(await fs.readFile(filePath, "utf8"));
    expect(written.loopSeconds).toBe(120);
  });

  it("falls back to disk when persistence is empty", async () => {
    const filePath = await makeTempPath();
    await fs.writeFile(filePath, JSON.stringify({ id: "file", loopSeconds: 90 }));
    const persistence = {
      load: vi.fn(async () => null)
    };
    const store = createBackgroundConfigStore({ configPath: filePath, persistence, now: () => 2222 });

    const loaded = await store.load();
    expect(loaded.id).toBe("file");
  });

  it("saves to persistence and disk", async () => {
    const filePath = await makeTempPath();
    const persistence = {
      save: vi.fn(async () => {})
    };
    const store = createBackgroundConfigStore({ configPath: filePath, persistence, now: () => 3333 });

    await store.save({ id: "saved", loopSeconds: 200 });

    expect(persistence.save).toHaveBeenCalledWith({ id: "saved", loopSeconds: 200 });
    const written = JSON.parse(await fs.readFile(filePath, "utf8"));
    expect(written.id).toBe("saved");
  });
});
