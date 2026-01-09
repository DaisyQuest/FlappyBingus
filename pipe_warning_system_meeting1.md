# Pipe Warning System Meeting 1

## Architect
We should introduce a pure warning geometry helper that mirrors pipe generation logic so warnings accurately match pipe segments. Favor a dedicated module for warning computations to keep game logic clean and testable.

## Developer
Plan: add warning state to game, register warnings in spawn selection logic, and render edge lines using computed segments. Implement a pure helper for segments and add thorough unit tests for geometry and scheduling/expiration paths.

## Analyst
Ensure warnings are deterministic, clamped to world bounds, and expire on spawn to avoid stale state. Tests should cover all sides, gap exclusion, and timing branches with fake time updates.

## Secretary
Summary: Council agrees on adding a pure geometry helper for warnings, integrating warning scheduling into spawn logic, rendering edge lines with flashing alpha, and adding comprehensive tests covering geometry, timing, and expiration.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
