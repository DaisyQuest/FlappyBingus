# In-Game UI Refresh Meeting 1

## Architect
We should scope changes to in-game UI elements and retain social buttons only on the main menu. Ensure UI styling stays consistent with bubbly theme and avoid altering gameplay logic.

## Developer
Locate in-game UI layout in `public/js/uiLayout.js` and styles in `public/styles/flappybingus.css`. Remove social buttons from in-game HUD while leaving menu intact. Enhance skill buttons, timer visibility, and combo/score styling with new CSS classes. Update tests covering UI layout and CSS assertions.

## Analyst
Ensure removing buttons does not impact accessibility or event handlers in in-game state. Verify new styles do not regress layout tests. Add tests for new CSS rules and HUD elements for coverage.

## Secretary
Summary: Council agrees to adjust in-game UI only, preserve menu social dock, add bubbly styling for skills buttons, make timer more prominent without label, and refine combo/score indicator. Update tests to cover new layout and CSS changes.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
