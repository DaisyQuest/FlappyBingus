package com.flappybingus.client;

import java.util.Map;

public final class SwingClient {
  private SwingClient() {}

  public static void main(String[] args) {
    ClientRunner runner = ClientRunner.createDefault();
    int exitCode = runner.run(args, System.getenv(), new SystemClientOutput(), new SwingWindowFactory());
    if (exitCode != 0) {
      System.exit(exitCode);
    }
  }
}
