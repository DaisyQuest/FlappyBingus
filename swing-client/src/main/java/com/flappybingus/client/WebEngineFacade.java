package com.flappybingus.client;

public interface WebEngineFacade {
  void load(String url);

  void reload();

  void setZoom(double zoom);
}
