package com.flappybingus.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.URI;
import org.junit.jupiter.api.Test;

class ClientConfigTest {
  @Test
  void buildsGameUriFromConfig() {
    ClientConfig config = new ClientConfig("http://localhost:3000", "/", 800, 600, "Bingus", false, true);
    URI uri = config.gameUri();
    assertEquals("http://localhost:3000/", uri.toString());
  }

  @Test
  void rejectsNonPositiveWidth() {
    assertThrows(IllegalArgumentException.class,
        () -> new ClientConfig("http://localhost:3000", "/", 0, 600, "Bingus", false, true));
  }

  @Test
  void rejectsNonPositiveHeight() {
    assertThrows(IllegalArgumentException.class,
        () -> new ClientConfig("http://localhost:3000", "/", 800, -1, "Bingus", false, true));
  }
}
