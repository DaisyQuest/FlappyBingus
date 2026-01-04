# Replay Config Snapshot Work Order

- [x] Locate replay save pipeline and identify where configuration is available at save time.
- [x] Capture and persist a configuration snapshot alongside replay data.
- [x] Update replay playback to load and pass snapshot configuration to the game engine/replay player when present.
- [x] Maintain backward compatibility for replays without snapshots.
- [x] Add tests for serialization/deserialization, snapshot usage, and fallback behavior.
- [x] Ensure branch coverage >=95% for new code paths.
