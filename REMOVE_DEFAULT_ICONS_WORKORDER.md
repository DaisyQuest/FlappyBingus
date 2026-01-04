# REMOVE_DEFAULT_ICONS Work Order

- [x] Identify and remove any "default icon" data structures or references, ensuring a single icon registry source of truth.
- [x] Update menu sync, login sync, and unlockable sync to consume the single icon registry source.
- [x] Update and expand tests to cover all icon sync code paths, ensuring defaults are not referenced.
- [x] Verify icon registry responses and storage are consistent with the new single source of truth.
