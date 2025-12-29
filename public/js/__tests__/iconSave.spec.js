import { describe, expect, it } from "vitest";
import { classifyIconSaveResponse } from "../iconSave.js";

describe("icon save response classifier", () => {
  it("treats missing responses as offline but keeps the equipped icon", () => {
    const result = classifyIconSaveResponse(null);
    expect(result).toEqual({
      outcome: "offline",
      online: false,
      revert: false,
      resetUser: false,
      needsReauth: false,
      message: "Server unavailable. Icon equipped locally."
    });
  });

  it("flags unauthorized saves so the UI can prompt re-authentication", () => {
    const res = { ok: false, status: 401, error: "unauthorized" };
    const result = classifyIconSaveResponse(res);
    expect(result.outcome).toBe("unauthorized");
    expect(result.resetUser).toBe(false);
    expect(result.needsReauth).toBe(true);
    expect(result.revert).toBe(true);
    expect(result.message).toMatch(/sign in/i);
  });

  it("treats 401s without explicit auth errors as generic failures", () => {
    const res = { ok: false, status: 401 };
    const result = classifyIconSaveResponse(res);
    expect(result.outcome).toBe("rejected");
    expect(result.resetUser).toBe(false);
    expect(result.needsReauth).toBe(false);
    expect(result.revert).toBe(true);
    expect(result.online).toBe(true);
  });

  it("reverts when the server reports a locked icon", () => {
    const res = { ok: false, status: 400, error: "icon_locked" };
    const result = classifyIconSaveResponse(res);
    expect(result.outcome).toBe("locked");
    expect(result.revert).toBe(true);
    expect(result.needsReauth).toBe(false);
    expect(result.online).toBe(true);
  });

  it("keeps the local choice when the backend is unavailable", () => {
    const res = { ok: false, status: 503, error: "database_unavailable" };
    const result = classifyIconSaveResponse(res);
    expect(result.outcome).toBe("server_error");
    expect(result.revert).toBe(false);
    expect(result.needsReauth).toBe(false);
    expect(result.online).toBe(false);
  });

  it("handles generic rejections separately from success", () => {
    const res = { ok: false, status: 400, error: "invalid_icon" };
    const result = classifyIconSaveResponse(res);
    expect(result.outcome).toBe("rejected");
    expect(result.revert).toBe(true);
    expect(result.needsReauth).toBe(false);
    expect(result.message).toContain("Could not save icon");
  });

  it("marks successful saves without requesting a revert", () => {
    const res = { ok: true, status: 200 };
    const result = classifyIconSaveResponse(res);
    expect(result.outcome).toBe("saved");
    expect(result.online).toBe(true);
    expect(result.revert).toBe(false);
    expect(result.needsReauth).toBe(false);
  });
});
