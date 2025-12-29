import { describe, expect, it } from "vitest";
import { shouldAttemptReauth } from "../userHintRecovery.js";
import { SIGNED_OUT_TEXT } from "../userStatusCopy.js";

describe("user hint recovery", () => {
  it("returns false when reauth is in flight", () => {
    expect(shouldAttemptReauth({ hintText: SIGNED_OUT_TEXT, username: "PlayerOne", inFlight: true })).toBe(false);
  });

  it("returns false when the username is missing", () => {
    expect(shouldAttemptReauth({ hintText: SIGNED_OUT_TEXT, username: "", inFlight: false })).toBe(false);
  });

  it("returns false for non-signed-out hints", () => {
    expect(shouldAttemptReauth({ hintText: "Other", username: "PlayerOne", inFlight: false })).toBe(false);
  });

  it("returns true when signed out with a username", () => {
    expect(shouldAttemptReauth({ hintText: SIGNED_OUT_TEXT, username: "PlayerOne", inFlight: false })).toBe(true);
  });
});
