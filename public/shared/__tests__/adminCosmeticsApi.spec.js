import { afterEach, describe, expect, it, vi } from "vitest";

describe("admin cosmetics api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // eslint-disable-next-line no-undef
    global.fetch = undefined;
  });

  it("loads the cosmetics config from the admin endpoint", async () => {
    const response = { ok: true, cosmetics: { icons: [] }, catalog: { icons: [] } };
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(response))
      })
    );
    // eslint-disable-next-line no-undef
    global.fetch = fetchMock;

    const { getCosmeticsConfig } = await import("../adminCosmeticsApi.js");
    const data = await getCosmeticsConfig();

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/cosmetics", {
      headers: { "Content-Type": "application/json" },
      method: "GET"
    });
    expect(data).toEqual(response);
  });

  it("saves cosmetics config with the expected payload", async () => {
    const response = { ok: true };
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(response))
      })
    );
    // eslint-disable-next-line no-undef
    global.fetch = fetchMock;

    const { saveCosmeticsConfig } = await import("../adminCosmeticsApi.js");
    await saveCosmeticsConfig({ icons: [{ id: "classic" }], trails: null, trailStyles: {} });

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/cosmetics", {
      headers: { "Content-Type": "application/json" },
      method: "PUT",
      body: JSON.stringify({ cosmetics: { icons: [{ id: "classic" }], trails: null, trailStyles: {} } })
    });
  });

  it("throws when the admin endpoint responds with an error", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ error: "invalid_payload" }))
      })
    );
    // eslint-disable-next-line no-undef
    global.fetch = fetchMock;

    const { getCosmeticsConfig } = await import("../adminCosmeticsApi.js");
    await expect(getCosmeticsConfig()).rejects.toThrow("invalid_payload");
  });
});
