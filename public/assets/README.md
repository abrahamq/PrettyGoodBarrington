# Assets

The game draws placeholder art at startup (`src/art/textures.ts`). To swap in real art, load an image under the same key in `Boot.preload()`. When a key already exists, the placeholder is skipped, so no other code changes.

All sizes are in game pixels. The game draws at 240x160 and scales up with nearest-neighbor filtering, so art must use whole pixels and no anti-aliasing.

## Character sprites

`npm run export:sprites` saves the player and NPC art from `src/art/people.ts` as PNGs in `assets/sprites/`, one file per key below. Boot loads them, so a pixel edit made in Aseprite, Piskel, or LibreSprite shows in the game. The script skips files that already exist. To redraw one from `people.ts`, delete it and run the script again.

## Textures

| Key | Size | Layout | Used by |
|---|---|---|---|
| `title-bg` | 240x160 | One image: sky, sun, mountains, skyline, street. No text. | Title, Options, Character Select |
| `ui-panel` | 7x7 | 9-slice with 3px corners. From the outside in: 1px ink, 1px parchment, 1px wood, then cream. The 1x1 center stretches. | `src/ui/Panel.ts` |
| `ui-cursor` | 6x7 | Right-pointing gold menu arrow on a transparent background. | `src/ui/Menu.ts` |
| `ui-pick-arrow` | 7x4 | Down-pointing gold arrow over the chosen boy. | Character Select |
| `ui-stamp` | 10x10 | Red stamp icon for the HUD stamp count. | UI scene |
| `ui-arrow` | 7x4 | Up-pointing arrow; the game rotates it for the other d-pad buttons. | `src/ui/TouchControls.ts` |
| `ui-more` | 5x3 | Small down arrow: "tap for more" in the dialogue box. | `src/ui/DialogueBox.ts` |
| `tiles` | 128x96 | The overworld tileset: 16x16 tiles, 8 per row, in the order of `TILE_ART` in `src/map/tileset.ts`. Must match `public/maps/tiles.png`. | Overworld |
| `player-five`, `player-eleven`, `player-fifteen` | 36x64 each | One spritesheet per boy, of 12x16 frames. Rows, top to bottom: facing down, left, right, up. Columns: standing, left foot forward, right foot forward. Frames are numbered 0-11 row by row. Feet are on the bottom row of each frame; the boys are 11, 14, and 16 pixels tall. Load a real one with `this.load.spritesheet('player-five', url, { frameWidth: 12, frameHeight: 16 })`. | Character Select, Overworld |
| `soco-bg` | 240x160 | The inside of SoCo Creamery: wall, wainscot, floor, lamp, flavor board (swatches only), counter, ice cream case, tip jar. | Scoop Stack |
| `cone` | 16x22 | The waffle cone (rows 0-17) in its holder (rows 17-21). The first scoop sits on row 0. | Scoop Stack |
| `scoop-vanilla`, `scoop-dark-choc`, `scoop-strawberry`, `scoop-mint-chip` | 16x11 each | One scoop. Rows 9-10 are drips that hang over the scoop below; scoops stack 9px apart. | Scoop Stack |
| `icon-scoop-vanilla`, `icon-scoop-dark-choc`, `icon-scoop-strawberry`, `icon-scoop-mint-chip`, `icon-scoop-empty` | 16x12 each | HUD icons for stacked scoops, and the outline for scoops still to go. | Scoop Stack |
| `gbeats-bg` | 240x160 | The GB Eats kitchen: tile wall, steel backsplash, ticket rail, grill with knobs, pass-through board with a plate and fries, green floor. | Order Up! |
| `patty-raw`, `patty-rare`, `patty-medium`, `patty-well`, `patty-burnt` | 16x10 each | A patty from above, one per doneness. | Order Up! |
| `smoke` | 10x11 | Smoke puffs over a burnt patty. | Order Up! |
| `burger` | 20x16 | The finished burger shown on the plate after a good order. | Order Up! |
| `icon-cheese`, `icon-fries` | 7x6 each | Extras icons on order tickets. | Order Up! |
| `stage-bg` | 240x160 | The Mahaiwe stage: backdrop, spotlight, wood floor, four lanes with the gold hit line, curtains, valance, gold frame, audience. | Curtain Call |
| `note-left`, `note-down`, `note-up`, `note-right` | 12x12 each | A note arrow, pointing up (the game turns it per lane). Pink, blue, amber, mint. | Curtain Call |
| `arrow-off`, `arrow-lit` | 12x12 each | The targets on the hit line, dark and lit gold. | Curtain Call, Calibrate |
| `sparkle` | 28x26 | Bright bits around a target on a Great hit, centered on (14, 14). | Curtain Call |
| `npc-scooper`, `npc-grillcook`, `npc-usher`, `npc-pizzaiolo`, `npc-projectionist`, `npc-grocer`, `npc-clerk`, `npc-ranger`, `npc-local`, `npc-dog` | 12x16 each | One standing frame, facing down (the local faces up). Feet on the bottom row. | Overworld |

## Map

`public/maps/downtown.json` (the map, Tiled JSON) and `public/maps/tiles.png` (its tileset image) are made by `npm run build:map` from `src/map/downtown.ts` and `src/map/tileset.ts`. You can open the JSON in Tiled. Running the script again overwrites any edits made in Tiled.

## Fonts

| File | Family key | License |
|---|---|---|
| `fonts/press-start-2p.woff2` | `PressStart2P` | SIL OFL 1.1, see `fonts/OFL-PressStart2P.txt` |
| `fonts/vt323.woff2` | `VT323` | SIL OFL 1.1, see `fonts/OFL-VT323.txt` |

Both are the Latin subsets from Google Fonts. Use Press Start 2P at 8px (or 16px for titles), so each glyph pixel lands on a game pixel. It is monospaced: each character is exactly `size` pixels wide.
