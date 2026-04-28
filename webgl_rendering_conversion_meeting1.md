# WEBGL_RENDERING_CONVERSION — Meeting 1

**Task:** Convert FlappyBingus rendering from Canvas 2D to WebGL for better performance.

---

## Architect

The current rendering architecture centers on `game.js` (86 KB) which issues 2D Canvas calls directly. Rendering sub-systems include:
- `backgroundLayer.js` — OffscreenCanvas-based static background with vignette/dots/space layers
- `backgroundRenderer.js` — thin wrapper around the background layer
- `spaceBackground.js` — star/particle system drawn with 2D calls
- `pipes/pipeRendering.js` + `pipeTextures.js` — pipe draw functions using `fillRect`, `strokeRect`, gradients
- `iconRendererV2.js` — player icon rendering via `drawImage`
- `game.js` — all particle trails, floats, orbs, combo aura, etc., drawn with 2D primitives

A full WebGL port means rewriting shaders for every visual element, replacing the OffscreenCanvas-based offscreen caching, and replacing every `ctx.*` call. No existing WebGL scaffolding or library (e.g., PixiJS, regl, three.js) is present in the project. This is a major architectural change spanning dozens of files.

**Spec concern:** The codebase has an existing battery of tests (`__tests__/`) that mock Canvas 2D contexts and call rendering functions directly. A WebGL port would invalidate those mocks entirely, requiring broad test rewrites.

---

## Developer

From an implementation standpoint, a raw WebGL rewrite is weeks of effort minimum:
- GLSL shaders for rects, arcs, images, gradients, radial gradients, text
- Batching/texture atlases for sprites
- OffscreenCanvas replacement with WebGL FBOs for background caching
- All game-loop draw calls (`ctx.fillRect`, `ctx.arc`, `ctx.drawImage`, `ctx.fillText`, etc.) replaced

A more pragmatic approach: use **PixiJS** (a WebGL-accelerated 2D renderer with Canvas 2D fallback). PixiJS provides a `Graphics` API close enough to Canvas 2D that the migration is tractable. However, even a PixiJS port is a very large refactor — every rendering call must be adapted to PixiJS's API, sprite/texture management, and the game loop wired differently.

An alternative that gives a real but targeted improvement with far less risk: leave the primary Canvas 2D renderer in place but **migrate the background layer to an OffscreenCanvas worker thread** (already partially done) and profile to find actual CPU bottlenecks. The user complaint is "computers aren't running it well" — this could be a CPU/JS issue, not a GPU-bound issue; WebGL doesn't help if the bottleneck is game logic.

---

## Analyst

Safety and goal-alignment concerns:
1. **Regression risk is extreme.** The entire visual output changes when swapping renderers. Existing visual-correctness assumptions in tests will break.
2. **Performance assumption is unverified.** "Computers not running it well" might be caused by physics tick frequency, particle count, GC pressure from array allocations, or network calls — not the Canvas 2D renderer. A WebGL port may not fix the actual issue.
3. **Browser compatibility:** WebGL is well-supported, but adding a complex new rendering system introduces new failure modes (context loss, shader compile errors, mobile GPU quirks).
4. **Scope is disproportionate.** The entire game rendering pipeline must be replaced. This is months of work, touching dozens of files and every visual subsystem.

**Recommendation:** Before committing to a WebGL port, the team should:
- Profile the game to identify the actual bottleneck
- Consider lower-cost performance wins (reduce particle counts, avoid per-frame gradient creation, `willReadFrequently`, `ImageBitmap` caching)
- If WebGL is proven necessary, adopt PixiJS rather than raw WebGL

---

## Secretary

**Summary of opinions:**

- **Architect:** Full conversion touches every rendering file (background, pipes, player icon, particles, trails, HUD). No WebGL library exists in the project. Test suite will break.
- **Developer:** Raw WebGL is impractical; PixiJS is more realistic but still a huge refactor. The bottleneck may not even be the renderer.
- **Analyst:** Risk is very high; the performance assumption is unproven; scope is disproportionate to the stated complaint; profiling should come first.

**All three non-arbiter roles agree:** A full WebGL conversion is technically possible but carries extreme risk, is months of work, and is likely unnecessary without first profiling to confirm the renderer is the bottleneck. The task as stated is not actionable as a concrete code change — it is a research/planning task first.

---

## Arbiters

**Arbiter 1 — Vote: REQUEST NEW MEETING**
The performance root-cause is not established. We should not begin a renderer rewrite without profiling data. A new meeting should clarify scope: do we profile first, or do we implement performance improvements within the existing Canvas 2D pipeline?

**Arbiter 2 — Vote: CREATE WORK ORDER**
We have enough information. The Council has reached consensus that a full WebGL conversion is impractical and risky at this time. A work order should document this assessment and identify actionable, lower-risk performance improvements within the existing Canvas 2D pipeline instead, which is the correct response to the user complaint.

**Arbiter 3 — Vote: CREATE WORK ORDER**
Agreed. The Council's analysis is thorough. The work order should: (a) document why a direct WebGL port is not recommended at this time, (b) enumerate concrete, targeted Canvas 2D performance improvements that can be made now, and (c) specify what profiling steps are needed before a WebGL migration could be responsibly scoped.

**Decision: CREATE WORK ORDER (2–1)**
