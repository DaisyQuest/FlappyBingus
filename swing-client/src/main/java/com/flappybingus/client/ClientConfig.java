package com.flappybingus.client;

import java.net.URI;
import java.util.Objects;

public record ClientConfig(
    String baseUrl,
    String path,
    int width,
    int height,
    String title,
    boolean fullscreen,
    boolean showMenu
) {
  public ClientConfig {
    Objects.requireNonNull(baseUrl, "baseUrl");
    Objects.requireNonNull(path, "path");
    Objects.requireNonNull(title, "title");
    if (width <= 0) {
      throw new IllegalArgumentException("width must be positive");
    }
    if (height <= 0) {
      throw new IllegalArgumentException("height must be positive");
    }
  }

  public URI gameUri() {
    return ClientUrls.buildGameUri(baseUrl, path);
  }
}
