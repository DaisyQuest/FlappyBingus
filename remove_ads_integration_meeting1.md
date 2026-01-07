# Council Meeting 1: Remove Ads Integration

## Architect
Remove ad integrations cleanly with minimal surface area. Ensure entry HTML and loader modules no longer reference AdSense.

## Developer
Delete AdSense loader usage from the main game HTML and remove the loader module if unused. Update tests that validate loader behavior or HTML wiring.

## Analyst
Goal aligns with diagnosing production lag. Ensure removals are complete to avoid dead code and unintended network requests.

## Secretary
Summary: Remove AdSense script usage from game entrypoints, delete unused loader, and update tests to match new behavior.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

**Decision: CREATE WORK ORDER**
