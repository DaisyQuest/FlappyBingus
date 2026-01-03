# Agent Workflow Framework

This file defines the required workflow for all agents working in this repository.

## Trigger
- **Always follow this workflow** unless the prompt includes the exact token `NOMEETING`.

## Council Configuration
- The Council is configured in `THE_COUNCIL.md`.
- To change the Council size, **edit the counts/roster in `THE_COUNCIL.md`** (see the Configuration section in that file).

## Required Workflow
1. **Read the prompt input** (normal first step).
2. **Generate a task name** and create `$TASKNAME.md` using:
   - ALL CAPS
   - UNDERSCORE SEPARATED
   - Example: `MY_NEW_TASK.md`
3. **Create a meeting file** named `$taskname_meeting#.md`:
   - `$taskname` = lowercase version of `$TASKNAME`
   - `#` starts at `1` and increments for additional meetings.
   - Example: `my_new_task_meeting1.md`
4. **Hold the Council meeting** in that file **before any implementation**:
   - Each role defined in `THE_COUNCIL.md` must leave an opinion.
   - The **Secretary** summarizes all opinions.
   - **Arbiters** vote and must choose **one** outcome:
     - `REQUEST NEW MEETING`
     - `CREATE WORK ORDER`
5. If the Arbiter decision is **REQUEST NEW MEETING**:
   - Create the next meeting file and repeat the Council process.
6. If the Arbiter decision is **CREATE WORK ORDER**:
   - Create `$TASKNAME_WORKORDER.md`.
   - The work order **must be completed before merging**.
7. If another task’s work order exists:
   - It may be read for context but **must not be edited**.

## Work Order Expectations
- The work order should be concise and actionable.
- Mark tasks as completed as you finish them.

## Efficiency
- Keep Council notes brief and goal-oriented.
- Avoid redundant commentary.
