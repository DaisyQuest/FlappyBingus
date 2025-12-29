package com.flappybingus.client;

import java.net.URI;

public final class DesktopBrowserLauncher implements BrowserLauncher {
  private final DesktopFacade desktopFacade;

  public DesktopBrowserLauncher() {
    this(new SystemDesktopFacade());
  }

  DesktopBrowserLauncher(DesktopFacade desktopFacade) {
    this.desktopFacade = desktopFacade;
  }

  @Override
  public void open(URI uri) {
    if (!desktopFacade.isDesktopSupported()) {
      throw new IllegalStateException("Desktop browsing is not supported on this platform.");
    }
    if (!desktopFacade.isBrowseSupported()) {
      throw new IllegalStateException("Desktop browsing is not supported on this platform.");
    }
    try {
      desktopFacade.browse(uri);
    } catch (Exception ex) {
      throw new IllegalStateException("Unable to open browser for " + uri, ex);
    }
  }
}
