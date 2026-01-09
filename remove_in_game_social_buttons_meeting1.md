# Council Meeting 1: remove_in_game_social_buttons

## Architect
We should ensure UI spec: social/support/donate buttons remain visible in main menu but removed during gameplay HUD. Update UI components controlling in-game overlay without altering menu layout.

## Developer
Identify component or template that renders in-game buttons; conditionally render only in menu state. Adjust logic to hide buttons during gameplay, leaving menu UI unchanged. Add tests for both menu and in-game states.

## Analyst
Confirm scope limited to in-game experience; avoid removing any server hooks or analytics tied to those buttons. Add coverage for branches that toggle menu vs in-game display.

## Secretary
Summary: Remove Discord/Support/Donate buttons from the in-game HUD while keeping menu buttons intact. Implement conditional rendering based on game state and add tests for both menu and in-game scenarios. Avoid altering unrelated integrations.

## Arbiter A
Vote: CREATE WORK ORDER

## Arbiter B
Vote: CREATE WORK ORDER

## Arbiter C
Vote: CREATE WORK ORDER
