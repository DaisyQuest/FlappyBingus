# Council Meeting 1: ENGINE_EVENT_TRIGGERS

## Architect
We need deterministic engine-level events per TESTING_FRAMEWORK_SPEC and must emit new animation trigger namespace. Favor adapter from existing score/ability events to avoid UI coupling.

## Developer
Implement adapter in engine event bus or event log wiring to map existing score/ability events to anim:* triggers with deterministic payload (time, playerId, skillId, combo/score metadata). Add tests for emission ordering and edge cases.

## Analyst
Ensure single source of truth in engine layer. Verify new events fire once, no duplicates on cooldown/failed ability, and payload excludes DOM/audio. Expand headless tests for variants and ordering.

## Secretary
Summary: All agree to add engine-level animation trigger events, likely via adapter from existing score/ability events, with deterministic payload and expanded headless tests covering ordering and edge cases.

## Arbiters
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
