# Meeting Notes
- Date: 2025-02-05
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Center the tutorial CTA within its card header.
- Relocate the Achievements and Settings navigation controls into the main info cards.
- Retire the record-holder trail hint copy while keeping unlock guidance clear.

## Discussion
- The tutorial button sat against the left edge of its header, which felt unbalanced compared to the surrounding content.
- Achievements and Settings navigation pills beneath the info grid pushed critical controls out of context with the cards they impact.
- The record-holder trail hint text referenced “Exclusive trails” verbage that needed to be removed while still explaining gating.
- Keyboard activation needed to work for the relocated nav controls because they are now label-based toggles.

## Decisions
- Center the tutorial CTA inside the how-to header and add shared card-action styling to keep CTA alignment consistent.
- Move the Achievements control beneath the trail/aura selection card and place the Settings control under the how-to checklist, wiring both to the existing radio tabs.
- Replace the record-holder hint with concise “top score” wording so the prior phrase is no longer emitted.
- Add keyboard activation to the new card nav controls to mirror click behavior when switching tabs.

## Action Items
- Ship the layout updates, hint copy change, and supporting styles.
- Keep uiLayout and trail hint tests in sync with the new structure and copy.
- Verify the full Vitest coverage suite after the UI changes.

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

# Meeting Notes
- Date: 2025-12-22
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Render the icon picker swatches with the animated trail preview icon instead of static gradients.
- Keep the background trail preview running while mirroring the same effect on the stationary launcher and option swatches.
- Ensure the new rendering path is fully covered by automated tests.

## Discussion
- Swatches currently rely on CSS gradients; they need a canvas-driven player icon with trail particles that stays stationary while emitting trails.
- A shared TrailPreview controller can drive multiple swatch canvases without spawning separate RAF loops for each button.
- TrailPreview must support a static mode and optional background-less rendering so the existing swatch chrome remains visible.
- Tests should validate both the DOM structure (canvas within swatches/launcher) and the new previewer behavior, including static emission and manual stepping.

## Decisions
- Introduce IconTrailPreviewer to manage swatch canvases via a single RAF and reuse cached icon sprites.
- Extend TrailPreview with static-mode drift, manual stepping, and background toggling to render stationary icons cleanly.
- Embed canvases inside launcher/options swatches and update styles to contain the animated trails without visual bleed.
- Expand unit coverage across icon menu helpers, TrailPreview static behavior, and the previewer manager.

## Action Items
- Monitor swatch preview performance and adjust drift parameters if animation load grows with larger icon sets.
- Reuse the previewer cache when new icons are added to avoid redundant sprite generation.
- Keep regression tests aligned with any future layout tweaks to swatch/launcher markup.
- Optimize achievements menu ergonomics and readability.
- Ensure layout changes are paired with automated coverage.

## Discussion
- The back navigation consumed a full-width row and competed with the achievements heading, slowing discovery of filters.
- The achievements container height clipped the fifth row, forcing early scrolling even with a short list.
- Subtitle text bled into the achievements view, distracting from the goals list.

## Decisions
- Move the back control into the achievements header as a compact arrow next to the title.
- Increase the default achievements list height to fit at least five rows before scrolling.
- Hide the main subtitle while the achievements view is active to keep the focus on goals.

## Action Items
- Update the achievements card header structure and styling to embed the arrow button.
- Raise the list max height in both markup and CSS to guarantee five visible rows.
- Adjust view toggling logic and tests to ensure the subtitle is hidden during achievements mode.

# Meeting Notes
- Date: 2025-12-22
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Refocus the settings menu so Skill Behaviors and Skill Keybinds are the primary content.
- Downshift Volume to a secondary position and compact the Status/Level Seed utilities.
- Align the seed input and Random button on a single line while tightening test coverage around the layout.

## Discussion
- Skill controls were mixed in with low-priority cards, so players had to scan for core customization options.
- Volume shared equal prominence with skills, and the seed/status cards visually competed despite being rarely used.
- The seed input and Random button could wrap or misalign, wasting vertical space and visual focus.
- Tests needed to enforce the new ordering, emphasis, and seed row structure to prevent regressions.

## Decisions
- Place Skill Behaviors and Skill Keybinds at the top of the settings grid as feature-spanning cards.
- Position Volume beneath the skills as a secondary card and style Status/Level Seed as compact utilities.
- Convert the seed row to a single-line grid so the Random button and seed input share height and alignment.

## Action Items
- Ship the layout, styling, and test updates that lock in the new settings hierarchy.
- Watch for any UI regressions tied to the settings grid or seed row alignment in future changes.

# Meeting Notes
- Date: 2025-12-22
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Add a Perfect Ten reward icon with high-contrast center guides for lining up perfect gaps.
- Extend icon sprite rendering to support the new centerline pattern.
- Update unlock text and automated coverage for the new cosmetic.

## Discussion
- The Perfect Ten achievement lacked a concrete cosmetic, leaving perfect-gap specialists without a visual goal.
- The new Perfect Line Beacon uses a dark shell with bright vertical and horizontal guides to aid alignment at a glance.
- Sprite generation gained a reusable centerline pattern layer so future alignment-focused icons can share the renderer without extra loops.
- Tests now exercise the unlock path and rendering branch to keep icon coverage high.

## Decisions
- Gate the Perfect Line Beacon behind the Perfect Ten achievement with explicit reward text.
- Render the beacon with a centerline overlay (vertical + horizontal bars and focal point) on a high-contrast palette.
- Keep other achievement rewards unchanged for stability while we monitor the new cosmetic path.

## Action Items
- Land the Perfect Line Beacon icon and centerline sprite support.
- Ensure tests cover both the unlock logic and the rendering path for the new pattern.
- Monitor icon picker hints to confirm the Perfect Ten reward label surfaces correctly for locked users.

