package com.flappybingus.client;

import java.net.URI;

public final class ClientUrls {
  private ClientUrls() {}

  public static URI buildGameUri(String baseUrl, String path) {
    String normalizedBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    String normalizedPath = (path == null || path.isBlank()) ? "/" : path.trim();
    if (!normalizedPath.startsWith("/")) {
      normalizedPath = "/" + normalizedPath;
    }
    URI base = URI.create(normalizedBase);
    return base.resolve(normalizedPath);
  }
}
