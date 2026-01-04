# ICON LOADING SIMPLIFICATION WORK ORDER

## Goals
- Remove ICONS_BASE fallback behavior and unify icon loading.
- Ensure /icon utility-generated icons are first-class assets in the same loading pipeline.
- Modularize icon loading code and add thorough tests for all branches.

## Tasks
- [x] Locate ICONS_BASE usage and document current icon loading flow.
- [x] Refactor icon loading to a single, explicit pipeline (no fallback hackery).
- [x] Ensure /icon utility icons load under the unified pipeline.
- [x] Add/expand tests to cover all branches and error conditions.
- [x] Update any documentation or configuration needed for the new loading flow.
