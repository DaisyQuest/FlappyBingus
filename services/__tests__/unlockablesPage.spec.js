import { describe, expect, it } from "vitest";
import { ADSENSE_CLIENT_ID, ADSENSE_LOADER_SRC } from "../adsense.cjs";
import { renderUnlockablesPage, wantsUnlockablesHtml } from "../unlockablesPage.cjs";

const baseUnlockables = [
  { id: "trail_b", name: "Beta Trail", type: "trail", unlock: { label: "Score 10" } },
  { id: "icon_a", name: "Alpha Icon", type: "player_texture", unlock: { label: "Score 2" } },
  { id: "icon_c", name: "Charlie Icon", type: "player_texture", unlock: { label: "Score 5" } }
];

describe("unlockables page helpers", () => {
  it("respects format parameters and accept headers", () => {
    expect(wantsUnlockablesHtml({ formatParam: "html" })).toBe(true);
    expect(wantsUnlockablesHtml({ formatParam: "json" })).toBe(false);
    expect(wantsUnlockablesHtml({ acceptHeader: "application/json" })).toBe(false);
    expect(wantsUnlockablesHtml({ acceptHeader: "text/html,application/xhtml+xml" })).toBe(true);
  });

  it("treats format parameters case-insensitively", () => {
    expect(wantsUnlockablesHtml({ formatParam: "HTML" })).toBe(true);
    expect(wantsUnlockablesHtml({ formatParam: "Json" })).toBe(false);
  });

  it("renders sorted, escaped unlockables cards", () => {
    const html = renderUnlockablesPage({
      unlockables: [...baseUnlockables, { id: "<weird>", name: "<Script>", type: "trail", unlock: { label: "<Unlock>" } }],
      generatedAt: "2024-01-01T00:00:00.000Z"
    });

    const alphaIndex = html.indexOf("Alpha Icon");
    const charlieIndex = html.indexOf("Charlie Icon");
    const betaIndex = html.indexOf("Beta Trail");
    expect(alphaIndex).toBeGreaterThan(-1);
    expect(charlieIndex).toBeGreaterThan(alphaIndex);
    expect(betaIndex).toBeGreaterThan(charlieIndex);

    expect(html).toContain("Generated at 2024-01-01T00:00:00.000Z");
    expect(html).toContain("&lt;Script&gt;");
    expect(html).toContain("data-unlockable-id=\"&lt;weird&gt;\"");
    expect(html).toContain("\\u003c");
    expect(html).toContain(ADSENSE_LOADER_SRC);
    expect(html).toContain(`data-adsense-client=\"${ADSENSE_CLIENT_ID}\"`);
  });

  it("uses default values when fields are missing", () => {
    const html = renderUnlockablesPage({
      unlockables: [{ id: "", name: "", type: "", unlock: {} }],
      generatedAt: "2024-01-02T00:00:00.000Z"
    });

    expect(html).toContain("Generated at 2024-01-02T00:00:00.000Z");
    expect(html).toContain("Unlockable");
    expect(html).toContain("unknown");
  });

  it("serializes icons and pipe textures for the client script", () => {
    const html = renderUnlockablesPage({
      unlockables: baseUnlockables,
      icons: [{ id: "<icon>" }],
      pipeTextures: [{ id: "<pipe>" }]
    });

    expect(html).toContain("const icons =");
    expect(html).toContain("const pipeTextures =");
    expect(html).toContain("\\u003cicon\\u003e");
    expect(html).toContain("\\u003cpipe\\u003e");
  });

  it("handles non-array unlockable inputs safely", () => {
    const html = renderUnlockablesPage({ unlockables: "bad" });
    expect(html).toContain("No unlockables are available");
  });

  it("renders an empty state when no unlockables are available", () => {
    const html = renderUnlockablesPage({ unlockables: [] });
    expect(html).toContain("No unlockables are available");
  });
});
