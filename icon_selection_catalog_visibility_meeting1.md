# Council Meeting 1: Icon Selection Catalog Visibility

## Architect
The icon catalog returned after selection must remain consistent with admin-defined overrides. The fix should ensure catalog responses always include custom icons so the UI does not regress to base defaults.

## Developer
The icon save endpoint returns the visible catalog. If the menu filter excludes custom icons, the client overwrites its catalog. We should merge custom icon ids into the visible list before applying menu filters, and add server route tests for this behavior.

## Analyst
We need a fundamental server-side fix with tests proving that `/api/cosmetics/icon` returns custom icons even when menu allowlists are present. This prevents UI resets without client hacks.

## Secretary
Summary: The regression occurs because icon save responses can exclude admin-defined icons when the visible catalog is filtered. The fix should adjust server catalog building to keep custom icons visible and add coverage for `/api/cosmetics/icon` responses.

## Arbiter A
CREATE WORK ORDER

## Arbiter B
CREATE WORK ORDER

## Arbiter C
CREATE WORK ORDER
