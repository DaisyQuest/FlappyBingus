package com.flappybingus.client;

import java.awt.BorderLayout;
import java.net.URI;
import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;
import javafx.application.Platform;
import javafx.embed.swing.JFXPanel;
import javafx.scene.Scene;
import javafx.scene.web.WebView;

public final class ClientFrame extends JFrame {
  private final ClientConfig config;
  private final BrowserLauncher browserLauncher;
  private final JFXPanel jfxPanel = new JFXPanel();
  private WebViewController webViewController;

  public ClientFrame(ClientConfig config, BrowserLauncher browserLauncher) {
    super(config.title());
    this.config = config;
    this.browserLauncher = browserLauncher;
    setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
    setSize(config.width(), config.height());
    setLayout(new BorderLayout());

    JPanel panel = new JPanel(new BorderLayout());
    panel.add(jfxPanel, BorderLayout.CENTER);
    add(panel, BorderLayout.CENTER);

    if (config.fullscreen()) {
      setExtendedState(JFrame.MAXIMIZED_BOTH);
    }

    initializeWebView();

    if (config.showMenu()) {
      setJMenuBar(ClientMenuBuilder.build(buildActions()));
    }
  }

  private void initializeWebView() {
    Platform.runLater(() -> {
      WebView webView = new WebView();
      WebEngineFacade engine = new JavaFxWebEngineFacade(webView);
      webViewController = new WebViewController(engine, new PlatformFxExecutor());
      Scene scene = new Scene(webView);
      jfxPanel.setScene(scene);
      URI gameUri = config.gameUri();
      webViewController.load(gameUri.toString());
    });
  }

  private ClientActions buildActions() {
    return new ClientActions() {
      @Override
      public void reload() {
        if (webViewController != null) {
          webViewController.reload();
        }
      }

      @Override
      public void openExternal() {
        browserLauncher.open(config.gameUri());
      }

      @Override
      public void zoomIn() {
        if (webViewController != null) {
          webViewController.zoomIn();
        }
      }

      @Override
      public void zoomOut() {
        if (webViewController != null) {
          webViewController.zoomOut();
        }
      }

      @Override
      public void resetZoom() {
        if (webViewController != null) {
          webViewController.resetZoom();
        }
      }
    };
  }

  public void dispatchWindowReady() {
    if (!SwingUtilities.isEventDispatchThread()) {
      throw new IllegalStateException("ClientFrame must be created on the Swing EDT.");
    }
  }
}
