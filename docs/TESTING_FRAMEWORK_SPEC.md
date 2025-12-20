# FlappyBingus Headless Testing & Engine Spec

This document outlines the requirements and design direction for a modular, headless-friendly testing framework and game-engine abstraction that can verify FlappyBingus core mechanics with expressive, maintainable scenarios. Every major item below is tracked with a checkbox to guide implementation progress.

## Objectives & Scope
- [ ] Headless parity with the in-browser experience, enabling deterministic simulations without DOM or audio dependencies.
- [ ] Coverage of core mechanics: scoring (orbs, time, perfect gate passes), death conditions, movement physics, dash/ability effects, combo logic, and environmental interactions (pipes/gates/orbs/projectiles).
- [ ] Modular architecture that isolates rendering, input, physics, and game rules so tests can target each layer independently.
- [x] Clear developer ergonomics: fixtures, factories, and assertions that make scenario authoring concise and readable (fixtures + scenario runner + reporting helpers).
- [x] Rich reporting that captures pass/fail outcomes, logs, screenshots/recordings when relevant, and artifact links suitable for CI (coverage + console summary + scenario markdown summaries).
- [ ] Explicit risk & validation plan that probes determinism, compatibility with legacy `Game`, and performance budgets before wide rollout.
- [ ] Agentic automation readiness so tool-using AI can generate, run, and interpret scenarios safely.

## Engine Abstraction
- [x] Introduce a headless `GameEngine` core that encapsulates simulation state (player, pipes, gates, orbs, timers, combos) and exposes pure update/step functions with deterministic RNG injection.
  - Decouple rendering: rendering adapters consume read-only snapshots; tests run without canvas.
  - Input abstraction: provide command objects (jump, dash, pause, swap trail, etc.) instead of direct DOM events.
  - Deterministic randomness: seedable RNG pluggable via constructor; engine must avoid `Math.random` calls outside injected source.
- [x] State snapshots & replay:
  - Expose immutable snapshots (frame-by-frame) for assertions and time-travel debugging.
  - Allow scenario scripts to record input timelines and replay them to validate regression fixes (baseline available via scenario runner).
- [x] Event bus & hooks:
  - Fire discrete events for `score:orb`, `score:time`, `score:perfect`, `death`, `collision`, `dash:start`, `dash:bounce`, `combo:break`, `gate:entered`, and `gate:cleared`.
  - Tests can subscribe to events or inspect an event log to assert ordering and payloads.

## Testing Surface
- [ ] Scenario DSL:
  - Declarative scenarios specifying initial seed, player spawn, pipe/gate layout, orb placement, timers, and scripted inputs (`at 0.25s -> jump`, `at 1.5s -> dash`).
  - Supports parameterized suites (e.g., iterate dash power levels, gravity multipliers, or gate gap sizes).
- [x] Assertions & matchers (initial helpers in place, expand with physics-aware matchers):
  - Core matchers for position/velocity tolerances, collision occurrence, score deltas, combo streaks, orb decay, and death triggers.
  - Time-window assertions (e.g., "within 100ms after passing gate center, perfect score increments by 1").
  - Snapshot diffing for state vectors to ensure physics stability across refactors.
- [ ] Coverage targets (minimum cases to implement first):
  - Orbs: pickup scoring, life decay, rebound behavior against bounds, combo scaling, and SFX triggers (event-only in headless).
  - Gates/Pipes: entry detection, perfect-pass detection, scoring once per gate, off-screen cleanup.
  - Player movement: gravity application, jump impulse, dash vectoring, dash bounces, invulnerability frames, combo break on collision.
  - Death: collisions with pipes/gates, floor/ceiling, and timeout/soft-death conditions if any exist.
  - Timer scoring: incremental time-based scoring and its interaction with pause/speed modifiers.

## Tooling & Runner
- [x] Test runner: prefer Node-based runner (e.g., Vitest/Jest) that supports ES modules and can execute pure engine logic without browser globals.
- [x] Fixture utilities:
  - Geometry builders for pipes/gates/orbs with concise helpers (`spawnPipe`, `spawnGate`, `spawnOrbCluster`).
  - Time-stepping helpers to run fixed or variable `dt` loops and surface intermediate snapshots.
- [ ] Headless adapters:
  - Minimal shim for the existing UI `Game` class so that tests can either exercise the legacy loop or the new engine in isolation.
  - Optional offscreen canvas/polyfill when validating rendering hooks; otherwise stubbed to no-op.
- [ ] Performance & determinism checks:
  - Guardrails ensuring that tests fail fast if the engine reads `performance.now`/`Date.now` directly instead of injected clocks.
  - Verify deterministic outputs across multiple runs with the same seed by hashing event logs/snapshots.

