# ICON REGISTRY STORE TEST UPDATES WORKORDER

## Scope
- Expand icon registry store tests for persistence normalization, error detail handling, and timestamp branches.

## Tasks
- [x] Review current tests in services/__tests__/iconRegistryStore.spec.js.
- [x] Add persistence load test with invalid data to verify sanitized icons after normalization.
- [x] Add persistence save test where normalizeIconCatalog fails; assert thrown error includes details.
- [x] Add branches covering no persistence adapter, ensuring lastPersistedAt remains null and timestamps update appropriately.
- [x] Ensure timestamp assertions for lastLoadedAt/lastSavedAt/lastPersistedAt across branches.
- [x] Run relevant tests (if feasible).
