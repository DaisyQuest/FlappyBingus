import { describe, it, expect } from "vitest";
import { getAuthStatusFromResponse } from "../authResponse.js";

describe("authResponse", () => {
  it("treats missing responses as offline without unauthorized reset", () => {
    expect(getAuthStatusFromResponse(null)).toEqual({ online: false, unauthorized: false });
  });

  it("flags unauthorized responses while keeping online true", () => {
    expect(getAuthStatusFromResponse({ status: 401 })).toEqual({ online: true, unauthorized: true });
  });

  it("keeps online true for other client errors", () => {
    expect(getAuthStatusFromResponse({ status: 400 })).toEqual({ online: true, unauthorized: false });
    expect(getAuthStatusFromResponse({ status: 404 })).toEqual({ online: true, unauthorized: false });
  });

  it("marks server failures as offline", () => {
    expect(getAuthStatusFromResponse({ status: 500 })).toEqual({ online: false, unauthorized: false });
    expect(getAuthStatusFromResponse({ status: 503 })).toEqual({ online: false, unauthorized: false });
  });

  it("handles missing status values as offline without unauthorized", () => {
    expect(getAuthStatusFromResponse({})).toEqual({ online: false, unauthorized: false });
    expect(getAuthStatusFromResponse({ status: undefined })).toEqual({ online: false, unauthorized: false });
  });
});
