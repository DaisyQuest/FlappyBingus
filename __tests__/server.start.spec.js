import { createRequire } from "module";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("server startup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("logs startup details after ensuring the datastore is ready", async () => {
    const listen = vi.fn((port, cb) => cb && cb());
    const require = createRequire(import.meta.url);
    const http = require("node:http");
    const originalCreateServer = http.createServer;
    http.createServer = vi.fn(() => ({ listen }));
    const prevPublic = process.env.PUBLIC_DIR;
    process.env.PUBLIC_DIR = "/does/not/exist";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { startServer, _setDataStoreForTests } = await import("../server.cjs");

    _setDataStoreForTests({
      ensureConnected: vi.fn().mockResolvedValue(true),
      getStatus: vi.fn(() => ({ uri: "mongodb://masked", dbName: "db" }))
    });

    try {
      await startServer();

      expect(warn).toHaveBeenCalledWith(expect.stringContaining("PUBLIC_DIR missing"));
      expect(http.createServer).toHaveBeenCalled();
      expect(listen).toHaveBeenCalledWith(expect.any(Number), expect.any(Function));
      expect(log).toHaveBeenCalledWith(expect.stringContaining("listening on"));
      expect(log).toHaveBeenCalledWith(expect.stringContaining("mongo target"));
    } finally {
      process.env.PUBLIC_DIR = prevPublic;
      http.createServer = originalCreateServer;
    }
  });
});
