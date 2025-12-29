package com.flappybingus.client;

import javafx.application.Platform;

public final class PlatformFxExecutor implements FxExecutor {
  @Override
  public void run(Runnable action) {
    Platform.runLater(action);
  }
}
