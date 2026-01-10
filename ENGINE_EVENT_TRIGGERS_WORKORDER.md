# ENGINE EVENT TRIGGERS WORK ORDER

- [x] Locate engine event bus & event log wiring; document integration points.
- [x] Add engine-level animation trigger events (anim:* namespace or adapter) with deterministic payloads (time, player id, skill id, combo/score metadata).
- [x] Ensure ordering: orb pickup -> score increment -> animation trigger.
- [x] Update/extend headless engine scenario tests for all triggers, variants, and edge cases (cooldowns, failed ability, double-trigger protections).
- [x] Verify event log assertions cover ordering and payloads.
