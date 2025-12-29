package com.flappybingus.client;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.net.URI;
import org.junit.jupiter.api.Test;

class ClientUrlsTest {
  @Test
  void buildsUriForRoot() {
    URI uri = ClientUrls.buildGameUri("http://localhost:3000", "/");
    assertEquals("http://localhost:3000/", uri.toString());
  }

  @Test
  void buildsUriForCustomPath() {
    URI uri = ClientUrls.buildGameUri("http://localhost:3000/base", "play");
    assertEquals("http://localhost:3000/play", uri.toString());
  }

  @Test
  void fallsBackToRootWhenPathBlank() {
    URI uri = ClientUrls.buildGameUri("http://localhost:3000", "   ");
    assertEquals("http://localhost:3000/", uri.toString());
  }
}
