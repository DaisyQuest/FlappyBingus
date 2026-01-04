import { describe, it, expect, vi } from "vitest";
import { createPersonalBestUpdater } from "../main/personalBestAdapter.js";

describe("createPersonalBestUpdater", () => {
  it("forwards the personal best payload to the renderer", () => {
    const updatePersonalBestUI = vi.fn();
    const updater = createPersonalBestUpdater({
      elements: { personalBestEl: "pb", badgeEl: "badge", statusEl: "status" },
      readLocalBest: vi.fn(),
      writeLocalBest: vi.fn(),
      computePersonalBestStatus: vi.fn(),
      updatePersonalBestElements: vi.fn(),
      updatePersonalBestUI
    });

    updater(1200, 800);

    expect(updatePersonalBestUI).toHaveBeenCalledWith({
      finalScore: 1200,
      userBestScore: 800,
      elements: { personalBestEl: "pb", badgeEl: "badge", statusEl: "status" },
      readLocalBest: expect.any(Function),
      writeLocalBest: expect.any(Function),
      computePersonalBestStatus: expect.any(Function),
      updatePersonalBestElements: expect.any(Function)
    });
  });
});
