# Deterministic Simulation & Client-Authoritative Engine Plan

## Goals
- Make the game engine fully deterministic across clients.
- Preserve **zero-latency client feel** by keeping clients authoritative over their local simulation.
- Remove reliance on browser-only behavior (canvas timing quirks, requestAnimationFrame side effects, implicit state).
- Refactor the core engine to use explicit, testable systems and abstractions.
- Reduce the size/complexity of `main.js` by extracting clear modules.
- Achieve and maintain **>90% test coverage**, with comprehensive branch coverage.

## Guiding Principles
- **Determinism first**: all state changes must be driven by explicit inputs and a fixed-timestep simulation.
- **Client-authoritative**: clients own their local game state; network sync is for sharing state, not gating it.
- **Pure logic, testable units**: core simulation should run headless without DOM/canvas.
- **Explicit data flow**: no hidden globals; encapsulate state and mutations.

## High-Level Architecture
1. **Core Simulation (Headless)**
   - Pure logic engine: `World`, `Entities`, `Systems`.
   - Fixed timestep loop: `step(world, input, dt)`.
   - Deterministic RNG with seed control.
   - Serialization/deserialization of state for snapshots and rollback if needed.

2. **Client-Authoritative Loop**
   - Local client owns the canonical `World` for its session.
   - Inputs are applied immediately (zero latency).
   - State can be shared/replicated to peers or services without impacting local authority.

3. **Networking & State Sync (Non-Authoritative)**
   - Broadcast snapshots or deltas for cross-client visibility.
   - Use sequence numbers for ordering and replay when needed.
   - Optional reconciliation for *remote* entities only (local state stays authoritative).

4. **Rendering Layer (Browser-only)**
   - Canvas/DOM rendering only (no game logic).
   - Consumes world snapshots, interpolates if needed.
   - Separate from simulation to allow headless tests.

## 5-Phase Refactor Process

### Phase 1: Inventory & Isolation
- Identify current logic in `main.js` and map responsibilities:
  - Input handling
  - Physics/collision
  - Entity lifecycle
  - Scoring/game rules
  - RNG usage
  - Background rendering and visual effects
- Extract **pure functions** for these responsibilities into `engine/` modules.
- Replace implicit globals with explicit dependency injection (state passed in/out).

### Phase 2: Deterministic Core Engine
- Create an engine package structure:
  - `engine/world.ts` (state container)
  - `engine/systems/*.ts` (physics, collisions, scoring, spawn)
  - `engine/step.ts` (fixed timestep update)
  - `engine/rng.ts` (seeded RNG)
  - `engine/serialize.ts` (snapshot)
- Ensure all systems operate on plain data structures.
- Introduce deterministic time step (e.g., 16ms) and input queue.

### Phase 3: Client-Authoritative Simulation Loop
- Implement a headless simulation loop for local execution:
  - Apply input batches per tick with no network gating.
  - Advance world state deterministically.
  - Emit snapshots for rendering and optional network sync.

### Phase 4: State Sync for Remote Entities
- Maintain snapshot history for remote entity interpolation.
- Apply ordering/sequence numbers for incoming remote updates.
- Keep local authoritative state untouched by remote updates.

### Phase 5: Shrink `main.js`
- Reduce `main.js` to:
  - Initialize renderer
  - Wire input events to the local simulation
  - Handle networking/state sync updates
- All logic should live in `engine/` and `services/` modules.

## Visual Systems: Flexible Backgrounds & Polished Rendering

### Background Options
- **Video backgrounds (.mp4)**
  - Rendered behind the game layer.
  - Configurable scaling/letterboxing modes.
  - Deterministic playback controls (start time, looping, pause/resume).
- **Computer-generated backgrounds**
  - Procedural or shader-driven visuals with more glamour than current.
  - Parameterized palettes, gradients, parallax layers, particle motifs.
  - Seeded randomness for deterministic reproduction in tests.
- **Monochrome mode**
  - Single-hue or grayscale rendering mode.
  - Ensures clean readability and aesthetic variety.

### Rendering Abstractions & Polish Opportunities
- **BackgroundRenderer interface**
  - Standardize initialization, update, and draw lifecycles.
  - Implementations: `VideoBackground`, `ProceduralBackground`, `MonochromeBackground`.
- **VisualTheme registry**
  - Bundle background choice, color palette, shaders, and UI polish parameters.
  - Allow runtime switching and configuration persistence.
- **Effects pipeline**
  - Post-processing hooks (bloom, vignette, film grain) as optional layers.
  - Config-driven intensity to keep visuals consistent and testable.
- **Layered composition**
  - Separate layers: background, world, UI, effects.
  - Consistent ordering to reduce coupling in rendering logic.

## Testing Plan (Coverage > 90%)

### Unit Tests (Core Engine)
- **World state updates**: verify deterministic outcomes with fixed seeds.
- **Physics/collision**: edge cases, boundary conditions.
- **Scoring/rules**: all branches for win/loss, scoring updates.
- **Serialization**: round-trip state equivalence.
- **RNG**: seed determinism across runs.

### Unit Tests (Rendering Abstractions)
- **BackgroundRenderer lifecycle**: init/update/draw order and error handling.
- **Theme selection**: ensure VisualTheme registry resolves correct components.
- **Determinism for procedural backgrounds**: same seed produces same parameters.
- **Monochrome pipeline**: color conversion consistency and edge cases.

### Integration Tests
- **Local loop**: input queue processing and deterministic ticks.
- **State sync**: apply remote snapshots for interpolation without affecting local authority.
- **Replay tests**: identical inputs produce identical world states.
- **Rendering integration**: background selection does not affect world simulation.

### Branch & Edge Coverage
- Test all branches of entity lifecycle (spawn, death, respawn).
- Validate error paths (invalid inputs, dropped packets).
- Ensure deterministic replay across varied tick counts.
- Verify all background modes (video/procedural/monochrome) handle invalid configs.

### Coverage Enforcement
- Add coverage thresholds in `vitest.config.js` or test runner config:
  - `statements: 90%`
  - `branches: 90%`
  - `lines: 90%`
  - `functions: 90%`
- Fail CI if coverage drops below threshold.

## Deliverables
- Fully deterministic headless engine.
- Client-authoritative simulation loop with zero-latency input application.
- Optional state sync for remote entities without impacting local authority.
- Rendering isolated from game logic.
- Flexible background system with video, procedural, and monochrome modes.
- Visual theme abstractions and effects pipeline for polish.
- `main.js` reduced to minimal wiring.
- Test suite exceeding **90%** coverage with comprehensive branch coverage.

## Risks & Mitigations
- **Network jitter**: use interpolation buffers for remote state.
- **Desyncs**: add state checksum/hash comparisons for debugging, not authority.
- **Render complexity**: enforce layered composition and dedicated render interfaces.
- **Regression risk**: enforce coverage and add replay-based tests.

## Success Criteria
- Running the simulation headlessly produces identical results for identical inputs.
- Local client simulation remains authoritative with no input latency.
- Background modes are configurable and do not affect simulation determinism.
- `main.js` only contains setup/wiring, not game logic.
- Test coverage > 90% with full branch coverage for critical systems.
