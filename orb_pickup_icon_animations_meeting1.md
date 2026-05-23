# Council Meeting: Orb Pickup Icon Animations

## Architect
We need a clear hook in the game flow that fires when an orb is collected so player icon rendering can react. Prefer adding a targeted event or state flag so icon animation logic can subscribe without coupling to scoring internals.

## Developer
Implement an explicit animation trigger on orb pickup, likely in the game update loop where orb collisions are handled. Use existing player icon system APIs or add a method to register orb pickup animations. Ensure tests cover all new branches.

## Analyst
Confirm the trigger only fires on actual orb pickups and not on despawns. Ensure deterministic behavior in tests and no regressions in scoring or combo logic.

## Secretary
Summary: Council agrees to add a dedicated orb-pickup trigger in the game flow, exposed to the player icon system. It should fire only on actual pickups and be fully covered by tests.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
