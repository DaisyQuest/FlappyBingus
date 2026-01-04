import { describe, expect, it } from "vitest";

import { normalizeIconCatalog } from "../iconCatalog.cjs";

describe("icon catalog", () => {
  it("accepts empty payloads", () => {
    const result = normalizeIconCatalog();
    expect(result.ok).toBe(true);
    expect(result.icons).toEqual([]);
  });

  it("rejects non-array payloads", () => {
    const result = normalizeIconCatalog({ icons: "bad" });
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toBe("icons_invalid");
  });

  it("reports invalid entries while keeping valid icons", () => {
    const result = normalizeIconCatalog({
      icons: [null, { id: "" }, { id: "alpha" }, { id: "alpha" }]
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(3);
    expect(result.icons).toHaveLength(1);
    expect(result.icons[0].id).toBe("alpha");
  });

  it("normalizes icon names and unlock defaults", () => {
    const result = normalizeIconCatalog({
      icons: [{ id: "beta", unlock: { type: "free" } }]
    });

    expect(result.ok).toBe(true);
    expect(result.icons[0].name).toBe("beta");
    expect(result.icons[0].unlock.type).toBe("free");
  });
});
