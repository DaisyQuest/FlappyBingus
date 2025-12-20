import { afterEach, describe, expect, it, vi } from "vitest";

describe("api helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    // eslint-disable-next-line no-undef
    global.fetch = undefined;
  });

  it("requests the trail preview catalog", async () => {
    const mockResponse = { ok: true, previews: [{ id: "classic" }], count: 1 };
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })
    );
    // eslint-disable-next-line no-undef
    global.fetch = fetchMock;

    const { apiGetTrailPreviews } = await import("../api.js");
    const res = await apiGetTrailPreviews();

    expect(fetchMock).toHaveBeenCalledWith("/trail_previews", {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "GET"
    });
    expect(res).toEqual(mockResponse);
  });

  it("stops calling fetch when the client limit is exceeded", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true })
      })
    );
    // eslint-disable-next-line no-undef
    global.fetch = fetchMock;

    const { apiGetTrailPreviews } = await import("../api.js");
    let last = null;
    // Limit is 4; the 5th call should be rate limited client-side.
    for (let i = 0; i < 5; i += 1) {
      last = await apiGetTrailPreviews();
    }

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(last).toBeNull();
  });
});
