package com.flappybingus.client;

public final class ClientUsage {
  private ClientUsage() {}

  public static String usage() {
    return String.join(System.lineSeparator(),
        "FlappyBingus Swing Client",
        "", 
        "Usage:",
        "  java -jar flappybingus-swing-client.jar [options]",
        "",
        "Options:",
        "  --server <url>       Base server URL (default: http://localhost:3000)",
        "  --path <path>        Path to load within the server (default: /)",
        "  --width <px>         Window width (default: 1280)",
        "  --height <px>        Window height (default: 720)",
        "  --title <text>       Window title (default: FlappyBingus)",
        "  --fullscreen         Start in fullscreen mode",
        "  --windowed           Start in windowed mode",
        "  --no-menu            Hide the menu bar",
        "  -h, --help           Show this help text",
        "",
        "Environment:",
        "  FLAPPYBINGUS_SERVER_URL   Default server URL",
        "  FLAPPYBINGUS_PATH         Default path",
        "  FLAPPYBINGUS_CLIENT_WIDTH Default width",
        "  FLAPPYBINGUS_CLIENT_HEIGHT Default height",
        "  FLAPPYBINGUS_CLIENT_TITLE Default window title"
    );
  }
}
