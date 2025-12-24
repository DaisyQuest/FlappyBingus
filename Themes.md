# UI Themes Specification

## Goals
- Deliver **visual-only** themes that never alter gameplay logic or rules.
- Provide **highly-parameterized** styling controls that cover the full UI surface area.
- Make the default theme configurable through the **standard configuration** (`public/js/config.js`).
- Ship a **beautiful, high-utility theme editor** accessible from the main menu with sliders, color selectors, toggles, randomizers, and palette presets.

## Scope & Coverage
Themes control the UI layer via CSS variables applied to the root document. Coverage includes:
- **Menu shell**: background gradients, parallax ambience, panel glass styling, title glow, subtitle tone.
- **Cards & panels**: surfaces, borders, shadows, subtle fills.
- **Buttons & toggles**: base gradients, hover states, focus rings, sparkle overlays.
- **Typography**: primary text, muted text, title styling.
- **Accents & status**: accent highlights, success and danger tones, UI glow accents.
- **Settings surfaces**: sliders, inputs, badges, pill indicators, utility cards.
- **Scrollbars**: track and thumb gradients.
- **Canvas tint**: visual overlay only (no gameplay impact).
- **Pipe visuals**: pipe color palette (visual only).

If new UI components are introduced, they should map to existing theme variables or introduce new ones with editor controls to preserve full coverage.

## Default Theme Configuration
- Default theme selection is read from `public/js/config.js`:
  - `DEFAULT_CONFIG.ui.themes.defaultThemeId`
- The built-in presets are defined in `public/js/themes.js` and can be extended in code.

## Theme System Design
### Core Data
- Theme values are stored as a dictionary of high-level parameters (colors, opacities, numeric ranges, toggles).
- Values are normalized for safety before being applied.
- CSS variables are applied through `applyThemeValues()` in `public/js/themes.js`.

### Preset Handling
- Presets live in `THEME_PRESETS` within `public/js/themes.js`.
- Presets are merged with `THEME_DEFAULT_VALUES` to ensure complete coverage.
- Selection is saved in `localStorage` under `bingus_theme_state`.

### Editor UX Requirements
- **Preset selector** with explicit custom theme option.
- **Palette capsules** for related color groups.
- **Randomize all** and **shuffle accents** actions.
- **Export / import** base64 payloads for sharing.
- **Grouped control panels** with sliders, color inputs, and toggles.
- **Live preview** (immediate application on change).

## Theme Parameters (Representative)
- Background: `bg0`, `bg1`, `bgGlow1-3`, `ambientGlow`, `parallaxOpacity`.
- Panels & surfaces: `panel`, `panelAlpha`, `panelAlt`, `surfaceBase`, `surfaceStrongAlpha`, `surfaceSoftAlpha`, `surfaceFaintAlpha`, `surfaceBorderAlpha`, `glassEnabled`, `panelBlur`.
- Typography: `text`, `muted`, `titleText`, `titleGlow`.
- Accents: `accent`, `accentStrong`, `accentAlt`, `bubble`, `deepGlow`, `ok`, `danger`.
- Buttons: `buttonStart`, `buttonEnd`, `primaryStart`, `primaryEnd`, `focus`, `sparkleEnabled`.
- Pipes: `pipeGreen`, `pipeBlue`, `pipeWisteria`, `pipeRed`.
- Scrollbars: `scrollbarTrack`, `scrollbarThumbStart`, `scrollbarThumbEnd`.

## Progress Log
- [x] Defined theme schema, presets, and normalization in `public/js/themes.js`.
- [x] Added main menu theme launcher + overlay editor UI in `public/js/uiLayout.js`.
- [x] Wired theme editor initialization, pipe palette sync, and overlay controls in `public/js/main.js`.
- [x] Applied CSS variables and theme studio styling in `public/styles/flappybingus.css`.
- [x] Added tests for theme helpers, import/export, and editor rendering in `public/js/__tests__/themes.spec.js`.
- [x] Updated UI layout tests to include theme launcher + overlay controls.

## Import / Export Schema
Theme exports are **base64-encoded JSON** using a fixed schema and strict validation to prevent unsafe input:

```json
{
  "version": 1,
  "themeId": "custom",
  "values": {
    "...": "theme field values only"
  }
}
```

- `version` must match the supported export version.
- `values` only accepts known theme fields and is normalized before use.
- Unknown keys are ignored; invalid payloads are rejected.
