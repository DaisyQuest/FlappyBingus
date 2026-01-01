# Background Generator Studio (BGS) Spec

## Goals
- Provide a modular background configuration system that can be stored as JSON files or MongoDB documents.
- Deliver an approachable, production-ready UX for building looping backgrounds with time-based effects.
- Ensure preview playback matches in-game rendering exactly.
- Support full JSON export/import with a playback timeline for a ~3 minute loop.

## Non-goals
- Full WYSIWYG scene editor with drag-to-place controls (out of scope for this iteration).
- Multi-track keyframe interpolation for every parameter (limited to base color crossfades and effect lifetimes).

## Data Model
### BackgroundConfig (top-level)
```
{
  id: string,
  name: string,
  loopSeconds: number,
  global: {
    baseColor: string,
    gradient: {
      shape: "linear" | "radial",
      colors: [string, string],
      angleDeg?: number,
      center?: { x: number, y: number },
      radius?: number,
      opacity?: number
    },
    glow: {
      color: string,
      intensity: number,
      radius: number,
      position: { x: number, y: number }
    }
  },
  timeline: [
    { id: string, type: "baseColorChange", time: number, color: string, transition?: number },
    { id: string, type: "particleBurst", time: number, x: number, y: number, count: number, color: string, speed: number, spread: number, life: number },
    { id: string, type: "randomGlow", time: number, x?: number, y?: number, color: string, radius: number, intensity: number, duration: number, randomize?: boolean }
  ]
}
```

### Timeline Rules
- `time` is in seconds and wraps at `loopSeconds`.
- Events fire when the playback time crosses their timestamp.
- `baseColorChange` applies to all frames after its time, with optional crossfade.

## Rendering Behavior
1. Fill base color (global or last baseColorChange event).
2. Apply gradient overlay (shape, colors, angle/center, opacity).
3. Apply global glow.
4. Render active random glow events (fade in/out over duration).
5. Render particle bursts (position, spread, fade with lifetime).

## Storage & APIs
- JSON file: default stored at `public/backgrounds/background-config.json`.
- MongoDB: stored in `background_configs` collection, document `_id = "active"`.
- API
  - `GET /api/background-configs` -> `{ ok, config, meta }`
  - `PUT /api/background-configs` -> `{ ok, config, meta }`

## BGS UX
- Two-column layout: left for configuration, right for preview/timeline.
- Global section: base color, gradient controls, glow controls.
- Timeline section: grouped event cards, add buttons per event type.
- Playback: play/pause, scrub slider, current time display, loop length.
- Export/Import: JSON text area with copy/download/apply.

## Determinism
- Event ordering and randomization are seeded via injected RNG.
- Timeline evaluation is based on loop time and event ordering.

## Checklist
- [x] Background config schema + normalization utilities implemented.
- [x] Renderer produces identical output between BGS preview and game.
- [x] Server storage supports JSON + MongoDB persistence.
- [x] BGS UI created at `/bgs` with timeline + export/import.
- [x] Game loads and uses active background config.
- [x] Tests cover new config store, renderer, and routes.
