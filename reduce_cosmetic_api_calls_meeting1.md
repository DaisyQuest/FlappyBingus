# Council Meeting 1: Reduce Cosmetic API Calls

## Architect
We should consolidate cosmetic selection requests into a single save call per user action and ensure client state updates do not redundantly trigger server syncs.

## Developer
Identify where cosmetic selection triggers multiple API calls (likely client selection handlers + sync/poll). Add deduping and/or debounce/throttle, and ensure server endpoints are called once per change.

## Analyst
Ensure changes do not break synchronization or data consistency. Add tests to cover repeated selections and ensure only one API call is made per selection.

## Secretary
Summary: The council agrees we should centralize cosmetic selection updates, prevent duplicate server calls, and add tests verifying single-call behavior and maintained consistency.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
