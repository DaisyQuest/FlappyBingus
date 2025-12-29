import { describe, expect, it } from "vitest";
import { renderReplayViewerPage } from "../replayViewerPage.cjs";

describe("renderReplayViewerPage", () => {
  it("renders username and watermark when enabled", () => {
    const html = renderReplayViewerPage({ username: "PlayerOne", watermarkEnabled: true });
    expect(html).toContain("Replay Viewer • PlayerOne");
    expect(html).toContain('value="PlayerOne"');
    expect(html).toContain("https://flappybing.us");
    expect(html).toContain("window.__REPLAY_VIEWER__");
    expect(html).toContain('"watermarkEnabled":true');
  });

  it("omits watermark when disabled and escapes usernames", () => {
    const html = renderReplayViewerPage({ username: "<script>", watermarkEnabled: false });
    expect(html).toContain('value="&lt;script&gt;"');
    expect(html).not.toContain("https://flappybing.us");
    expect(html).toContain('"watermarkEnabled":false');
  });
});
