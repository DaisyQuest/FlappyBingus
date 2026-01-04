# Replay → MP4 Server Pipeline (Design)

## Goals
- Convert stored replay JSON into MP4 assets suitable for sharing/embedding.
- Run entirely on the server with deterministic output given the same replay payload.
- Keep the request path fast by offloading heavy work to a queue/worker.
- Enforce strict safety controls (limits, validation, sandboxing).
- Provide observability, retries, and lifecycle management for outputs.

## Non-Goals
- Client-side encoding in the browser.
- Realtime streaming of the MP4 while encoding.
- Supporting arbitrary user-uploaded video formats.

## Inputs & Output
- **Input**: Stored replay JSON (same shape as `/api/best-run` payloads, including `ticks`, optional `rngTape`, and seeds).
- **Output**: MP4 (H.264/AAC or H.264/no-audio), plus metadata describing resolution, duration, replay hash, and encode settings.

## Existing Building Blocks
- Replay JSON storage and validation are already performed server-side (`services/bestRuns.cjs`).
- Replay playback utilities exist in the client code (`public/js/replayUtils.js`, `public/js/replayManager.js`).
- Best-run upload endpoints and replay browser data are served by `server.cjs`.

## High-Level Architecture

```
Client
  │
  ├─ POST /api/replays/:id/render-mp4  ─┐
  │                                     │
  │                                 Render Queue (Redis/SQS/DB)
  │                                     │
  │                                 Render Worker (Node)
  │                                     │
  │  ┌──────────────────────────────────┴─────────────────────────┐
  │  │  1) Fetch replay JSON + assets                               │
  │  │  2) Validate + hydrate + determine settings                  │
  │  │  3) Deterministic render to raw frames                        │
  │  │  4) Encode frames to MP4 via FFmpeg                           │
  │  │  5) Store MP4 + metadata in object storage                    │
  │  └──────────────────────────────────────────────────────────────┘
  │                                     │
  └────────────── GET /api/replays/:id/mp4 ──> CDN / object storage
```

## API Surface

### 1) Request render
`POST /api/replays/:id/render-mp4`
- Auth: same auth/ratelimit policy as replay endpoints.
- Body: optional render options (resolution, scale, fps caps) subject to server-side constraints.
- Response: `{ ok: true, jobId, statusUrl }`.

### 2) Query render status
`GET /api/replays/:id/render-mp4/status`
- Response: `{ status: "queued" | "running" | "failed" | "complete", detail, mp4Url? }`.

### 3) Fetch MP4
`GET /api/replays/:id/mp4`
- 302 redirect to object storage/CDN URL or 404 if not ready.

## Queue / Worker Design
- **Queue**: Redis-backed (BullMQ), SQS, or DB-backed job table.
- **Job payload**:
  - `replayId`, `replayHash`, `requestedBy`, `requestedAt`, `renderProfile`.
- **Idempotency**:
  - If `replayHash + renderProfile` already exists, return existing asset.
- **Retries**:
  - Max 3 retries with exponential backoff. Hard failures return `failed` with a reason.

## Deterministic Rendering

### Render Pipeline
1. **Load & validate replay JSON**
   - Reuse existing validation logic (ticks length, replay bytes cap) and verify `ticks` non-empty.
2. **Hydrate replay**
   - Normalize missing fields (seed defaults, rngTape vs seed).
3. **Deterministic renderer**
   - Run in a headless environment with a deterministic clock.
   - Drive game simulation with a fixed timestep (e.g., 60 FPS) and a deterministic RNG source:
     - Prefer `rngTape` if present; fallback to seeded RNG.
4. **Frame capture**
   - Draw each frame to an offscreen canvas.
   - Capture frames as raw RGBA or PNG sequence.
5. **FFmpeg encode**
   - Pipe frames into FFmpeg using `image2pipe` or raw video input.
   - Encode to MP4 (`libx264`), constant rate factor (CRF 20–24) and capped bitrate.

### Engine/Renderer Options
- **Headless Chromium**: Use Puppeteer to render offscreen canvas in a controlled sandbox.
- **Node Canvas + WebGL**: If renderer supports it, run a Node canvas renderer without a browser.
- **Deterministic clock**: Do not rely on `requestAnimationFrame` timing.

## Safety & Limits
- **Replay size cap**: enforce `MAX_REPLAY_BYTES` before enqueue.
- **Duration cap**: reject replays longer than `N` seconds or `ticksLength` beyond a threshold.
- **Resolution cap**: allow only a server-defined list (e.g., 720p, 1080p).
- **Concurrency**: cap worker concurrency; use per-user rate limit on render requests.
- **Sandboxing**: isolate FFmpeg and headless browser in a container or restricted OS sandbox.
- **Timeouts**: worker kill after max wall time (e.g., 5 minutes).

## Storage & Delivery
- **Object storage**: S3/GCS-compatible bucket.
- **Keying**: `replays/{replayId}/{replayHash}/{profile}/render.mp4`.
- **Metadata**: store in DB with duration, resolution, bytes, encoding parameters, and timestamps.
- **Lifecycle**: auto-expire after 30–90 days or keep best-run MP4s indefinitely.
- **CDN**: serve through CDN for caching and bandwidth control.

## Observability
- Structured logs per job: `jobId`, `replayId`, `replayHash`, duration, retries, error type.
- Metrics: queue depth, render time p95, encode time p95, success rate.
- Traces: a single trace across API request → queue enqueue → worker execution.

## Failure Modes & Recovery
- **Invalid replay**: fail fast with `invalid_replay`.
- **Oversized replay**: reject at request time.
- **Render crash**: retry with backoff; mark failed after N attempts.
- **FFmpeg errors**: classify as `encode_failed` with stderr captured.

## Security Considerations
- Validate and sanitize all replay inputs.
- Do not execute untrusted scripts in browser context.
- Run worker with least privilege; no direct access to secrets beyond storage creds.

## Testing Expectations (High Coverage)

### Unit Tests
- Validation logic for replay size, duration, and ticks presence.
- Render profile normalization and limit enforcement.
- Job idempotency logic: same replay hash returns existing asset.

### Integration Tests
- Queue enqueue → worker execution → stored MP4 metadata.
- Deterministic render output hash for a fixed replay payload.
- Retry behavior for simulated render/encode failures.

### Contract Tests
- API responses for request/status/mp4 endpoints.
- Authorization + rate-limit failure cases.

### Load/Stress Tests
- Burst enqueue with concurrency cap enforcement.
- Storage failures (S3 throttle) and backoff behavior.

## Implementation Milestones
1. Add API endpoints for render request/status/mp4.
2. Implement queue-backed worker and replay renderer.
3. Integrate FFmpeg encoding.
4. Store metadata + asset in object storage.
5. Add comprehensive tests for all branches.
