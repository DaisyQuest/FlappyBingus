# Council Meeting 1: Implement Replay to MP4 Pipeline

## Architect
- Ensure implementation follows the design spec: queue-backed worker, deterministic rendering, and clear API boundaries.
- Keep core replay validation centralized to reuse existing best-run logic.

## Developer
- Implement a minimal in-process queue abstraction first, then allow swapping to Redis/SQS later.
- Use FFmpeg via child_process with strict limits; mock for tests.

## Analyst
- Emphasize rate limiting, size caps, and sandboxed execution for safety.
- Add extensive tests for failure modes and idempotency to avoid regressions.

## Secretary
- Consensus: implement the full pipeline with safe limits, deterministic playback, and exhaustive tests.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

**Decision: CREATE WORK ORDER**
