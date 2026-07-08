# GameTracker fork of IoTSharp/lvgl-editor

Upstream: [IoTSharp/lvgl-editor](https://github.com/IoTSharp/lvgl-editor) (MIT).

## GameTracker changes

- **English UI** — strings in `src/` translated from Chinese; `index.html` uses `lang="en"`.
- Translation tooling: `scripts/apply-en-ui.mjs`, `scripts/en-ui-translations.json` (see `scripts/README.md`).

To re-apply translations after merging upstream: `node scripts/apply-en-ui.mjs` from this directory.
