package com.flappybingus.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ClientRunnerTest {
  @Test
  void printsUsageOnHelp() {
    RecordingOutput output = new RecordingOutput();
    RecordingWindowFactory factory = new RecordingWindowFactory();

    ClientRunner runner = ClientRunner.createDefault();
    int exitCode = runner.run(new String[] { "--help" }, Map.of(), output, factory);

    assertEquals(0, exitCode);
    assertTrue(output.outLines.get(0).contains("FlappyBingus Swing Client"));
    assertEquals(0, factory.created);
  }

  @Test
  void reportsErrorsAndSkipsWindowCreation() {
    RecordingOutput output = new RecordingOutput();
    RecordingWindowFactory factory = new RecordingWindowFactory();

    ClientRunner runner = ClientRunner.createDefault();
    int exitCode = runner.run(new String[] { "--server", "ftp://bad" }, Map.of(), output, factory);

    assertEquals(2, exitCode);
    assertTrue(output.errLines.stream().anyMatch(line -> line.contains("Server URL")));
    assertEquals(0, factory.created);
  }

  @Test
  void createsWindowWhenConfigValid() {
    RecordingOutput output = new RecordingOutput();
    RecordingWindowFactory factory = new RecordingWindowFactory();

    ClientRunner runner = ClientRunner.createDefault();
    int exitCode = runner.run(new String[] { "--server", "localhost:3000" }, Map.of(), output, factory);

    assertEquals(0, exitCode);
    assertEquals(1, factory.created);
    assertTrue(factory.lastConfig.baseUrl().contains("http://localhost:3000"));
  }

  @Test
  void printErrorsWritesAllMessages() {
    RecordingOutput output = new RecordingOutput();
    ClientRunner.printErrors(output, List.of("One", "Two"));

    assertEquals(List.of(
        "FlappyBingus Swing Client failed to start:",
        " - One",
        " - Two"
    ), output.errLines);
  }

  private static final class RecordingOutput implements ClientOutput {
    private final List<String> outLines = new ArrayList<>();
    private final List<String> errLines = new ArrayList<>();

    @Override
    public void println(String message) {
      outLines.add(message);
    }

    @Override
    public void errln(String message) {
      errLines.add(message);
    }
  }

  private static final class RecordingWindowFactory implements ClientWindowFactory {
    private int created = 0;
    private ClientConfig lastConfig;

    @Override
    public ClientWindow create(ClientConfig config) {
      created += 1;
      lastConfig = config;
      return () -> {};
    }
  }
}
