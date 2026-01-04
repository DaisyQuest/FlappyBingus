import { describe, expect, it } from "vitest";
import { buildBaseIcons as buildServerIcons } from "../services/iconRegistry.cjs";
import { buildBaseIcons as buildClientIcons } from "../public/js/iconRegistry.js";

describe("icon registry parity", () => {
  it("keeps server and client icon definitions aligned", () => {
    expect(buildClientIcons()).toEqual(buildServerIcons());
  });
});
