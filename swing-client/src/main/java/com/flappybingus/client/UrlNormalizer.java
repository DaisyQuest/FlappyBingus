package com.flappybingus.client;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Objects;

public final class UrlNormalizer {
  private UrlNormalizer() {}

  public static NormalizedUrl normalize(String input) {
    if (input == null || input.trim().isEmpty()) {
      throw new IllegalArgumentException("Server URL is required");
    }
    String candidate = input.trim();
    if (!candidate.contains("://")) {
      candidate = "http://" + candidate;
    }
    URI uri;
    try {
      uri = new URI(candidate);
    } catch (URISyntaxException ex) {
      throw new IllegalArgumentException("Invalid server URL: " + input, ex);
    }
    String scheme = uri.getScheme();
    if (!Objects.equals(scheme, "http") && !Objects.equals(scheme, "https")) {
      throw new IllegalArgumentException("Server URL must start with http:// or https://");
    }
    if (uri.getHost() == null || uri.getHost().isBlank()) {
      throw new IllegalArgumentException("Server URL must include a host");
    }
    String path = uri.getPath();
    if (path != null && path.length() > 1 && path.endsWith("/")) {
      path = path.substring(0, path.length() - 1);
    }
    try {
      URI normalized = new URI(
          scheme,
          uri.getUserInfo(),
          uri.getHost(),
          uri.getPort(),
          path,
          uri.getQuery(),
          uri.getFragment()
      );
      return new NormalizedUrl(normalized.toString());
    } catch (URISyntaxException ex) {
      throw new IllegalArgumentException("Invalid server URL: " + input, ex);
    }
  }

  public record NormalizedUrl(String value) {}
}
