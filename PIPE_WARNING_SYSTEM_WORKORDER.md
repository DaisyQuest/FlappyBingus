# PIPE WARNING SYSTEM WORKORDER

- [x] Review existing spawn logic in public/js/game.js and pipe geometry in public/js/pipes/pipeSpawner.js.
- [x] Add warning data model to game state with side, type, segments, thickness, spawn ETA, and flash settings.
- [x] Implement pure helper for warning segments and alpha computation; clamp to game bounds.
- [x] Register warnings in _spawnWall/_spawnBurst/_spawnCrossfire/_spawnSinglePipe with lead time and expiration.
- [x] Render edge warnings in game render flow.
- [x] Add/expand tests for geometry helper and warning scheduling/expiration paths.
- [x] Update workorder checkboxes as tasks complete.
