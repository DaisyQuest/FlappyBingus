# Icon Pipeline MongoDB Meeting 1

## Architect
Store icon definitions as first-class MongoDB documents and load them through a single pipeline that also enforces server-config visibility.

## Developer
Implement a shared icon repository/service that reads from MongoDB and replaces legacy config-embedded definitions and /icons overrides, then update sync to consume that service.

## Analyst
Ensure data migration path is safe, unlockables handling is simplified without losing required functionality, and tests cover legacy and new flows.

## Secretary
Consensus: consolidate icon storage into MongoDB-backed service; keep visibility in server config; simplify unlockable logic; unify sync and /icons handling; add thorough tests.

## Arbiter A
CREATE WORK ORDER

## Arbiter B
CREATE WORK ORDER

## Arbiter C
CREATE WORK ORDER
