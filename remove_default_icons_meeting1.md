# Council Meeting 1 - remove_default_icons

## Architect
We should eliminate duplicated icon data sources by removing default icon lists and referencing a single registry source. Any logic that depends on defaults should be updated to reference the registry directly.

## Developer
I propose removing the defaults array and its consumers, then update menu/login/unlockable sync to use the shared registry. We must update tests to cover icon sync flows and ensure there is no fallback to defaults.

## Analyst
The change aligns with the goal: single source of truth. We must ensure sync logic doesn't rely on defaults, and tests need to cover cases where defaults were previously used.

## Secretary
Summary: All roles agree to remove default icon lists and use the registry as the sole source of icon truth, updating sync logic and tests to prevent regressions.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