## Reporting & CI
- [ ] Unified result object per suite capturing: seed, scenario name, pass/fail, failure reason, assertion data, snapshot excerpts, and timing.
- [ ] Report generators:
  - Markdown summary suitable for CI comments, listing each scenario with checkboxes and links to artifacts.
  - HTML report with sortable tables, collapsible logs, and embedded media (screenshots/GIFs) when rendering tests are enabled.
  - JSON artifact for machine consumption and regression baselines.
- [x] Coverage reporting via Vitest V8 provider with text, lcov, and HTML outputs stored in `coverage/`.
- [x] Human-friendly consumption: `npm run test:coverage:summary` emits `coverage/summary.md` for quick inspection alongside HTML/LCOV outputs; `npm run test:report` also prints the summary inline.
- [x] Scenario summary helper that produces per-run markdown snippets (seed, ticks, time, event count) for CI surfacing.
- [ ] CLI integration:
  - `npm run test:headless` (engine-only) and `npm run test:ui-smoke` (optional rendering shims) scripts.
  - Exit codes aligned with CI expectations; non-flaky mode by default, with optional retries gated by a flag.

## Implementation Plan (initial draft)
- [x] Establish `engine/` module with pure logic and a thin compatibility layer that mirrors current `Game` behavior.
- [x] Add RNG/injection utilities and migration steps to remove direct randomness from `public/js/game.js` where applicable.
- [x] Scaffold test runner setup (Vitest/Jest), including tsconfig/jsconfig if needed for ESM resolution.
- [x] Build fixtures + scenario DSL, starting with orb pickup, gate perfect-pass, and dash-bounce suites (fixtures and scenario runner landed; DSL still pending richer syntax).
- [ ] Implement reporting pipeline (JSON -> Markdown -> HTML), integrated into CI with artifact uploads.
- [ ] Document contributor workflow: how to write scenarios, run tests locally, and interpret reports.

## Risk Assessment & Mitigations
- [ ] Determinism drift: add a deterministic CI check that replays the same seed twice and compares hashed event logs; fail fast on divergence.
- [ ] Performance regressions: set a max frame budget (e.g., 2ms per engine tick at target hardware) and include a micro-benchmark suite in CI.
- [ ] Legacy compatibility: create a contract test that drives both the legacy `Game` and new `GameEngine` with the same scripted inputs and asserts matching outputs for shared mechanics.
- [ ] Flaky timing: rely on injected clocks and fixed `dt` where possible; allow slow-motion scaling for high-precision assertions.
- [ ] Input coupling: prohibit direct DOM access in engine modules via eslint rule or build-time lint.
- [ ] Data drift in fixtures: define golden baselines (JSON) for scenarios and diff them against regenerated runs to catch unintentional layout changes.
- [ ] State explosion risk: constrain scenario complexity (entity count, duration, branching) and enforce budgeted limits to keep headless runs tractable.
- [ ] Physics divergence: specify tolerances per mechanic (position/velocity deltas) and surface diffs when they are exceeded rather than binary pass/fail.
- [ ] Hidden coupling to rendering: add a static analysis check that prevents importing canvas/audio APIs in engine packages.

## Validation Strategy (how we’ll know it works)
- [ ] Golden scenario pack covering: (1) simple orb pickup, (2) perfect gate pass, (3) dash bounce and rebound, (4) death on pipe collision, (5) combo break on hit, (6) time-based scoring accrual.
- [ ] Cross-implementation parity tests between headless engine and browser loop for mechanics that already exist.
- [ ] Regression harness: nightly job that replays all scenarios with multiple seeds and uploads Markdown + HTML + JSON reports.
- [ ] Observability: event log inspector and snapshot diff viewer to debug failing cases; include frame index, RNG seed, entity counts, and player vectors.
- [ ] Failure triage: standardized failure payload that includes nearest frames before/after failure, last inputs, and relevant entity states.
- [ ] Chaos tests: fuzz input timings and parameter sweeps (gravity, dash force, pipe speed) to ensure stability under adversarial conditions.
- [ ] Upgrade guard: lock engine/report schemas with semver and compatibility tests so tooling/agents do not break silently.
- [ ] Skeptic’s proof (assume it fails):
  - Define falsifiable success metrics (e.g., ≤1% event-log drift across seeds, ≤2ms tick p95, ≤3% mismatch between legacy and engine outputs on parity suite).
  - Run a “try-to-break-it” gauntlet: heavy seeds, extreme parameter sweeps, long-duration soak (10k+ ticks), concurrent scenario batches.
  - Track and publish failure budget burn-down (how many mismatches per 1k runs) and stop ship if budget is exceeded.
  - Require dual implementation review: one reviewer plays skeptic and documents remaining risk before merge.

