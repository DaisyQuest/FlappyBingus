# Meeting Notes
- Date: 2025-12-22
- Attendees: ChatGPT (GPT-5.1-Codex-Max)

## Agenda
- Improve tutorial readability and clarity
- Adjust movement and skill lessons for better feel
- Ensure tutorial respects chosen skill variants
- Verify bounce lesson reliability
- Confirm full test coverage remains intact

## Discussion
- Tutorial overlay should mirror the main menu’s bubbly branding while dropping the heavy panel for better in-game visibility.
- Movement lesson needs a shorter path and faster player speed so newcomers reach the goal quickly.
- Slow Field lesson must override any explosive preference to always teach the slowing variant, while the explosion lesson explicitly selects the blast mode.
- Bounce lesson should use a moving wall like real gameplay and credit completion more reliably after a successful ricochet.
- Added targeted tests to lock in the new behaviors and prevent regressions.

## Decisions
- Use a free-floating, high-contrast overlay with gradient “bubbly” headers and explicit hotkey callouts.
- Boost player speed only during the movement step and restore defaults afterwards.
- Force Slow Field behavior to "slow" during its lesson, and to "explosion" in its dedicated step, regardless of prior settings.
- Refresh the dash reflect scenario with a moving wall, larger landing ring, bounce-distance tracking, and automatic respawn if the wall exits early.

## Action Items
- Land the tutorial refinements and accompanying tests in the repository.
- Keep monitoring tutorial coverage if future overlay tweaks arrive.
- If players still struggle with the bounce line, consider adding a short visual trajectory hint in a follow-up.
