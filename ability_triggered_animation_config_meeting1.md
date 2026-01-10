# Council Meeting 1: Ability Triggered Animation Config

## Architect
Add a configuration layer that defines a global default ability effect and per-skill overrides, extend animation schema for triggered animations, and integrate with the existing event-animation path in iconAnimationEngine via a registry-based resolver.

## Developer
Implement a pure event-to-effect resolver that checks per-skill overrides then defaults; integrate with EVENT_TYPES handling in iconAnimationEngine without mixing mapping with sampling; add tests for mapping, engine timing, and reduced-motion behavior.

## Analyst
Ensure no behavioral regressions in event handling, keep resolver stateless and registry-based, and validate reduced-motion policy for event-triggered animations via tests.

## Secretary
Summary: Consensus to add a registry-based event-to-effect resolver with default and per-skill overrides, integrate with existing event animation path in iconAnimationEngine, and add thorough unit/engine tests including reduced-motion handling.

## Arbiters
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

Decision: CREATE WORK ORDER