## Design Tradeoffs & Open Questions
- [ ] Should physics run fixed-step only (deterministic) with interpolation for rendering, or allow variable-step for UI parity? Default to fixed-step with configurable `dt`.
- [ ] How to gate optional visual assertions (e.g., pixel diffs) without slowing headless suites? Likely separate “render smoke” tier.
- [ ] Which RNG implementation to use (e.g., mulberry32/xoroshiro) and how to serialize seeds? Decide and document in engine constructor contract.
- [ ] What minimal subset of `Game` behaviors must be mirrored before deprecating direct `Game` tests? Define a checklist before switching CI default.
- [ ] Do we need a physics tolerance table per mechanic (e.g., jump height variance)? Add config so tolerances live alongside scenarios.
- [ ] How to isolate audio side effects? Prefer event hooks and mockable audio adapters; avoid loading audio in headless runs.
- [ ] How will we reconcile future content changes (new orbs, abilities, pipe types) with determinism baselines? Need a versioned content manifest and migration guide for fixtures.
- [ ] Should the event bus support async subscribers (e.g., logging to DB) without impacting deterministic timing? Probably require synchronous-only in engine loop and mirror async elsewhere.

## Agentic AI Compatibility
- [ ] Structured interfaces:
  - Scenario definitions, results, and snapshots must be serializable to JSON/YAML for programmatic authorship by agents.
  - Provide a JSON Schema for scenarios and reports so agents can validate their outputs before execution.
- [ ] Safe, bounded actions:
  - Sandbox engine runner to reject unrecognized commands or code execution; only allow declarative scenario inputs.
  - Enforce seed and `dt` bounds to avoid unintentional hangs or runaway simulations.
- [ ] Discoverability & affordances:
  - Offer a machine-readable catalog of available actions (jump, dash, spawn pipe/orb/gate, set gravity) with defaults and constraints.
  - Include example prompts/snippets showing how agents can compose scenarios and assertions.
- [ ] Guardrails on generation:
  - Lint or validate generated scenarios for resource limits (entity counts, duration) and missing assertions.
  - Require explicit opt-in for mutating legacy assets/config to prevent accidental overwrites.
- [ ] Observability for agents:
  - Emit deterministic hashes for snapshots/events so agents can compare runs without parsing full logs.
  - Provide concise failure summaries plus deep links to full reports to enable automated triage or reruns.
- [ ] CI hooks for agents:
  - Command-line flags to run a subset of scenarios by label/owner, enabling agent workflows (e.g., `/run orb-suite`).
  - Exit codes and structured artifacts stable across versions to support autonomous pipelines.
- [ ] Feedback loop safety:
  - Require dry-run mode for agent-generated scenarios that reports validation errors without executing simulations.
  - Add quotas/rate limits and cache reuse so repeated agent trials do not overwhelm CI infrastructure.
- [ ] Traceability:
  - Tag scenarios with provenance (author/tool/version) and keep immutable audit logs so automated changes are reviewable.
  - Include reproducible command lines and seed summaries in reports for human spot checks.

## Incremental Delivery & Verification Plan
- [ ] Phase 0: Foundations
  - Create `engine/` package skeleton with seedable RNG utility and injected clock.
  - Add lint rules forbidding DOM/audio imports in engine modules.
  - Ship minimal CI job that runs a no-op headless test to validate wiring.
- [ ] Phase 1: Core Loop Parity
  - Implement deterministic update/step loop with player physics and pipe/gate/orb state.
  - Build golden scenarios for orb pickup, perfect pass, dash bounce, and pipe death.
  - Add parity harness comparing legacy `Game` and engine for shared mechanics; block on mismatches.
- [ ] Phase 2: DSL & Fixtures
  - Deliver JSON/YAML scenario schema, factories (`spawnPipe`, `spawnGate`, `spawnOrbCluster`), and time-step helpers.
  - Add scenario validation + linting (resource budgets, assertion presence) and dry-run mode.
- [ ] Phase 3: Assertions, Events, Reporting
  - Implement matchers (position/velocity tolerance, collisions, score deltas, combo streaks, timers) and event log hashing.
  - Ship Markdown/JSON reports with failure payloads and deterministic hashes; integrate CI artifact upload.
- [ ] Phase 4: Chaos & Performance
  - Add fuzz/chaos runners for timings and parameter sweeps; introduce micro-benchmark budget checks.
  - Enforce scenario complexity limits and cache reuse; surface failure budgets in reports.
- [ ] Phase 5: Agentic Enablement
  - Publish machine-readable action catalog, schemas, and example prompts/snippets.
  - Add CLI labels (`/run orb-suite`) and provenance tagging; rate-limit and audit agent-generated runs.
- [ ] Phase 6: Hardening & Rollout
  - Run soak tests (10k+ ticks) on nightly builds; monitor drift and failure-budget burn-down.
  - Version content manifests and lock report schemas; document migration steps.
  - Flip CI default to headless engine once parity checklist is green and skeptic metrics are met.
