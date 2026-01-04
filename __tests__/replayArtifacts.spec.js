import { describe, expect, it, vi, afterEach } from "vitest";
import { JSDOM } from "jsdom";

import { createBestRunUploader, downloadBlob } from "../public/js/replayArtifacts.js";

describe("replay artifacts", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("downloads blobs by creating a temporary anchor", () => {
    const dom = new JSDOM(`<!doctype html><body></body>`);
    global.document = dom.window.document;
    global.URL = {
      createObjectURL: vi.fn(() => "blob:demo"),
      revokeObjectURL: vi.fn()
    };

    const clickSpy = vi.spyOn(dom.window.HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const appendSpy = vi.spyOn(dom.window.document.body, "appendChild");

    vi.useFakeTimers();
    downloadBlob(new dom.window.Blob(["demo"]), "demo.txt");

    expect(global.URL.createObjectURL).toHaveBeenCalledOnce();
    expect(appendSpy).toHaveBeenCalledOnce();

    const appended = appendSpy.mock.calls[0][0];
    expect(appended.download).toBe("demo.txt");
    expect(appended.href).toBe("blob:demo");
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(appended.isConnected).toBe(false);

    vi.runAllTimers();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:demo");
  });

  it("returns early when no user is available", async () => {
    const maybeUploadBestRun = vi.fn();
    const uploader = createBestRunUploader({
      getActiveRun: vi.fn(() => ({ ended: true, seed: "seed", ticks: [1] })),
      getUser: vi.fn(() => null),
      cloneReplayRun: vi.fn(),
      maybeUploadBestRun,
      uploadBestRun: vi.fn(),
      setStatus: vi.fn()
    });

    await uploader(10, { stats: true });

    expect(maybeUploadBestRun).not.toHaveBeenCalled();
  });

  it("returns early when there is no active run", async () => {
    const maybeUploadBestRun = vi.fn();
    const uploader = createBestRunUploader({
      getActiveRun: vi.fn(() => null),
      getUser: vi.fn(() => ({ bestScore: 2 })),
      cloneReplayRun: vi.fn(),
      maybeUploadBestRun,
      uploadBestRun: vi.fn(),
      setStatus: vi.fn()
    });

    await uploader(10, { stats: true });

    expect(maybeUploadBestRun).not.toHaveBeenCalled();
  });

  it("returns early when the score is below the stored best", async () => {
    const cloneReplayRun = vi.fn();
    const maybeUploadBestRun = vi.fn();
    const uploader = createBestRunUploader({
      getActiveRun: vi.fn(() => ({ ended: true, seed: "seed", ticks: [1] })),
      getUser: vi.fn(() => ({ bestScore: 20 })),
      cloneReplayRun,
      maybeUploadBestRun,
      uploadBestRun: vi.fn(),
      setStatus: vi.fn()
    });

    await uploader(5, { stats: true });

    expect(cloneReplayRun).not.toHaveBeenCalled();
    expect(maybeUploadBestRun).not.toHaveBeenCalled();
  });

  it("returns early when the run has already been uploaded", async () => {
    const maybeUploadBestRun = vi.fn().mockResolvedValue(true);
    const uploader = createBestRunUploader({
      getActiveRun: vi.fn(() => ({ ended: true, seed: "seed", ticks: [1] })),
      getUser: vi.fn(() => ({ bestScore: 20 })),
      cloneReplayRun: vi.fn((run) => run),
      maybeUploadBestRun,
      uploadBestRun: vi.fn(),
      setStatus: vi.fn()
    });

    await uploader(25, { stats: true });
    await uploader(25, { stats: true });

    expect(maybeUploadBestRun).toHaveBeenCalledOnce();
  });

  it("returns early when the cloned run has no ticks", async () => {
    const maybeUploadBestRun = vi.fn();
    const uploader = createBestRunUploader({
      getActiveRun: vi.fn(() => ({ ended: true, seed: "seed", ticks: [1] })),
      getUser: vi.fn(() => ({ bestScore: 20 })),
      cloneReplayRun: vi.fn(() => ({ ended: true, seed: "seed", ticks: [] })),
      maybeUploadBestRun,
      uploadBestRun: vi.fn(),
      setStatus: vi.fn()
    });

    await uploader(25, { stats: true });

    expect(maybeUploadBestRun).not.toHaveBeenCalled();
  });

  it("passes config snapshots into best-run uploads", async () => {
    const maybeUploadBestRun = vi.fn(async () => true);
    const configSnapshot = { scoring: { pipeDodge: 3 } };
    const uploader = createBestRunUploader({
      getActiveRun: vi.fn(() => ({ ended: true, seed: "seed", ticks: [1] })),
      getUser: vi.fn(() => ({ bestScore: 20 })),
      getConfig: vi.fn(() => configSnapshot),
      cloneReplayRun: vi.fn((run) => run),
      maybeUploadBestRun,
      uploadBestRun: vi.fn(),
      setStatus: vi.fn()
    });

    await uploader(25, { stats: true });

    expect(maybeUploadBestRun).toHaveBeenCalledWith(
      expect.objectContaining({
        configSnapshot
      })
    );
  });

  it("updates status for failure and success paths", async () => {
    const setStatus = vi.fn();
    const maybeUploadBestRun = vi.fn(async ({ logger }) => {
      logger("Best run upload failed.");
      return false;
    });

    const uploader = createBestRunUploader({
      getActiveRun: vi.fn(() => ({ ended: true, seed: "seed", ticks: [1] })),
      getUser: vi.fn(() => ({ bestScore: 20 })),
      cloneReplayRun: vi.fn((run) => run),
      maybeUploadBestRun,
      uploadBestRun: vi.fn(),
      setStatus
    });

    await uploader(25, { stats: true });

    expect(setStatus).toHaveBeenCalledWith({ className: "hint", text: "Best run upload failed." });
    expect(setStatus).not.toHaveBeenCalledWith({
      className: "hint good",
      text: "Best run saved to server."
    });

    maybeUploadBestRun.mockImplementationOnce(async ({ logger }) => {
      logger("Best run upload complete.");
      return true;
    });

    await uploader(25, { stats: true });

    expect(setStatus).toHaveBeenCalledWith({ className: "hint", text: "Best run upload complete." });
    expect(setStatus).toHaveBeenCalledWith({
      className: "hint good",
      text: "Best run saved to server."
    });
  });
});
