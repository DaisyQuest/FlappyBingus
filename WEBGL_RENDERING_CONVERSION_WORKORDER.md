# WEBGL_RENDERING_CONVERSION — Work Order

**Status:** In Progress

## Council Decision Summary

A full WebGL conversion of the rendering pipeline is **not recommended at this time** because:
- The performance bottleneck has not been profiled/confirmed to be the Canvas 2D renderer
- Scope is extremely large (86 KB game.js + dozen rendering files, all tests invalidated)
- Risk of regression is very high
- Better-targeted improvements exist within the existing Canvas 2D pipeline

The correct response to "computers aren't running it well" is targeted Canvas 2D performance improvements and profiling guidance, not a full renderer swap.

---

## Tasks

- [x] Investigate current rendering architecture
- [x] Council meeting held (see webgl_rendering_conversion_meeting1.md)
- [ ] Document performance improvement recommendations in-code comments or README
- [ ] Apply targeted Canvas 2D optimizations:
  - [ ] **Background layer:** already uses OffscreenCanvas caching (`dirty` flag). Verify `willReadFrequently: false` on the main canvas context (already correct in `backgroundLayer.js` using `{ alpha: false }`).
  - [ ] **Gradient caching:** identify any per-frame gradient object creation in `game.js` and cache them
  - [ ] **Particle scaling:** expose and document `simpleParticles` / `reducedEffects` skill settings as performance options for low-end devices
  - [ ] **Per-frame allocation audit:** look for array/object creation in hot paths

---

## WebGL Migration Pre-requisites (if desired in the future)

Before a WebGL migration can be responsibly scoped:
1. Profile the game in Chrome DevTools (Performance tab) on a low-end device
2. Identify whether the bottleneck is: JS game logic, Canvas 2D draw calls, or layout/style recalculations
3. If Canvas 2D draw calls are confirmed the bottleneck, evaluate PixiJS as a migration path (it has a Canvas 2D–compatible API and provides a WebGL backend with automatic fallback)
4. Scope the PixiJS migration as a separate, dedicated task with test strategy included

---

## Notes

- The `backgroundLayer.js` already uses an OffscreenCanvas offscreen buffer with a `dirty` flag — this is the correct WebGL-like caching strategy for the background
- `skillSettings.simpleParticles`, `skillSettings.reducedEffects`, `skillSettings.simpleBackground`, `skillSettings.extremeLowDetail`, and `skillSettings.simpleTextures` all exist and are the right knobs for low-end device support
- Communicating these settings to users through the UI is the highest-value, lowest-risk improvement
