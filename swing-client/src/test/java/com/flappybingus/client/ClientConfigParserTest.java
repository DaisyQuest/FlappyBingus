package com.flappybingus.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ClientConfigParserTest {
  @Test
  void usesDefaultsWhenNoArgs() {
    ClientConfigParser.ParseResult result = ClientConfigParser.parse(new String[0], Map.of());
    ClientConfig config = result.config();
    assertFalse(result.helpRequested());
    assertTrue(result.errors().isEmpty());
    assertEquals("http://localhost:3000", config.baseUrl());
    assertEquals("/", config.path());
    assertEquals(1280, config.width());
    assertEquals(720, config.height());
    assertEquals("FlappyBingus", config.title());
  }

  @Test
  void readsEnvironmentOverrides() {
    Map<String, String> env = new HashMap<>();
    env.put("FLAPPYBINGUS_SERVER_URL", "https://bingus.example.com");
    env.put("FLAPPYBINGUS_PATH", "/play");
    env.put("FLAPPYBINGUS_CLIENT_WIDTH", "900");
    env.put("FLAPPYBINGUS_CLIENT_HEIGHT", "700");
    env.put("FLAPPYBINGUS_CLIENT_TITLE", "Bingus Swing");

    ClientConfigParser.ParseResult result = ClientConfigParser.parse(new String[0], env);
    ClientConfig config = result.config();

    assertEquals("https://bingus.example.com", config.baseUrl());
    assertEquals("/play", config.path());
    assertEquals(900, config.width());
    assertEquals(700, config.height());
    assertEquals("Bingus Swing", config.title());
  }

  @Test
  void parsesCommandLineArgs() {
    String[] args = {
        "--server", "localhost:4000",
        "--path", "arena",
        "--width", "1440",
        "--height", "900",
        "--title", "Bingus Arena",
        "--fullscreen",
        "--no-menu"
    };

    ClientConfigParser.ParseResult result = ClientConfigParser.parse(args, Map.of());
    ClientConfig config = result.config();

    assertEquals("http://localhost:4000", config.baseUrl());
    assertEquals("arena", config.path());
    assertEquals(1440, config.width());
    assertEquals(900, config.height());
    assertEquals("Bingus Arena", config.title());
    assertTrue(config.fullscreen());
    assertFalse(config.showMenu());
  }

  @Test
  void returnsHelpRequested() {
    ClientConfigParser.ParseResult result = ClientConfigParser.parse(new String[] { "--help" }, Map.of());
    assertTrue(result.helpRequested());
    assertTrue(result.errors().isEmpty());
  }

  @Test
  void collectsErrorsForUnknownAndMissingValues() {
    ClientConfigParser.ParseResult result = ClientConfigParser.parse(new String[] { "--nope", "--width" }, Map.of());
    assertFalse(result.helpRequested());
    assertEquals(List.of("Unknown option: --nope", "Missing value for --width"), result.errors());
  }

  @Test
  void validatesDimensions() {
    ClientConfigParser.ParseResult result = ClientConfigParser.parse(new String[] { "--width", "-1", "--height", "abc" }, Map.of());
    assertEquals(List.of("Width must be a positive integer", "Height must be a positive integer"), result.errors());
  }

  @Test
  void flagsInvalidServer() {
    ClientConfigParser.ParseResult result = ClientConfigParser.parse(new String[] { "--server", "ftp://bad" }, Map.of());
    assertEquals(List.of("Server URL must start with http:// or https://"), result.errors());
  }

  @Test
  void reportsInvalidEnvironmentDimensions() {
    Map<String, String> env = new HashMap<>();
    env.put("FLAPPYBINGUS_CLIENT_WIDTH", "0");
    env.put("FLAPPYBINGUS_CLIENT_HEIGHT", "nope");

    ClientConfigParser.ParseResult result = ClientConfigParser.parse(new String[0], env);
    assertEquals(List.of(
        "FLAPPYBINGUS_CLIENT_WIDTH must be a positive integer",
        "FLAPPYBINGUS_CLIENT_HEIGHT must be a positive integer"
    ), result.errors());
  }
}
