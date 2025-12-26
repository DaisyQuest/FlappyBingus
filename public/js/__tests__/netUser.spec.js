import { describe, expect, it, vi } from "vitest";
import { applyNetUserUpdate } from "../netUser.js";

describe("applyNetUserUpdate", () => {
  it("updates the net user and syncs the profile by default", () => {
    const net = { user: { username: "old" } };
    const syncMenuProfileBindingsFromState = vi.fn();
    const nextUser = { username: "new" };

    applyNetUserUpdate({ net, syncMenuProfileBindingsFromState }, nextUser);

    expect(net.user).toEqual(nextUser);
    expect(syncMenuProfileBindingsFromState).toHaveBeenCalledTimes(1);
  });

  it("updates the net user without syncing when disabled", () => {
    const net = { user: { username: "old" } };
    const syncMenuProfileBindingsFromState = vi.fn();
    const nextUser = { username: "new" };

    applyNetUserUpdate({ net, syncMenuProfileBindingsFromState }, nextUser, { syncProfile: false });

    expect(net.user).toEqual(nextUser);
    expect(syncMenuProfileBindingsFromState).not.toHaveBeenCalled();
  });
});
