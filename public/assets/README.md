# Assets

The game draws placeholder art at startup (`src/art/textures.ts`). To swap in real art, load an image under the same key in `Boot.preload()`. When a key already exists, the placeholder is skipped, so no other code changes.

All sizes are in game pixels. The game draws at 240x160 and scales up with nearest-neighbor filtering, so art must use whole pixels and no anti-aliasing.

## Textures

| Key | Size | Layout | Used by |
|---|---|---|---|
| `title-bg` | 240x160 | One image: sky, sun, mountains, skyline, street. No text. | Title, Options |
| `ui-panel` | 7x7 | 9-slice with 3px corners. From the outside in: 1px ink, 1px parchment, 1px wood, then cream. The 1x1 center stretches. | `src/ui/Panel.ts` |
| `ui-cursor` | 6x7 | Right-pointing gold menu arrow on a transparent background. | `src/ui/Menu.ts` |

## Fonts

| File | Family key | License |
|---|---|---|
| `fonts/press-start-2p.woff2` | `PressStart2P` | SIL OFL 1.1, see `fonts/OFL-PressStart2P.txt` |
| `fonts/vt323.woff2` | `VT323` | SIL OFL 1.1, see `fonts/OFL-VT323.txt` |

Both are the Latin subsets from Google Fonts. Use Press Start 2P at 8px (or 16px for titles), so each glyph pixel lands on a game pixel. It is monospaced: each character is exactly `size` pixels wide.
