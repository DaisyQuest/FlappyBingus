package com.flappybingus.client;

import javax.swing.SwingUtilities;

public final class SwingWindowFactory implements ClientWindowFactory {
  @Override
  public ClientWindow create(ClientConfig config) {
    return new SwingClientWindow(config);
  }

  private static final class SwingClientWindow implements ClientWindow {
    private final ClientConfig config;

    private SwingClientWindow(ClientConfig config) {
      this.config = config;
    }

    @Override
    public void show() {
      JavaFxRuntime.ensureInitialized();
      SwingUtilities.invokeLater(() -> {
        ClientFrame frame = new ClientFrame(config, new DesktopBrowserLauncher());
        frame.setVisible(true);
      });
    }
  }
}
