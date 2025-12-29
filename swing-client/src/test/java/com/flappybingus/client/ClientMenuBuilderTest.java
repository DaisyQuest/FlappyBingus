package com.flappybingus.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.concurrent.atomic.AtomicInteger;
import javax.swing.JMenu;
import javax.swing.JMenuBar;
import javax.swing.JMenuItem;
import org.junit.jupiter.api.Test;

class ClientMenuBuilderTest {
  @Test
  void buildsMenuAndWiresActions() {
    AtomicInteger reloads = new AtomicInteger();
    AtomicInteger externals = new AtomicInteger();
    AtomicInteger zoomIns = new AtomicInteger();
    AtomicInteger zoomOuts = new AtomicInteger();
    AtomicInteger zoomResets = new AtomicInteger();

    ClientActions actions = new ClientActions() {
      @Override
      public void reload() {
        reloads.incrementAndGet();
      }

      @Override
      public void openExternal() {
        externals.incrementAndGet();
      }

      @Override
      public void zoomIn() {
        zoomIns.incrementAndGet();
      }

      @Override
      public void zoomOut() {
        zoomOuts.incrementAndGet();
      }

      @Override
      public void resetZoom() {
        zoomResets.incrementAndGet();
      }
    };

    JMenuBar menuBar = ClientMenuBuilder.build(actions);

    JMenu gameMenu = menuBar.getMenu(0);
    JMenu viewMenu = menuBar.getMenu(1);
    assertNotNull(gameMenu);
    assertNotNull(viewMenu);

    JMenuItem reload = gameMenu.getItem(0);
    JMenuItem openExternal = gameMenu.getItem(1);
    JMenuItem zoomIn = viewMenu.getItem(0);
    JMenuItem zoomOut = viewMenu.getItem(1);
    JMenuItem resetZoom = viewMenu.getItem(2);

    reload.doClick();
    openExternal.doClick();
    zoomIn.doClick();
    zoomOut.doClick();
    resetZoom.doClick();

    assertEquals(1, reloads.get());
    assertEquals(1, externals.get());
    assertEquals(1, zoomIns.get());
    assertEquals(1, zoomOuts.get());
    assertEquals(1, zoomResets.get());
  }
}
