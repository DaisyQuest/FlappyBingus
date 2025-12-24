# UI Themes Specification

## Goals
- Deliver **visual-only** themes that never alter gameplay logic or rules.
- Provide **highly-parameterized** styling controls that cover the full UI surface area.
- Make the default theme configurable through the **standard configuration** (`public/js/config.js`).
- Ship a **beautiful, high-utility theme editor** in the Settings menu with sliders, color selectors, toggles, randomizers, and palette presets.

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
- **Grouped control panels** with sliders, color inputs, and toggles.
- **Live preview** (immediate application on change).

## Theme Parameters (Representative)
- Background: `bg0`, `bg1`, `bgGlow1-3`, `ambientGlow`, `parallaxOpacity`.
- Panels & surfaces: `panel`, `panelAlpha`, `panelAlt`, `surfaceBase`, `surfaceStrongAlpha`, `surfaceSoftAlpha`, `surfaceFaintAlpha`, `surfaceBorderAlpha`, `glassEnabled`, `panelBlur`.
- Typography: `text`, `muted`, `titleText`, `titleGlow`.
- Accents: `accent`, `accentStrong`, `accentAlt`, `bubble`, `deepGlow`, `ok`, `danger`.
- Buttons: `buttonStart`, `buttonEnd`, `primaryStart`, `primaryEnd`, `focus`, `sparkleEnabled`.
- Scrollbars: `scrollbarTrack`, `scrollbarThumbStart`, `scrollbarThumbEnd`.

## Progress Log
- [x] Defined theme schema, presets, and normalization in `public/js/themes.js`.
- [x] Added settings menu UI for theme management in `public/js/uiLayout.js`.
- [x] Wired theme editor initialization in `public/js/main.js`.
- [x] Applied CSS variables for theme-aware surfaces and editor styling in `public/styles/flappybingus.css`.
- [x] Added tests for theme helpers and editor rendering in `public/js/__tests__/themes.spec.js`.
- [x] Updated settings UI tests to include theme editor controls.
