package com.flappybingus.client;

import java.awt.Desktop;
import java.io.IOException;
import java.net.URI;

public final class SystemDesktopFacade implements DesktopFacade {
  @Override
  public boolean isDesktopSupported() {
    return Desktop.isDesktopSupported();
  }

  @Override
  public boolean isBrowseSupported() {
    if (!isDesktopSupported()) {
      return false;
    }
    return Desktop.getDesktop().isSupported(Desktop.Action.BROWSE);
  }

  @Override
  public void browse(URI uri) throws IOException {
    Desktop.getDesktop().browse(uri);
  }
}
