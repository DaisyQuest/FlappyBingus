# ICON CUSTOMIZATION V2 WORK ORDER

## Objectives
- Add IconStyleV2 data model with schemaVersion, migration, validation, and deterministic animation system.
- Expand pattern library, presets, effects pipeline, and editor UI with required panels.
- Enforce circle-only geometry with clipping in renderer.
- Add persistence/migration and tests with coverage gates.

## Tasks
- [ ] Locate existing icon registry, renderer, editor UI, and tests.
- [ ] Define IconStyleV2 types/schemaVersion and migration from legacy fields.
- [ ] Implement validateIconStyleV2 with strict invariants, clamps, and error reporting.
- [ ] Implement preset patch merge semantics and preset library (>= 30).
- [ ] Add pattern expansion and ensure circle clipping in renderer.
- [ ] Implement effects pipeline with reorder, enable toggles, param editors.
- [ ] Implement deterministic animation engine and event testing hooks.
- [ ] Upgrade editor UI tabs, previews, and advanced JSON editor with validation.
- [ ] Add reduced-motion toggle and respect prefers-reduced-motion.
- [ ] Persist new fields and maintain backwards compatibility.
- [ ] Add unit/integration/UI tests and enforce coverage gates.
- [ ] Run tests and update coverage scripts.
