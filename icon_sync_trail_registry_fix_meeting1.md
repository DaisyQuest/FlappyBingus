# Council Meeting 1: ICON SYNC TRAIL REGISTRY FIX

## Architect
We must ensure icon sync never falls back to defaults when a larger icon collection exists, and trail registry must not surface defaults without server connection. Update the registry logic and session flow gating accordingly, with tests covering all branches.

## Developer
Plan: audit iconRegistry.js, sessionFlows.js, main.js. Make icon sync prefer explicit collections and block defaults when larger set is available. For trails, remove default fallback and require server connection. Add tests for icon registry decision paths and trail registry behavior in offline scenarios.

## Analyst
Ensure changes do not regress login flows. Verify that re-init logic does not mask missing data. Add tests to prevent fallback to defaults when icons > defaults. Confirm offline state results in empty trails and consistent registry.

## Secretary
Summary: Council agrees to adjust icon sync and trail registry logic to prevent default fallbacks when larger data exists, and to remove trail defaults in offline scenarios. Tests should cover icon registry selection branches and trail registry behavior without server connection.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
