# Council Meeting 1: Replay MP4 Test Coverage

## Architect
Add tests to cover invalid profile ID, unknown replay ID, and getMp4 non-ready statuses, asserting ok:false and error strings.

## Developer
Implement new spec cases in services/__tests__/replayMp4Pipeline.spec.js mirroring existing test setup and asserting exact error values.

## Analyst
Ensure coverage of error branches for getStatus/getMp4 with invalid inputs and non-ready statuses; verify expectations align with current API responses.

## Secretary
Summary: Council agrees to add thorough tests for getStatus and getMp4 error branches with explicit ok:false and error string assertions.

## Arbiter A
Vote: CREATE WORK ORDER

## Arbiter B
Vote: CREATE WORK ORDER

## Arbiter C
Vote: CREATE WORK ORDER
