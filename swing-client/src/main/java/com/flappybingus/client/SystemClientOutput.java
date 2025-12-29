package com.flappybingus.client;

public final class SystemClientOutput implements ClientOutput {
  @Override
  public void println(String message) {
    System.out.println(message);
  }

  @Override
  public void errln(String message) {
    System.err.println(message);
  }
}
