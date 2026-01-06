# Pipe System Refactor - Council Meeting 1

## Architect
Create a dedicated pipes module with clear boundaries: entity export, spawn logic, and rendering helpers. Keep the game loop API stable and avoid behavior changes. Ensure orb spawns are separated into their own module.

## Developer
Move spawn functions into `public/js/pipes/pipeSpawner.js`, add `pipeRendering.js` to encapsulate draw behavior, and introduce `pipeEntity.js` to re-export pipe/gate entities. Split orb spawning into `public/js/orbs/orbSpawner.js`. Update game loop imports and tests to reflect new structure.

## Analyst
Refactor should preserve determinism and existing gameplay tuning. Ensure all branches in spawning and rendering logic remain tested, especially edge cases for orb spawning and low-detail pipe rendering.

## Secretary
Consensus: modularize pipes into entity/spawn/render modules, move orb spawning into its own folder, update game loop imports, and expand tests to cover spawning/rendering branches without altering behavior.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

**Decision: CREATE WORK ORDER**
