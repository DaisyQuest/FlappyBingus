package com.flappybingus.client;

import java.awt.event.KeyEvent;
import javax.swing.JMenu;
import javax.swing.JMenuBar;
import javax.swing.JMenuItem;
import javax.swing.KeyStroke;

public final class ClientMenuBuilder {
  private ClientMenuBuilder() {}

  public static JMenuBar build(ClientActions actions) {
    JMenuBar menuBar = new JMenuBar();

    JMenu gameMenu = new JMenu("Game");
    JMenuItem reload = new JMenuItem("Reload");
    reload.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_R, KeyEvent.CTRL_DOWN_MASK));
    reload.addActionListener(event -> actions.reload());

    JMenuItem openExternal = new JMenuItem("Open in Browser");
    openExternal.addActionListener(event -> actions.openExternal());

    gameMenu.add(reload);
    gameMenu.add(openExternal);

    JMenu viewMenu = new JMenu("View");
    JMenuItem zoomIn = new JMenuItem("Zoom In");
    zoomIn.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_EQUALS, KeyEvent.CTRL_DOWN_MASK));
    zoomIn.addActionListener(event -> actions.zoomIn());

    JMenuItem zoomOut = new JMenuItem("Zoom Out");
    zoomOut.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_MINUS, KeyEvent.CTRL_DOWN_MASK));
    zoomOut.addActionListener(event -> actions.zoomOut());

    JMenuItem resetZoom = new JMenuItem("Reset Zoom");
    resetZoom.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_0, KeyEvent.CTRL_DOWN_MASK));
    resetZoom.addActionListener(event -> actions.resetZoom());

    viewMenu.add(zoomIn);
    viewMenu.add(zoomOut);
    viewMenu.add(resetZoom);

    menuBar.add(gameMenu);
    menuBar.add(viewMenu);

    return menuBar;
  }
}
