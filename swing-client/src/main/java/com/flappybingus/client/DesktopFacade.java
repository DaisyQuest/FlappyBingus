package com.flappybingus.client;

import java.net.URI;

public interface DesktopFacade {
  boolean isDesktopSupported();

  boolean isBrowseSupported();

  void browse(URI uri) throws Exception;
}
