import { describe, expect, it, vi } from "vitest";

import { createTrailMenuStateProvider } from "../public/js/trailMenuState.js";

const buildTrails = () => ([
  { id: "classic", name: "Classic" },
  { id: "ember", name: "Ember" }
]);

describe("trail menu state provider", () => {
  it("builds ordered state with unlocks and user achievements", () => {
    const trails = buildTrails();
    const sortTrailsForDisplay = vi.fn((list, { isRecordHolder }) => (isRecordHolder ? list.slice().reverse() : list));
    const computeUnlockedTrailSet = vi.fn().mockReturnValue(new Set(["classic"]));

    const getState = createTrailMenuStateProvider({ sortTrailsForDisplay, computeUnlockedTrailSet });
    const user = {
      bestScore: 42,
      isRecordHolder: true,
      achievements: { unlocked: { trail_classic_1: true } }
    };

    const state = getState({ trails, user, achievementsState: { unlocked: { other: true } } });

    expect(sortTrailsForDisplay).toHaveBeenCalledWith(trails, { isRecordHolder: true });
    expect(computeUnlockedTrailSet).toHaveBeenCalledWith({ trails: state.orderedTrails, user, achievementsState: { unlocked: { other: true } } });
    expect(state.orderedTrails).toEqual(trails.slice().reverse());
    expect(state.unlocked.has("classic")).toBe(true);
    expect(state.bestScore).toBe(42);
    expect(state.isRecordHolder).toBe(true);
    expect(state.achievements).toEqual(user.achievements);
  });

  it("falls back when helpers are missing", () => {
    const getState = createTrailMenuStateProvider();
    const trails = buildTrails();

    const state = getState({ trails, user: null, achievementsState: { unlocked: {} } });

    expect(state.orderedTrails).toEqual(trails);
    expect(state.unlocked.size).toBe(0);
    expect(state.bestScore).toBe(0);
    expect(state.isRecordHolder).toBe(false);
    expect(state.achievements).toEqual({ unlocked: {} });
  });
});
