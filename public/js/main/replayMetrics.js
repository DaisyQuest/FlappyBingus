// ==================================
// FILE: public/js/main/replayMetrics.js
// ==================================
// Module boundary: replay size measurement with cached encoder.

export function createReplayBytesMeasurer({ TextEncoderImpl = TextEncoder } = {}) {
  const encoder = TextEncoderImpl ? new TextEncoderImpl() : null;

  return function measureReplayBytes(replayJson) {
    if (typeof replayJson !== "string") return 0;
    if (!encoder) return replayJson.length;
    return encoder.encode(replayJson).byteLength;
  };
}
