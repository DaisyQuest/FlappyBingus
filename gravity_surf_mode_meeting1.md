# Gravity Surf Mode Council Meeting 1

## Architect
Add a new game mode entry and scene/state that reuses existing cosmetics/profile bindings. Ensure scoring, best score per mode, and restart behavior are integrated with current game loop patterns.

## Developer
Implement new mode module with slope terrain generator, slope collision/grounding, gravity toggle via Space, and scoring. Add menu button routing to new mode and per-mode best score persistence. Add tests for physics, scoring, and menu integration.

## Analyst
Ensure no changes to core flappy mechanics. Avoid adding database dependencies. Confirm no failure state besides restart; player continues forward. Verify inputs limited to Space and R.

## Secretary
Summary: Council agrees to add a new Gravity Surf mode that plugs into existing state manager/menu, reuses cosmetics/profile bindings, implements slope terrain + gravity toggle physics, adds scoring and per-mode best score, and adds thorough tests.

## Arbiter 1
CREATE WORK ORDER

## Arbiter 2
CREATE WORK ORDER

## Arbiter 3
CREATE WORK ORDER
