# Council Meeting 1: Replay to MP4 Pipeline

## Architect
- Recommend a deterministic replay renderer that consumes stored replay JSON and emits raw frames for encoding.
- Favor a queue-backed worker service to isolate replay capture from the request path.

## Developer
- Suggest Node worker invoking headless Chromium or a canvas-backed renderer, piping frames to FFmpeg.
- Add guardrails for payload size, duration caps, and timeouts.

## Analyst
- Ensure sandboxing for any browser/FFmpeg invocation and validate replay JSON before render.
- Require audit logs for requests and output lifecycle to avoid abuse.

## Secretary
- The council agrees on a queued, deterministic rendering pipeline with validation, sandboxing, and clear limits.

## Arbiter Votes
- Arbiter 1: CREATE WORK ORDER
- Arbiter 2: CREATE WORK ORDER
- Arbiter 3: CREATE WORK ORDER

**Decision: CREATE WORK ORDER**
