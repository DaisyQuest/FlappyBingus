# Replay MP4 Pipeline Tests - Meeting 1

## Architect
Add explicit test cases for normalizeRenderProfile and validateReplayForRender to cover invalid profiles, missing/oversized/invalid replay payloads, and duration overflow. Ensure assertions include error codes.

## Developer
Implement new test cases in services/__tests__/replayMp4Pipeline.spec.js. Cover: invalid profile ID, width/height/fps mismatch, empty object default. Add validateReplayForRender cases for missing replay json, too large replay, invalid JSON, too many ticks, duration overflow; assert ok:false and specific error codes.

## Analyst
Changes are test-only; ensure full branch coverage and no modifications to production logic. Validate error identifiers for each path match current implementation.

## Secretary
Summary: The council agrees to add comprehensive test cases in replayMp4Pipeline.spec.js covering normalizeRenderProfile invalid/default handling and validateReplayForRender error branches, asserting specific error codes for each failure.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
# Meeting 1: replay_mp4_pipeline_tests

## Architect
We need to extend replay MP4 pipeline tests to cover early return paths when store already has an entry by hash or replay. Ensure queue behavior remains unchanged.

## Developer
Add tests in services/__tests__/replayMp4Pipeline.spec.js that build pipeline with a fake store and queue, then assert requestRender returns existing entry and does not enqueue. Preserve existing setup helpers.

## Analyst
Changes are test-only and align with goal. Ensure both getByHash and getByReplay branches are covered and queue size assertion prevents regression.

## Secretary
Summary: Council agrees to add targeted tests for requestRender early-return branches (getByHash and getByReplay) with queue size assertions and matching entries, using existing pipeline test helpers.

## Arbiter 1
Vote: CREATE WORK ORDER

## Arbiter 2
Vote: CREATE WORK ORDER

## Arbiter 3
Vote: CREATE WORK ORDER
