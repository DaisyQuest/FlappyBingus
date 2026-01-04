# IMPLEMENT REPLAY TO MP4 PIPELINE WORK ORDER

## Checklist
- [x] Add render request/status/mp4 endpoints in server.
- [x] Implement replay render job queue + worker execution.
- [x] Integrate deterministic replay renderer and FFmpeg encoding.
- [x] Add storage abstraction for MP4 artifacts + metadata.
- [x] Implement safety limits (duration, size, resolution) and rate limiting.
- [x] Add comprehensive tests for all new code paths and failure modes.
