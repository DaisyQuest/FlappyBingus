# Work Order: Decouple cosmetic selection from auth state

- [x] Remove auto-login during cosmetic selection; keep guest selections local and skip server saves.
- [x] Prevent cosmetic save failures from clearing auth state.
- [x] Add no-reauth mode to user hint updates and use in cosmetic error paths.
- [x] Update/add tests for guest cosmetic selection, unauthorized responses, and no-reauth behavior.
- [x] Mark tasks completed as changes are delivered.
