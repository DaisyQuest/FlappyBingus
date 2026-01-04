# Council Meeting 1: Fix Trail Unlockable Test Failure

## Architect
We need to restore unlockables output to include custom trails like Comet with correct unlock metadata. Ensure server routes align with spec and tests cover branches.

## Developer
Investigate server routes unlockables response; likely filtering trails incorrectly or missing registry merge. Update logic and add tests for custom trail presence and unlock types.

## Analyst
Ensure changes maintain determinism and do not widen access. Add tests to cover edge cases for trail unlockables (missing config, default vs custom).

## Secretary
Summary: Council agrees to inspect unlockables output to restore custom trail entries with proper unlock metadata, then add thorough tests covering custom/default trail branches and edge cases.

## Arbiter 1
CREATE WORK ORDER

## Arbiter 2
CREATE WORK ORDER

## Arbiter 3
CREATE WORK ORDER
