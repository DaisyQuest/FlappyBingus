import { describe, expect, it, vi } from "vitest";

import { createIconMenuStateProvider } from "../public/js/iconMenuState.js";

const buildIcons = () => ([
  { id: "alpha", name: "Alpha" },
  { id: "beta", name: "Beta" }
]);

describe("icon menu state provider", () => {
  it("builds ordered state with unlocks and achievements", () => {
    const icons = buildIcons();
    const computeUnlockedIconSet = vi.fn().mockReturnValue(new Set(["alpha"]));
    const getState = createIconMenuStateProvider({ computeUnlockedIconSet });
    const user = {
      bestScore: 21,
      isRecordHolder: true,
      achievements: { unlocked: { perfect_ten: true } }
    };

    const state = getState({
      icons,
      user,
      achievementsState: { unlocked: { other: true } },
      unlockables: [{ id: "alpha" }]
    });

    expect(computeUnlockedIconSet).toHaveBeenCalledWith({
      icons: icons.slice(),
      user,
      achievementsState: { unlocked: { other: true } },
      unlockables: [{ id: "alpha" }]
    });
    expect(state.orderedIcons).toEqual(icons);
    expect(state.unlocked.has("alpha")).toBe(true);
    expect(state.bestScore).toBe(21);
    expect(state.isRecordHolder).toBe(true);
    expect(state.achievements).toEqual(user.achievements);
  });

  it("falls back when helpers are missing", () => {
    const getState = createIconMenuStateProvider();
    const icons = buildIcons();

    const state = getState({ icons, user: null, achievementsState: { unlocked: {} } });

    expect(state.orderedIcons).toEqual(icons);
    expect(state.unlocked.size).toBe(0);
    expect(state.bestScore).toBe(0);
    expect(state.isRecordHolder).toBe(false);
    expect(state.achievements).toEqual({ unlocked: {} });
  });
});
