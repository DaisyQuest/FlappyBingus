import { describe, expect, it, vi } from "vitest";
import { recoverUserFromUsername } from "../sessionRecovery.js";

describe("session recovery", () => {
  it("returns false when no username is provided", async () => {
    const register = vi.fn();
    const result = await recoverUserFromUsername({ username: "", register });
    expect(result).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it("returns false when registration fails", async () => {
    const register = vi.fn(async () => ({ ok: false }));
    const onSuccess = vi.fn();
    const result = await recoverUserFromUsername({ username: "PlayerOne", register, onSuccess });
    expect(result).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("invokes onSuccess when registration succeeds", async () => {
    const register = vi.fn(async () => ({ ok: true, user: { username: "PlayerOne" } }));
    const onSuccess = vi.fn();
    const result = await recoverUserFromUsername({ username: "PlayerOne", register, onSuccess });
    expect(result).toBe(true);
    expect(onSuccess).toHaveBeenCalledWith({ ok: true, user: { username: "PlayerOne" } });
  });
});
