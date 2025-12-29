# Improvement Plan

## Critical coverage gaps
1. **Shared entity simulation and particle rendering logic lacks direct coverage.**
   *Scope:* `public/js/entities.js` (Pipe, Gate, Orb, Part branches).
   *Risk:* gameplay feel regressions (collision timing, particle visuals) without targeted tests.
   *Status:* ✅ Completed — added unit coverage for entity updates, crossings, bounces, and draw variants.

2. **Unlockables HTML rendering logic has no tests.**
   *Scope:* `services/unlockablesPage.cjs` (sorting, escaping, empty states).
   *Risk:* regressions in the unlockables catalog page, including XSS or sorting errors.
   *Status:* ✅ Completed — added tests for HTML selection, escaping, sorting, and empty state.

3. **User status copy lacks verification.**
   *Scope:* `public/js/userStatusCopy.js`.
   *Risk:* incorrect offline/signed-out messaging that informs player onboarding.
   *Status:* ✅ Completed — added unit coverage for status copy strings.

## Abstraction gaps
1. **Cookie-backed user preference persistence is embedded in `public/js/main.js`.**
   *Scope:* cookie read/write helpers for local best, seeds, settings, and cosmetics.
   *Risk:* logic duplication, harder testing, and brittle changes in monolithic entrypoint.
   *Status:* ✅ Completed — extracted helpers into `public/js/preferences.js` with dedicated tests.

## Execution notes
- Added a dedicated preferences module with round-trip tests for cookie-backed values.
- Expanded entity tests to cover update logic, gate crossings, orb bouncing, and particle draw variants.
- Covered unlockables page rendering and status copy constants.
