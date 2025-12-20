import { describe, expect, it } from "vitest";
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
  });
});
