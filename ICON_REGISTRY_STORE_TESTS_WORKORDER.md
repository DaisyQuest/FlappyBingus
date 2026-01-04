# ICON_REGISTRY_STORE_TESTS Work Order

- [x] Inspect existing iconRegistryStore tests and identify gaps for persistence fallback, normalization error, and cloning behavior.
- [x] Update services/__tests__/iconRegistryStore.spec.js to cover:
  - persistence object missing load/save still yields working store.
  - save() with non-array input triggers catalog normalization error.
  - returned icons are cloned (no shared references).
- [ ] Run relevant tests if feasible.
- [x] Mark tasks complete.
