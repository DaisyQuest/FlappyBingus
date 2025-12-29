package com.flappybingus.client;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class WebViewControllerTest {
  @Test
  void delegatesLoadReloadAndZoom() {
    RecordingEngine engine = new RecordingEngine();
    RecordingExecutor executor = new RecordingExecutor();
    WebViewController controller = new WebViewController(engine, executor);

    controller.load("http://localhost");
    controller.reload();
    controller.zoomIn();
    controller.zoomOut();
    controller.resetZoom();

    executor.runAll();

    assertEquals(List.of(
        "load:http://localhost",
        "reload",
        "zoom:1.1",
        "zoom:1.0",
        "zoom:1.0"
    ), engine.actions);
  }

  @Test
  void clampsZoomOut() {
    RecordingEngine engine = new RecordingEngine();
    RecordingExecutor executor = new RecordingExecutor();
    WebViewController controller = new WebViewController(engine, executor);

    for (int i = 0; i < 20; i++) {
      controller.zoomOut();
    }

    executor.runAll();

    assertEquals("zoom:0.2", engine.actions.get(engine.actions.size() - 1));
  }

  private static final class RecordingExecutor implements FxExecutor {
    private final List<Runnable> actions = new ArrayList<>();

    @Override
    public void run(Runnable action) {
      actions.add(action);
    }

    void runAll() {
      actions.forEach(Runnable::run);
      actions.clear();
    }
  }

  private static final class RecordingEngine implements WebEngineFacade {
    private final List<String> actions = new ArrayList<>();

    @Override
    public void load(String url) {
      actions.add("load:" + url);
    }

    @Override
    public void reload() {
      actions.add("reload");
    }

    @Override
    public void setZoom(double zoom) {
      actions.add(String.format("zoom:%.1f", zoom));
    }
  }
}