# Meeting Notes
- Date: 2025-12-22
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Remove duplicated trail swatch visuals from the trail selection menu so only trail names are shown.
- Keep the launcher consistent with the simplified trail entries while maintaining accessibility.
- Update automated coverage to reflect the text-only rendering.

## Discussion
- Trail options reused the icon swatch markup, leading to identical icons for every trail and confusing users.
- The launcher also included an unused swatch canvas, causing unnecessary DOM and paint work.
- Tests asserted the presence of swatch canvases, so the expectations needed to be updated for the new text-only layout.

## Decisions
- Strip swatch and canvas elements from trail option buttons and the launcher badge, leaving only the trail name label.
- Preserve existing aria labels, lock indicators, and selection classes so keyboard and screen reader behaviors stay intact.
- Adjust UI layout and helper tests to assert the new structure without swatches.

## Action Items
- Ship the markup changes for the trail menu and launcher.
- Refresh related unit tests to validate the text-only menu and updated badge structure.

# Meeting Notes
- Date: 2025-02-02
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Add animated Fire Cape and Inferno Cape player icons inspired by Old School RuneScape.
- Gate the new icons behind single-run score achievements (1,000 and 2,000).
- Maintain full automated test coverage for the new unlocks and animations.

## Discussion
- The icon system needed lava-like motion to capture the melting cape aesthetic while staying within the existing canvas renderer.
- Unlocks should respect the existing achievement flow so the icons appear only after their score goals are completed.
- Tests must validate both the achievement wiring and the new animation path without relying on browser APIs beyond requestAnimationFrame.

## Decisions
- Introduce a reusable “lava” animation mode to the player icon sprite generator with palette controls and layered gradients.
- Define Fire Cape (1,000 score) and Inferno Cape (2,000 score) achievements and gate their icons behind those completions.
- Expand unit coverage to assert achievement gating, cache teardown for animated sprites, and the lava animation rendering path.

## Action Items
- Ship the lava animation renderer, new icon definitions, and associated achievements.
- Update tests for icon unlock logic, sprite animation, and cache cleanup behaviors to keep coverage high.

# Meeting Notes
- Date: 2025-12-22
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Center the Settings and Achievements menu titles.
- Replace the “Back to Main” buttons with large arrow controls on a contrasted background.
- Ensure layout updates are fully covered by automated tests.

## Discussion
- Existing back buttons stretched the header and pulled focus away from the titles.
- The header alignment needed to stay centered even when the back control was shown or hidden.
- A compact arrow needed its own contrasted backing so it remains visible against the menu gradient.
- Tests should assert the new structure (slots, placeholder ghost) and arrow presentation so regressions are caught.

## Decisions
- Wrap the title row in a three-column grid with a back slot, centered title shell, and placeholder to preserve centering.
- Convert the back affordances to large arrow-only labels with aria labels/tooltips for clarity.
- Add a dedicated back background style that mirrors the title’s glow/contrast for emphasis.
- Extend uiLayout tests to cover the new structure and arrow labels.

## Action Items
- Ship the header layout update and back button styling.
- Keep subtitle hiding behavior intact for the achievements view.
- Run the uiLayout test suite to confirm coverage of the new header structure.

# Meeting Notes
- Date: 2025-12-22
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Expose cooldown details for skill behavior choices and realign the settings layout hierarchy.
- Enlarge the volume controls while cleaning up overlapping utilities.

## Discussion
- Skill behavior options now sit under shared column headers to highlight cooldown-friendly versus utility-focused picks, with cooldown badges sourced from the live config.
- The volume card spans two columns with thicker sliders and trimmed copy to emphasize control size over text.
- Seed and status utilities share a row after the volume card, and the seed/random row uses a sturdier grid to prevent overlap.

## Decisions
- Render cooldown badges beneath each skill option and keep them updated through a shared `updateSkillCooldowns` hook tied to the loaded config.
- Keep the volume section visually dominant by enlarging padding/slider tracks and removing the muted note.
- Place the Level Seed and Status cards on the same row for consistent utility grouping beneath the primary settings.

## Action Items
- Verify cooldown badge values whenever production config overrides defaults.
- Watch responsive breakpoints for the skill matrix, seed row, and status alignment to ensure no wrap-induced overlap.
- Maintain uiLayout test coverage when iterating on settings copy or spacing.

# Meeting Notes
- Date: 2025-12-22
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Refresh the Game Over screen layout and typography to make scores clearer and actions easier to reach.
- Add logic to surface new personal bests immediately in the Game Over menu.
- Tighten score breakdown spacing while keeping replay/export controls accessible.

## Discussion
- The Game Over headline was centered but the surrounding copy and action rows were uneven, and the final score lacked emphasis.
- Personal bests only showed as a number; there was no celebratory indicator when a run set a new record.
- The breakdown table used wide gutters and boxed rows that felt over-segmented relative to the rest of the UI.
- Primary actions (restart, retry seed, main menu) needed to sit above the score summary, with replay/export controls anchored at the bottom.

## Decisions
- Center the headline/subtitle, move primary actions directly under the headline, and place replay/export controls at the bottom of the card.
- Introduce a large, bright final-score display with a slightly enlarged personal best line plus a badge and status line that light up on new PBs.
- Rework the breakdown list into a tighter grid with larger type and reduced column gaps to soften the segmentation.
- Add helper utilities to compute/update PB state so network/guest flows stay consistent.

## Action Items
- Implement the Game Over layout and typography changes, including the new PB badge and status text.
- Update score breakdown styles to use the compact grid and larger text sizing.
- Add targeted unit tests for the PB helpers and the updated Game Over layout.
