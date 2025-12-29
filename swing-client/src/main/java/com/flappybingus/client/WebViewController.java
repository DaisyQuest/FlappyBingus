package com.flappybingus.client;

public final class WebViewController {
  private final WebEngineFacade engine;
  private final FxExecutor executor;
  private double zoom = 1.0;

  public WebViewController(WebEngineFacade engine, FxExecutor executor) {
    this.engine = engine;
    this.executor = executor;
  }

  public void load(String url) {
    executor.run(() -> engine.load(url));
  }

  public void reload() {
    executor.run(engine::reload);
  }

  public void zoomIn() {
    updateZoom(zoom + 0.1);
  }

  public void zoomOut() {
    updateZoom(Math.max(0.2, zoom - 0.1));
  }

  public void resetZoom() {
    updateZoom(1.0);
  }

  private void updateZoom(double value) {
    zoom = value;
    double appliedZoom = zoom;
    executor.run(() -> engine.setZoom(appliedZoom));
  }
}
