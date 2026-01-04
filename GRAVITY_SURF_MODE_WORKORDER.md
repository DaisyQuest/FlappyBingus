# GRAVITY SURF MODE WORK ORDER

- [ ] Locate existing game mode/state manager, menu entries, and score persistence paths.
- [ ] Add new game mode enum/route and menu button labeled "Surf" (or "Gravity Surf") wired to the new mode.
- [ ] Implement Gravity Surf mode state with:
  - [ ] Auto-forward horizontal movement.
  - [ ] Space-held gravity ON, Space-released gravity OFF with damping.
  - [ ] Slope terrain generator with downward ramps and occasional flat/upward segments.
  - [ ] Slope collision/grounding logic with launch at segment end.
  - [ ] Scoring: airtime, big air bonus, chain multiplier with reset thresholds.
  - [ ] Restart via R; no failure state.
  - [ ] Reuse existing cosmetics (icons/trails) and profile bindings.
- [ ] Persist best score per mode.
- [ ] Add comprehensive tests for new mode physics, scoring, terrain generation, and menu integration.
- [ ] Update any UI to reuse existing game over/run stats layout.
