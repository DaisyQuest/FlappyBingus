import { describe, expect, it } from "vitest";
import { ADSENSE_CLIENT_ID, ADSENSE_LOADER_SRC } from "../adsense.cjs";
import { renderTrailPreviewPage, wantsPreviewHtml } from "../trailPreviewPage.cjs";

describe("trailPreviewPage", () => {
  describe("wantsPreviewHtml", () => {
    it("respects explicit format query parameters", () => {
      expect(wantsPreviewHtml({ formatParam: "html" })).toBe(true);
      expect(wantsPreviewHtml({ formatParam: "json" })).toBe(false);
    });

    it("falls back to the Accept header when no format is supplied", () => {
      expect(wantsPreviewHtml({ acceptHeader: "text/html" })).toBe(true);
      expect(wantsPreviewHtml({ acceptHeader: "application/json" })).toBe(false);
      expect(wantsPreviewHtml({})).toBe(false);
    });

    it("treats format and accept headers case-insensitively", () => {
      expect(wantsPreviewHtml({ formatParam: "HTML" })).toBe(true);
      expect(wantsPreviewHtml({ formatParam: "JsOn" })).toBe(false);
      expect(wantsPreviewHtml({ acceptHeader: "application/json, TEXT/HTML;q=0.9" })).toBe(true);
    });
  });

  describe("renderTrailPreviewPage", () => {
    it("renders a preview card for each entry", () => {
      const html = renderTrailPreviewPage({
        generatedAt: "2024-01-01T00:00:00.000Z",
        previews: [
          { id: "classic", name: "Classic", minScore: 0, previewSeed: "trail-preview-classic" },
          { id: "aurora", name: "Aurora", minScore: 700, previewSeed: "trail-preview-aurora" }
        ]
      });

      expect(html).toContain("Trail Previews");
      expect(html).toContain("Generated at 2024-01-01T00:00:00.000Z");
      expect(html).toContain('data-trail-id="classic"');
      expect(html).toContain('data-trail-id="aurora"');
      expect(html).toContain("Unlocks at 700 score");
      expect(html).toContain("trail-preview-aurora");
      expect(html).toContain(ADSENSE_LOADER_SRC);
      expect(html).toContain(`data-adsense-client=\"${ADSENSE_CLIENT_ID}\"`);
    });

    it("escapes any unsafe characters in the page", () => {
      const html = renderTrailPreviewPage({
        previews: [{ id: '"><svg onload=alert(1)>', name: "<b>Bad</b>", minScore: 5 }]
      });

      expect(html).not.toContain("<svg onload");
      expect(html).toContain("&lt;b&gt;Bad&lt;/b&gt;");
    });

    it("serializes the previews for the client script to draw canvases", () => {
      const html = renderTrailPreviewPage({
        previews: [{ id: "ember", name: "Ember", minScore: 1000 }]
      });

      expect(html).toContain('data-preview-index="0"');
      expect(html).toContain('new TrailPreview({ canvas })');
      expect(html).toContain('"id":"ember"');
    });

    it("renders an empty state when no previews are available", () => {
      const html = renderTrailPreviewPage({ previews: [] });

      expect(html).toContain("No trail previews are available.");
      expect(html).toContain("const previews = []");
    });

    it("defaults missing fields and escapes serialized content safely", () => {
      const html = renderTrailPreviewPage({
        generatedAt: "2024-01-02",
        previews: [
          { name: "Trail & Co.", minScore: NaN, previewSeed: "<seed>" },
          { id: "", name: "", previewSeed: "" }
        ]
      });

      expect(html).toContain("Trail &amp; Co.");
      expect(html).toContain("Unlocks at 0 score");
      expect(html).toContain("trail-preview-trail-2");
      expect(html).toContain("\\u003cseed\\u003e");
      expect(html).toContain('"minScore":0');
    });
  });
});
