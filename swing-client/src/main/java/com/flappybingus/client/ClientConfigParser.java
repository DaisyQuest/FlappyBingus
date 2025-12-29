package com.flappybingus.client;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

public final class ClientConfigParser {
  public static final int DEFAULT_WIDTH = 1280;
  public static final int DEFAULT_HEIGHT = 720;
  public static final String DEFAULT_TITLE = "FlappyBingus";
  public static final String DEFAULT_PATH = "/";
  public static final String DEFAULT_SERVER = "http://localhost:3000";

  private ClientConfigParser() {}

  public static ParseResult parse(String[] args, Map<String, String> env) {
    List<String> errors = new ArrayList<>();
    String server = env.getOrDefault("FLAPPYBINGUS_SERVER_URL", DEFAULT_SERVER);
    String title = env.getOrDefault("FLAPPYBINGUS_CLIENT_TITLE", DEFAULT_TITLE);
    String path = env.getOrDefault("FLAPPYBINGUS_PATH", DEFAULT_PATH);
    int width = parsePositiveInt(env.get("FLAPPYBINGUS_CLIENT_WIDTH"), DEFAULT_WIDTH, "FLAPPYBINGUS_CLIENT_WIDTH", errors);
    int height = parsePositiveInt(env.get("FLAPPYBINGUS_CLIENT_HEIGHT"), DEFAULT_HEIGHT, "FLAPPYBINGUS_CLIENT_HEIGHT", errors);
    boolean fullscreen = false;
    boolean showMenu = true;
    boolean helpRequested = false;

    if (args != null) {
      List<String> argList = new ArrayList<>(Arrays.asList(args));
      for (int i = 0; i < argList.size(); i++) {
        String arg = argList.get(i);
        switch (arg) {
          case "--help":
          case "-h":
            helpRequested = true;
            break;
          case "--server":
            String serverValue = readValue(argList, ++i, "--server", errors);
            if (serverValue != null) {
              server = serverValue;
            }
            break;
          case "--path":
            String pathValue = readValue(argList, ++i, "--path", errors);
            if (pathValue != null) {
              path = pathValue;
            }
            break;
          case "--width":
            String widthValue = readValue(argList, ++i, "--width", errors);
            if (widthValue != null) {
              Integer parsedWidth = parsePositiveInt(widthValue, null, "Width", errors);
              if (parsedWidth != null) {
                width = parsedWidth;
              }
            }
            break;
          case "--height":
            String heightValue = readValue(argList, ++i, "--height", errors);
            if (heightValue != null) {
              Integer parsedHeight = parsePositiveInt(heightValue, null, "Height", errors);
              if (parsedHeight != null) {
                height = parsedHeight;
              }
            }
            break;
          case "--title":
            String titleValue = readValue(argList, ++i, "--title", errors);
            if (titleValue != null) {
              title = titleValue;
            }
            break;
          case "--fullscreen":
            fullscreen = true;
            break;
          case "--windowed":
            fullscreen = false;
            break;
          case "--no-menu":
            showMenu = false;
            break;
          default:
            errors.add("Unknown option: " + arg);
            break;
        }
      }
    }

    if (helpRequested) {
      return new ParseResult(null, true, List.of());
    }

    try {
      server = UrlNormalizer.normalize(server).value();
    } catch (IllegalArgumentException ex) {
      errors.add(ex.getMessage());
    }

    if (path == null || path.isBlank()) {
      path = DEFAULT_PATH;
    }

    if (!errors.isEmpty()) {
      return new ParseResult(null, false, List.copyOf(errors));
    }

    ClientConfig config = new ClientConfig(server, path, width, height, title, fullscreen, showMenu);
    return new ParseResult(config, false, List.of());
  }

  private static String readValue(List<String> args, int index, String flag, List<String> errors) {
    if (index >= args.size()) {
      errors.add("Missing value for " + flag);
      return null;
    }
    String value = args.get(index);
    if (value.startsWith("--")) {
      errors.add("Missing value for " + flag);
      return null;
    }
    return value;
  }

  private static Integer parsePositiveInt(String raw, Integer fallback, String label, List<String> errors) {
    if (raw == null) {
      return fallback;
    }
    try {
      int value = Integer.parseInt(raw.trim());
      if (value <= 0) {
        errors.add(label + " must be a positive integer");
        return fallback;
      }
      return value;
    } catch (NumberFormatException ex) {
      errors.add(label + " must be a positive integer");
      return fallback;
    }
  }

  public record ParseResult(ClientConfig config, boolean helpRequested, List<String> errors) {}
}
