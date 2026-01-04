# Council Meeting 1: icon_override_removal

## Architect
We should remove the override layer and treat each icon version as a distinct asset with simple retrieval from sync/cache. Update any editor tooling to reflect direct icon usage.

## Developer
Plan: delete override-specific modules, update icon resolution paths and editor logic to reference direct icons, adjust tests to cover icon loading from sync/cache and editor UI behaviors.

## Analyst
Ensure the removal doesn't break fallback behavior. Keep sync and cache paths deterministic. Update tests to cover both online/offline scenarios and ensure no override logic remains.

## Secretary
Summary: Consensus to remove override layer, simplify icon handling, ensure sync/cache flows remain intact, update editor tool, and expand tests for online/offline scenarios.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
