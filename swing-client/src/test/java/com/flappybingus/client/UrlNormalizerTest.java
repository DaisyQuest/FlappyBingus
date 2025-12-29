package com.flappybingus.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class UrlNormalizerTest {
  @Test
  void normalizesHostWithoutScheme() {
    UrlNormalizer.NormalizedUrl normalized = UrlNormalizer.normalize("localhost:8080");
    assertEquals("http://localhost:8080", normalized.value());
  }

  @Test
  void trimsTrailingSlashWhenPathPresent() {
    UrlNormalizer.NormalizedUrl normalized = UrlNormalizer.normalize("https://example.com/game/");
    assertEquals("https://example.com/game", normalized.value());
  }

  @Test
  void preservesQueryAndFragment() {
    UrlNormalizer.NormalizedUrl normalized = UrlNormalizer.normalize("https://example.com/game?x=1#y");
    assertEquals("https://example.com/game?x=1#y", normalized.value());
  }

  @Test
  void rejectsEmptyInput() {
    assertThrows(IllegalArgumentException.class, () -> UrlNormalizer.normalize("  "));
  }

  @Test
  void rejectsInvalidScheme() {
    assertThrows(IllegalArgumentException.class, () -> UrlNormalizer.normalize("ftp://example.com"));
  }

  @Test
  void rejectsMissingHost() {
    assertThrows(IllegalArgumentException.class, () -> UrlNormalizer.normalize("http:///nope"));
  }
}
