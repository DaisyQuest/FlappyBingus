import { describe, expect, it, vi } from "vitest";
import { updatePersonalBestUI } from "../personalBestUI.js";

describe("personal best UI", () => {
  it("returns null when no personal best element exists", () => {
    const result = updatePersonalBestUI({
      finalScore: 10,
      userBestScore: 5,
      elements: null,
      readLocalBest: vi.fn(),
      writeLocalBest: vi.fn(),
      computePersonalBestStatus: vi.fn(),
      updatePersonalBestElements: vi.fn()
    });

    expect(result).toBeNull();
  });

  it("persists local best when status requires it and updates elements", () => {
    const readLocalBest = vi.fn()
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(7);
    const writeLocalBest = vi.fn();
    const computePersonalBestStatus = vi.fn()
      .mockReturnValueOnce({ score: 7, shouldPersistLocalBest: true })
      .mockReturnValueOnce({ score: 7, shouldPersistLocalBest: false });
    const updatePersonalBestElements = vi.fn();
    const elements = { personalBestEl: {}, badgeEl: {}, statusEl: {} };

    const result = updatePersonalBestUI({
      finalScore: 7,
      userBestScore: 6,
      elements,
      readLocalBest,
      writeLocalBest,
      computePersonalBestStatus,
      updatePersonalBestElements
    });

    expect(writeLocalBest).toHaveBeenCalledWith(7);
    expect(updatePersonalBestElements).toHaveBeenCalledWith(
      {
        personalBestEl: elements.personalBestEl,
        badgeEl: elements.badgeEl,
        statusEl: elements.statusEl
      },
      { score: 7, shouldPersistLocalBest: false }
    );
    expect(result).toEqual({ score: 7, shouldPersistLocalBest: false });
  });

  it("skips persistence when status does not request it", () => {
    const readLocalBest = vi.fn().mockReturnValue(4);
    const writeLocalBest = vi.fn();
    const computePersonalBestStatus = vi.fn()
      .mockReturnValueOnce({ score: 4, shouldPersistLocalBest: false })
      .mockReturnValueOnce({ score: 4, shouldPersistLocalBest: false });
    const updatePersonalBestElements = vi.fn();
    const elements = { personalBestEl: {}, badgeEl: {}, statusEl: {} };

    updatePersonalBestUI({
      finalScore: 4,
      userBestScore: 3,
      elements,
      readLocalBest,
      writeLocalBest,
      computePersonalBestStatus,
      updatePersonalBestElements
    });

    expect(writeLocalBest).not.toHaveBeenCalled();
    expect(updatePersonalBestElements).toHaveBeenCalledTimes(1);
  });

  it("handles missing optional dependencies gracefully", () => {
    const elements = { personalBestEl: {}, badgeEl: {}, statusEl: {} };

    const result = updatePersonalBestUI({
      finalScore: 8,
      userBestScore: 2,
      elements
    });

    expect(result).toBeNull();
  });
});
