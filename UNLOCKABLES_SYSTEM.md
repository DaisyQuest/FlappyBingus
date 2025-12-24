# Unlockables System

This project now models **unlockables** as first-class, data-driven items that can be unlocked by score, achievements, ownership, or record-holder status. The system supports multiple unlockable types, unified unlock rules, and retroactive unlock synchronization.

## Goals
- **Single abstraction** for all cosmetic unlocks (trails, player textures, pipe textures).
- **Retroactive unlock sync** so existing players receive unlocks when new content is introduced.
- **Scalable display modes** for pipe textures to adapt to hardware performance.

## Unlockable Types
Unlockables are grouped by type (see `services/unlockables.cjs` and `public/js/unlockables.js`):

- `trail`
- `player_texture`
- `pipe_texture`

Each unlockable entry contains:
- `id`: stable identifier used for selection
- `name`: display name
- `type`: one of the unlockable types above
- `unlock`: unlock requirement metadata

## Unlock Rules
Supported unlock rules (normalized by `normalizeUnlock`) include:
- `free`: always unlocked
- `score`: unlocks at a minimum score threshold
- `achievement`: unlocks when achievement is earned (with optional score fallback)
- `purchase`: unlocks when the item is owned
- `record`: unlocks for record holders

`describeUnlock` (client) and `normalizeUnlock` (server/client) enforce consistent labels and defaults.

## Retroactive Unlock Sync
Unlock sync happens in `ensureUserSchema` (server) and during score submission:

- `syncUnlockablesState` recalculates unlocks based on current user progress.
- Any unlocks that should already be unlocked are marked retroactively.
- Server responses always include `unlockedPipeTextures` so clients remain consistent.

## Pipe Textures + Display Modes
Pipe textures live in:
- `services/pipeTextures.cjs` (server data/normalization)
- `public/js/pipeTextures.js` (client rendering)

Each pipe texture supports **five display modes**:
- `MONOCHROME`
- `MINIMAL`
- `NORMAL`
- `HIGH`
- `ULTRA`

Display modes scale detail and effects to keep rendering performant on different hardware.

## API & UI Integration
New endpoints and UI support:

- `POST /api/cosmetics/pipe_texture`
  - payload: `{ "textureId": "basic", "mode": "NORMAL" }`
  - validates unlocks + persists selection

- `GET /unlockables`
  - HTML gallery by default
  - JSON when `Accept: application/json` or `?format=json`

Client UI wiring lives in:
- `public/js/main.js` for selection
- `public/js/pipeTextureMenu.js` for menu rendering
- `public/styles/flappybingus.css` for styling

## Extending Unlockables
To add new unlockables:
1. Add definitions to the relevant catalog (`TRAILS`, `PLAYER_ICONS`, `PIPE_TEXTURES`).
2. Ensure the unlock metadata reflects intended progress.
3. The unlockables catalog and unlock sync will auto-include the new item.
