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
- [x] Apply targeted Canvas 2D optimizations:
  - [x] **Background layer:** already uses OffscreenCanvas caching (`dirty` flag). `willReadFrequently: false` on the main canvas is already correct in `backgroundLayer.js` using `{ alpha: false }`.
  - [x] **Gradient caching:** `_drawHUD` and `_drawComboGlow` in `game.js` now cache their `createRadialGradient` objects; invalidated only on canvas size change (score bubble) or combo integer change (combo glow), eliminating two per-frame gradient allocations.
  - [x] **Particle scaling:** `simpleParticles`, `reducedEffects`, `simpleBackground`, `extremeLowDetail`, and `simpleTextures` skill settings already exist and default to low-impact values (`simpleBackground: true`, `simpleParticles: true`, `reducedEffects: true`).
  - [x] **Per-frame allocation audit:** gradient objects were the primary per-frame allocation in the HUD hot path; now cached.

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
