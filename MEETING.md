# Meeting Notes
- Date: 2025-12-22
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Diagnose player icon selection failures (red icon reporting server unavailable)
- Improve API client error handling to distinguish offline vs validation errors
- Preserve icon selection when the server is temporarily unreachable
- Expand automated coverage around API responses and icon save flows

## Discussion
- Request helpers were collapsing all non-2xx responses into a generic offline/null state, which caused UI flows (like icon saves) to report “server unavailable” even for validation/auth errors.
- Icon saves reverted to the previous icon whenever the API call failed, preventing local selection when the backend was down and hiding useful error context.
- A reusable classifier for icon save responses can keep UI hints consistent while making it obvious when the user needs to re-authenticate versus when the server is actually offline.
- Tests needed to cover the new response shapes (status/error) and the icon save classifier to avoid future regressions.

## Decisions
- Return structured objects from API helpers that include status/error metadata instead of nulling on HTTP errors.
- Keep icon selections applied locally when the backend is unreachable, but explicitly revert on locked/unauthorized responses.
- Introduce a dedicated classifier to drive icon save UI states so messages stay accurate across error types.
- Add targeted unit tests for the API helper behavior change and the icon save classifier.

## Action Items
- Land the API response normalization changes and icon save handling improvements with full test coverage.
- Monitor any downstream UI flows that rely on API helpers to ensure they check `res.ok` rather than only null.
- If additional cosmetics flows show similar issues, reuse the classifier pattern to align messaging and recovery paths.

# Meeting Notes
- Date: 2025-12-22
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Improve readability of the achievements menu and add filtering options for score, perfect gaps, and orb collection.
- Ensure UI changes are fully covered by automated tests.

## Discussion
- Existing achievements list only supported a hide-completed toggle and presented dense rows, making it hard to scan categories.
- Filtering needed to differentiate between score, perfect-gap, and orb-driven achievements without losing access to special unlocks.
- Test coverage needed to validate new filters, metadata rendering, and classification helpers.

## Decisions
- Introduce category-aware filters (Score, Perfect Gaps, Orb Collection) alongside hide-completed.
- Add clearer headers, requirement summaries, and category tags to each achievement row for scannability.
- Keep special achievements always discoverable while honoring user-selected filters.

## Action Items
- Ship UI and rendering updates with comprehensive unit tests for classification and filtering behavior.
- Monitor for any regressions in achievement rendering or filtering across future changes.

# Meeting Notes
- Date: 2025-12-29
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Repair the dash bounce tutorial scenario so a corner spawns reliably near the player.
- Require a two-wall ricochet within one dash instead of aiming for a distant target ring.
- Strengthen test coverage for the new bounce flow and state resets.

## Discussion
- The moving bounce wall could miss the player entirely, so the lesson failed before it began.
- A stationary L-shaped corner keeps the interaction predictable and removes timing risk.
- Progress should be tied to bounce events (two unique walls in one dash) instead of a landing ring.
- Tests need to assert the new geometry, success condition, and per-dash reset logic.

## Decisions
- Spawn two perpendicular, stationary walls to create a 90° corner in front of the player.
- Track bounce events by contact point, clearing progress whenever a new dash starts.
- Advance the tutorial after two distinct wall contacts within a single dash, without any target zone.

## Action Items
- Implement the corner scenario, bounce tracking, and success delay.
- Add regression tests that cover the geometry, success criteria, and reset-on-new-dash behavior.

# Meeting Notes
- Date: 2025-01-06
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Revamp the player icon selection UX to use a focused launcher plus modal overlay.
- Remove the rectangle frames around icons while preserving theme styling.
- Ensure locked icons communicate unlock requirements with hover hints.
- Expand automated coverage for the new icon menu helpers and layout changes.

## Discussion
- The main menu should highlight only the currently equipped icon to reduce clutter; a dedicated launcher opens a full-screen selector when needed.
- The overlay needs to respect existing gradients, glows, and typography while dropping the rectangular button chrome in favor of the circular swatch focus.
- Locked icons require a visible lock badge and contextual hover copy sourced from existing unlock descriptors.
- Tests must exercise the new renderer, hint reset behavior, overlay toggling, and layout references so regressions are caught early.

## Decisions
- Replace the inline grid with a single launcher button that mirrors the selected icon and name.
- Add a modal-style overlay containing the icon grid, lock badge, hover hint area, and close controls.
- Keep swatch styling centralized via helper utilities so both the launcher and overlay share the same defaults.
- Update layout refs and CSS to remove the old card borders and align with the existing accent/glow theme.

## Action Items
- Implement the icon menu helper module (swatch styling, render, hover text, overlay toggling).
- Wire the main menu launcher to open/close the overlay and refresh selections, including lock handling.
- Refresh CSS to remove rectangular frames, add lock badges, and style the overlay/launcher per theme.
- Add unit tests for the new helpers and adjust layout tests to assert the new refs and hidden overlay state.
