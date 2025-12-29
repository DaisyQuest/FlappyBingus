package com.flappybingus.client;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ClientUsageTest {
  @Test
  void includesKeyFlagsAndEnv() {
    String usage = ClientUsage.usage();
    assertTrue(usage.contains("--server"));
    assertTrue(usage.contains("--fullscreen"));
    assertTrue(usage.contains("FLAPPYBINGUS_SERVER_URL"));
  }
}
