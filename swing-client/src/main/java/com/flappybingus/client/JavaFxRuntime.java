package com.flappybingus.client;

import java.util.concurrent.atomic.AtomicBoolean;
import javafx.application.Platform;

public final class JavaFxRuntime {
  private static final AtomicBoolean INITIALIZED = new AtomicBoolean(false);

  private JavaFxRuntime() {}

  public static void ensureInitialized() {
    if (INITIALIZED.compareAndSet(false, true)) {
      Platform.startup(() -> {
        // initialize JavaFX toolkit
      });
      Platform.setImplicitExit(false);
    }
  }
}
