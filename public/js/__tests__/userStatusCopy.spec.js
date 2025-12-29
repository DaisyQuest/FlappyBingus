import { describe, expect, it } from "vitest";
import { OFFLINE_HINT_TEXT, OFFLINE_STATUS_TEXT, SIGNED_OUT_TEXT } from "../userStatusCopy.js";

describe("user status copy", () => {
  it("provides offline and signed-out messaging", () => {
    expect(OFFLINE_STATUS_TEXT).toMatch(/offline/i);
    expect(OFFLINE_HINT_TEXT).toMatch(/offline/i);
    expect(SIGNED_OUT_TEXT).toMatch(/signed out/i);
  });
});
