# English UI tooling

Upstream ships a Chinese UI. GameTracker keeps English strings in `src/` and these scripts to refresh them after upstream merges.

| File | Role |
|------|------|
| `apply-en-ui.mjs` | Replace Chinese UI strings in `../src/` |
| `en-ui-translations.json` | ~1,045 zh→en pairs |
| `build-en-translations.mjs` | Regenerate the map (optional) |

```bash
node scripts/apply-en-ui.mjs
```
