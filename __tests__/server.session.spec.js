"use strict";

import { beforeAll, describe, expect, it } from "vitest";

let testables;

beforeAll(async () => {
  const server = await import("../server.cjs");
  testables = server.__testables;
});

describe("session tokens", () => {
  it("returns null when signing without a subject", () => {
    expect(testables.signSessionToken({})).toBeNull();
  });

  it("rejects missing or malformed tokens", () => {
    expect(testables.verifySessionToken(null).error).toBe("missing");
    expect(testables.verifySessionToken("not-a-token").error).toBe("invalid");
    expect(testables.verifySessionToken("a.b.c").error).toBe("invalid");
  });

  it("rejects invalid signatures", () => {
    const token = testables.signSessionToken({ sub: "PlayerOne" }, { secret: "secret-a", nowMs: Date.now() });
    const res = testables.verifySessionToken(token, { secret: "secret-b" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("invalid");
  });

  it("rejects expired sessions", () => {
    const nowMs = Date.now();
    const exp = Math.floor(nowMs / 1000) - 1;
    const token = testables.signSessionToken({ sub: "PlayerOne", exp }, { nowMs });
    const res = testables.verifySessionToken(token, { nowMs });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("expired");
  });

  it("round-trips base64url helpers", () => {
    const encoded = testables.base64UrlEncode("bingus");
    expect(testables.base64UrlDecode(encoded)).toBe("bingus");
  });

  it("builds session payloads for responses", () => {
    const payload = testables.buildSessionPayload("PlayerOne");
    expect(payload.sessionToken).toMatch(/^\S+\.\S+\.\S+$/);
  });
});
