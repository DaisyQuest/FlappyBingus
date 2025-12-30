import { createReplayViewerApp } from "./replayViewerApp.js";

const app = createReplayViewerApp();
app.init().catch((err) => {
  console.error(err);
  app.setStatus?.("Replay viewer failed to initialize.", { tone: "bad" });
});
