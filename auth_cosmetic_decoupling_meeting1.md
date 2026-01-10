# Council Meeting 1: Decouple cosmetic selection from auth state

## Architect
Ensure cosmetic selection flows do not mutate authentication state and failures do not log out users. Add explicit control for reauth attempts to avoid implicit login side effects.

## Developer
Remove auto-login calls from cosmetic handlers, prevent trail save failures from clearing net.user, and add an allowReauth flag to setUserHint with updated call sites. Extend tests for guest flows and unauthorized responses.

## Analyst
Verify the changes keep auth state stable during cosmetic selection and cover edge cases. Ensure tests exercise all branches, especially unauthorized paths and guest save skipping.

## Secretary
Summary: The council agrees to decouple cosmetic selection from auth recovery, avoid clearing auth on save failures, add a no-reauth mode to user hints, and expand tests to cover guest and unauthorized behaviors.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
