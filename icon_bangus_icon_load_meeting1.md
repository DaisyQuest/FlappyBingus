# Council Meeting 1: ICON_BANGUS_ICON_LOAD

## Architect
The icon catalog should honor sync-provided entries without being dropped by client-side filters or secondary loads. Ensure that overrides don't discard custom icons and that the catalog merge stays deterministic.

## Developer
Suspect client-side filtering or a second catalog load overriding sync. We should trace syncIconCatalog and player icon state normalization, then fix to keep custom icons when provided. Add tests around sync updates and menu handlers.

## Analyst
Confirm safety: no regressions in unlockable filtering, avoid exposing invalid icons, maintain validation rules. Ensure new behavior still rejects invalid entries but doesn't silently drop valid custom entries.

## Secretary
Summary: Investigate client-side sync/normalization or filtering that could drop valid custom icons like "bangus". Ensure catalog merge preserves valid entries and avoid overwriting sync data with defaults. Add comprehensive tests for sync handling and filtering.

## Arbiter A
CREATE WORK ORDER

## Arbiter B
CREATE WORK ORDER

## Arbiter C
CREATE WORK ORDER
