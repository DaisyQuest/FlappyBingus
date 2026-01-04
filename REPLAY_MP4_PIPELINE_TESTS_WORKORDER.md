# REPLAY_MP4_PIPELINE_TESTS Work Order

- [x] Review existing normalizeRenderProfile and validateReplayForRender tests in services/__tests__/replayMp4Pipeline.spec.js.
- [x] Add normalizeRenderProfile cases: invalid profile ID -> ok:false; width/height/fps no match -> ok:false; empty object -> default profile.
- [x] Add validateReplayForRender cases: missing replay JSON, too large replay, invalid replay JSON, too many ticks, duration overflow.
- [x] Assert error codes: missing_replay, replay_too_large, invalid_replay, replay_too_long.
- [ ] Run relevant tests if feasible.
