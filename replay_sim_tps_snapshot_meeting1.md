# Replay Sim TPS Snapshot - Council Meeting 1

## Architect
We must capture the simulation TPS with the replay payload to ensure replays can be re-run if the global sim precision changes. The snapshot should be persisted in replay JSON and used during playback.

## Developer
Add a sim TPS field to replay envelopes and hydration, thread it into playback (both replay manager and replay browser controller), and extend tests to cover presence/absence and application.

## Analyst
Ensure backward compatibility: when sim TPS is missing, fall back to defaults. Tests should cover both branches and avoid regressions.

## Secretary
Summary: The council agrees to snapshot sim TPS in the replay payload, apply it on playback with a fallback to defaults, and add thorough tests for both stored and missing values.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
