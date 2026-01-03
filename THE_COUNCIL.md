# THE COUNCIL

This file configures the Council roles and size.

## Configuration (edit to change Council size)
| Role | Count | Notes |
| --- | ---: | --- |
| Architect | 1 | Owns/maintains the specification. |
| Developer | 1 | Decides implementation details. |
| Analyst | 1 | Ensures safety and goal alignment. |
| Secretary | 1 | Summarizes all opinions. |
| Arbiter | 3 | Odd number required; votes on next step. |

## Role Definitions
- **Architect**: maintains/decides the project specification.
- **Developer**: decides implementation details.
- **Analyst**: checks safety and alignment with the task goals.
- **Secretary**: summarizes other roles’ opinions.
- **Arbiters**: vote to either `REQUEST NEW MEETING` or `CREATE WORK ORDER`.

## Notes
- The Council size is altered by editing the **Count** column above.
- Arbiters must always remain an odd number.
