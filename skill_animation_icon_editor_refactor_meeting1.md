# Council Meeting 1: Skill Animation Icon Editor Refactor

## Architect
We need to align animation trigger behavior with the existing trigger definitions, enforce per-icon animation slots (idle + one per trigger), and make the icon editor flow a focused screen. Ensure preview clearly indicates which animation/trigger is active and being edited.

## Developer
Implement explicit trigger mapping in the animation system, refactor icon editor UI into a dedicated screen with clear sections per trigger (idle + triggers), and update preview state to reflect selected trigger. Add headless simulation tests to validate trigger timing/length without rendering.

## Analyst
Ensure changes preserve existing data structures or provide safe migrations, and prioritize exhaustive tests for trigger activation timing and duration in headless engine. Verify coverage across edge cases (no idle, missing trigger animation, overlapping triggers).

## Secretary
Summary: Council agrees to fix skill-triggered animation activation, refactor icon editor to a dedicated screen with clear per-trigger animation controls and preview clarity, and add robust headless simulation tests for trigger timing/duration with high coverage.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

**Decision: CREATE WORK ORDER**
