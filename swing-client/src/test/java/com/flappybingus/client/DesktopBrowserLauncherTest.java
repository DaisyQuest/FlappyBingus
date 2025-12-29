package com.flappybingus.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.URI;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class DesktopBrowserLauncherTest {
  @Test
  void throwsWhenDesktopUnsupported() {
    DesktopFacade facade = new DesktopFacade() {
      @Override
      public boolean isDesktopSupported() {
        return false;
      }

      @Override
      public boolean isBrowseSupported() {
        return false;
      }

      @Override
      public void browse(URI uri) {
        throw new UnsupportedOperationException();
      }
    };

    DesktopBrowserLauncher launcher = new DesktopBrowserLauncher(facade);
    assertThrows(IllegalStateException.class, () -> launcher.open(URI.create("http://localhost")));
  }

  @Test
  void throwsWhenBrowseUnsupported() {
    DesktopFacade facade = new DesktopFacade() {
      @Override
      public boolean isDesktopSupported() {
        return true;
      }

      @Override
      public boolean isBrowseSupported() {
        return false;
      }

      @Override
      public void browse(URI uri) {
        throw new UnsupportedOperationException();
      }
    };

    DesktopBrowserLauncher launcher = new DesktopBrowserLauncher(facade);
    assertThrows(IllegalStateException.class, () -> launcher.open(URI.create("http://localhost")));
  }

  @Test
  void delegatesBrowse() {
    AtomicInteger calls = new AtomicInteger();
    DesktopFacade facade = new DesktopFacade() {
      @Override
      public boolean isDesktopSupported() {
        return true;
      }

      @Override
      public boolean isBrowseSupported() {
        return true;
      }

      @Override
      public void browse(URI uri) {
        calls.incrementAndGet();
        assertEquals("http://localhost", uri.toString());
      }
    };

    DesktopBrowserLauncher launcher = new DesktopBrowserLauncher(facade);
    launcher.open(URI.create("http://localhost"));
    assertEquals(1, calls.get());
  }
}
