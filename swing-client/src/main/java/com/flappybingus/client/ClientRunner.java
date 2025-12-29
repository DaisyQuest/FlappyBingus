package com.flappybingus.client;

import java.util.List;
import java.util.Map;

public final class ClientRunner {
  public int run(String[] args, Map<String, String> env, ClientOutput output, ClientWindowFactory windowFactory) {
    ClientConfigParser.ParseResult result = ClientConfigParser.parse(args, env);

    if (result.helpRequested()) {
      output.println(ClientUsage.usage());
      return 0;
    }

    if (!result.errors().isEmpty()) {
      output.errln("FlappyBingus Swing Client failed to start:");
      for (String error : result.errors()) {
        output.errln(" - " + error);
      }
      output.errln("");
      output.errln(ClientUsage.usage());
      return 2;
    }

    ClientConfig config = result.config();
    if (config == null) {
      output.errln("Configuration was not created.");
      return 2;
    }

    ClientWindow window = windowFactory.create(config);
    window.show();
    return 0;
  }

  public static ClientRunner createDefault() {
    return new ClientRunner();
  }

  public static void printErrors(ClientOutput output, List<String> errors) {
    output.errln("FlappyBingus Swing Client failed to start:");
    for (String error : errors) {
      output.errln(" - " + error);
    }
  }
}
