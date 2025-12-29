package com.flappybingus.client;

import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;

public final class JavaFxWebEngineFacade implements WebEngineFacade {
  private final WebEngine engine;
  private final WebView view;

  public JavaFxWebEngineFacade(WebView view) {
    this.view = view;
    this.engine = view.getEngine();
  }

  @Override
  public void load(String url) {
    engine.load(url);
  }

  @Override
  public void reload() {
    engine.reload();
  }

  @Override
  public void setZoom(double zoom) {
    view.setZoom(zoom);
  }
}
