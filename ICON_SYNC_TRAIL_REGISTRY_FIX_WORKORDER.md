# ICON SYNC TRAIL REGISTRY FIX WORK ORDER

## Tasks
- [x] Review icon sync logic in iconRegistry.js and sessionFlows.js; remove/guard default fallback when icon collection exceeds defaults.
- [x] Update main.js flow to avoid re-init masking missing icon/trail data.
- [x] Remove default trail fallback; enforce empty trail registry when no server connection.
- [x] Add/expand tests to cover icon sync branches, login re-init behavior, and trail registry offline behavior.
- [x] Verify tests pass.
