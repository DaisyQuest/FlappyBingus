# ICON PIPELINE MONGODB WORK ORDER

## Goals
- Store icon definitions as first-class MongoDB documents instead of embedded in server config.
- Keep server config as the authority for icon visibility.
- Ensure all icon definitions (including /icons) load through one pipeline and sync treats them uniformly.
- Simplify unlockables logic by removing local unlock save paths.
- Add thorough tests for the new pipeline and unlockables changes.

## Tasks
- [x] Locate current icon definition storage, /icons loading, sync logic, and unlockables handling.
- [x] Implement MongoDB-backed icon definition storage and migration/seeding as needed.
- [x] Replace legacy icon loading paths with a single icon definition pipeline.
- [x] Update sync to treat all icons consistently via the shared pipeline.
- [x] Simplify unlockables logic to remove local unlock persistence.
- [x] Update/add tests to cover icon loading, visibility, sync, and unlockables changes.
