# Council Meeting 1: Animation Target Filtering

## Architect
The spec should ensure animation selections constrain target options while keeping target-first filtering intact. Verify UI logic is symmetric and does not regress existing behavior.

## Developer
Identify the animation/target filtering logic in the animations screen. Implement animation-first filtering to hide incompatible targets, preserving existing target-first filtering logic. Add tests for both selection orders and edge cases.

## Analyst
Ensure the filtering rules are consistent and no target becomes selectable when incompatible. Confirm accessibility and state handling when options are hidden.

## Secretary
Summary: Council agrees to adjust the animations screen to filter targets when an animation is selected, while keeping existing target-first filtering. Tests should cover both orders and edge cases.

## Arbiters
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
