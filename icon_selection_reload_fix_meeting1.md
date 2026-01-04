# Council Meeting 1: Icon Selection Reload Fix

## Architect
The icon selection screen must consistently show the correct unlocked/available icons and should not swap lists after selection. We should confirm the source of truth for icon inventories and ensure the UI reads from it consistently.

## Developer
We need to trace the icon selection state flow and find where a different icon list is being loaded post-selection. Likely a stale cache or mismatch between unlocked icons and server payload. We'll fix the state handling and add tests for selection behavior and unlocked icon validation.

## Analyst
The bug sounds like a race or state mismatch after selection. Ensure any async updates do not overwrite the current list. Prevent errors when selecting unlocked icons by validating IDs and handling missing entries gracefully. Add tests covering edge cases.

## Secretary
Summary: The council agrees the fix requires identifying the authoritative icon list and preventing UI state from being replaced after selection. Ensure unlocked icon selection never errors. Add thorough tests around state flow and unlocked icon validation.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
