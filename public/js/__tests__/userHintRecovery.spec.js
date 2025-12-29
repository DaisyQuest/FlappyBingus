import { describe, expect, it } from "vitest";
import {
  resolveReauthUsername,
  shouldUpdateTrailHint,
  shouldAttemptReauth,
  shouldAttemptReauthForGuestHint
} from "../userHintRecovery.js";
import { GUEST_TRAIL_HINT_TEXT } from "../trailHint.js";
import { SIGNED_OUT_TEXT } from "../userStatusCopy.js";

describe("user hint recovery", () => {
  it("prefers the input username when resolving reauth", () => {
    expect(resolveReauthUsername({ inputValue: "  PlayerOne  ", sessionUsername: "SessionUser" })).toBe("PlayerOne");
  });

  it("falls back to the session username when the input is empty", () => {
    expect(resolveReauthUsername({ inputValue: " ", sessionUsername: "SessionUser" })).toBe("SessionUser");
  });

  it("returns an empty username when no valid values exist", () => {
    expect(resolveReauthUsername({ inputValue: null, sessionUsername: undefined })).toBe("");
  });

  it("updates trail hints when no current value exists", () => {
    expect(shouldUpdateTrailHint({ currentText: null, nextText: "Next" })).toBe(true);
  });

  it("does not update trail hints when next text is empty", () => {
    expect(shouldUpdateTrailHint({ currentText: "Current", nextText: "" })).toBe(false);
  });

  it("does not update trail hints when text is unchanged", () => {
    expect(shouldUpdateTrailHint({ currentText: "Same", nextText: "Same" })).toBe(false);
  });

  it("updates trail hints when the text changes", () => {
    expect(shouldUpdateTrailHint({ currentText: "Old", nextText: "New" })).toBe(true);
  });

  it("returns false when reauth is in flight", () => {
    expect(shouldAttemptReauth({ hintText: SIGNED_OUT_TEXT, username: "PlayerOne", inFlight: true })).toBe(false);
  });

  it("returns false when the username is missing", () => {
    expect(shouldAttemptReauth({ hintText: SIGNED_OUT_TEXT, username: "", inFlight: false })).toBe(false);
  });

  it("returns false when the username is only whitespace", () => {
    expect(shouldAttemptReauth({ hintText: SIGNED_OUT_TEXT, username: "   ", inFlight: false })).toBe(false);
  });

  it("returns false for non-signed-out hints", () => {
    expect(shouldAttemptReauth({ hintText: "Other", username: "PlayerOne", inFlight: false })).toBe(false);
  });

  it("returns true when signed out with a username", () => {
    expect(shouldAttemptReauth({ hintText: SIGNED_OUT_TEXT, username: "PlayerOne", inFlight: false })).toBe(true);
  });

  it("returns true when the guest trail hint is shown with a username", () => {
    expect(shouldAttemptReauthForGuestHint({
      hintText: GUEST_TRAIL_HINT_TEXT,
      username: "PlayerOne",
      inFlight: false
    })).toBe(true);
  });

  it("returns false when guest reauth is in flight", () => {
    expect(shouldAttemptReauthForGuestHint({
      hintText: GUEST_TRAIL_HINT_TEXT,
      username: "PlayerOne",
      inFlight: true
    })).toBe(false);
  });

  it("returns false when the guest trail hint is shown without a username", () => {
    expect(shouldAttemptReauthForGuestHint({
      hintText: GUEST_TRAIL_HINT_TEXT,
      username: "",
      inFlight: false
    })).toBe(false);
  });
});
