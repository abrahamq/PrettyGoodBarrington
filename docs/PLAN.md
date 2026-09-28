# Main Street Quest — Build Plan

A retro top-down game set in downtown Great Barrington, MA. The player walks Main Street and Railroad Street, talks to shopkeepers, and plays short minigames at local businesses to collect stamps in a "Main Street Passport." The look is early Pokémon / Stardew Valley: chunky pixel art, wood-framed dialogue boxes, and a small fixed resolution scaled up.

This plan is written for Claude Code. Work through it one phase at a time. At the end of each phase, stop, summarize what changed, and tell me how to try it before starting the next one.

## Goals and constraints

- **Mobile-first, no app stores.** The game runs in a phone browser and installs as a PWA ("Add to Home Screen"). It must also work on desktop with a keyboard.
- **Engine:** Phaser 4, TypeScript, bundled with Vite. Scaffold with `npm create @phaserjs/game@latest` and pick Web Bundler → Vite → TypeScript. (Changed from JavaScript on 2026-09-27; see `DECISIONS.md`.)
- **Allowed dependencies:** `phaser`, `vite`, `vitest`, `vite-plugin-pwa`, and `typescript`. Ask before adding anything else.
- **No server.** All state lives in the browser (`localStorage`).
- **I'm newer to JavaScript** (my background is Ruby). Keep code plain and readable, and prefer small, well-named functions over clever abstractions. Add a short comment at the top of each file explaining what it does.

## Visual spec

Mockups are in `docs/mockups/` as `.dc.html` files. They won't render on their own, but their inline SVGs are drawn on the game's real 240×160 pixel grid, so the `path` coordinates can be ported directly into sprites and tiles.

| Mockup file | Screen |
|---|---|
| `Main.dc.html` | Title screen |
| `Overworld.dc.html` | Overworld at Main St × Railroad St |
| `Passport.dc.html` | Passport menu |
| `SoCo.dc.html` | Scoop Stack minigame |
| `Mahaiwe.dc.html` | Curtain Call minigame |
| `GBEats.dc.html` | Order Up! minigame |

**Resolution:** internal size 240×160 (landscape, 3:2), with `pixelArt: true`, `Scale.FIT`, and `CENTER_BOTH`. Never render at fractional positions: round sprr enable `roundPixels`.

**Tiles:** 16×16. Character sprites are 12×16.

**Palette.** Put these in `src/palette.ts` and use them everywhere instead of hard-coding hex values:

| Name | Hex | Use |
|---|---|---|
| ink | `#2b2230` | outlines, text, dark UI |
| cream | `#f4ecd6` | UI panels |
| parchment | `#e7d3a1` | inner panel border, empty bars |
| wood | `#8a5a2b` | panel frames, counters |
| brick | `#b5553c` | brick walls, primary buttons |
| brickDark | `#7d3326` | button shading |
| gold | `#f7d58c` | highlights, lit windows |
| amber | `#f2b84b` | accents, cheese |
| teal | `#3f8f7a` | success, timers |
| mint | `#6cc3a0` | SoCo accents |
| pink | `#f29bab` | strawberry, SoCo |
| red | `#9b2d30` | Mahaiwe curtains, danger |
| grass | `#7bb454` | grass |
| grassDark | `#5e9a40` | grass detail |
| road | `#6d6a7a` | asphalt |
| paver | `#dcc9a0` | sidewalks |
| sky | `#6f9fd8` | glass, water |

**Fonts:** "Press Start 2P" (all in-canvas text, at 8px so it lands on the pixel grid) and "VT323" (optional, for longer dialogue if it reads well at 16px). Both are OFL-licensed. Bundle the font files locally so the game works offline, and wait for them to load in the Boot scene before showing any text.

**UI panel style:** cream fill, 1px ink outer border, 1px parchment line inside it, then 1px wood line. Build it once as a reusable 9-slice panel (`src/ui/Panel.ts`).

## Architecture

```
src/
  main.ts              game config + scene list
  palette.ts
  data/
    stops.ts           the 8 passport stops (name, street, minigame key, stamp id)
    dialogue.ts        all NPC lines, keyed by id
    charts/            rhythm-game note charts (JSON)
  state/
    save.ts            load/save/reset to localStorage, versioned
  logic/               pure game logic, no Phaser imports (unit-tested)
    scoopStack.ts
    orderUp.ts
    curtainCall.ts
  scenes/
    Boot.ts            load assets, fonts, generate placeholder textures
    Title.ts
    Overworld.ts
    UI.ts              HUD + dialogue, runs on top of Overworld
    Passport.ts
    minigames/ScoopStack.ts, OrderUp.ts, CurtainCall.ts
  ui/                  Panel, Button, DialogueBox, ProgressBar, TouchControls
public/
  assets/              tilesets, spritesheets, audio, fonts
  maps/downtown.json   Tiled-format map
tests/                 vitest specs for src/logic and src/state
```

**Rules that keep this manageable:**

- **Keep rules and rendering apart.** Minigame rules (timing windows, doneness, wobble) live in `src/logic/` as plain functions that take state plus elapsed time and return new state. Scenes only draw and handle input. This keeps the fun parts testable.
- **One source for names.** Business names appear in `src/data/stops.ts` only. These are real local businesses: use their names as plain text, never their logos, and keep the names easy to swap.
- **Scene flow.** Minigames always exit with `this.scene.start('Overworld', { result })`, where `result` is `{ stopId, passed, score }`. Overworld applies the result, updates the save, and shows the shopkeeper's win or lose line.

**Save format** (`localStorage` key `msq-save`), versioned so it can be migrated later:

```js
{ version: 1, stamps: { soco: false, ... }, bestScores: {}, tips: 0, dayMinutes: 840, lastPosition: { x, y } }
```

## Art approach (no artist yet)

Start with generated placeholder art so everything is playable immediately. Real art can be swapped in later without code changes.

- In `Boot.ts`, draw textures with `Phaser.GameObjects.Graphics` using the rectangles from the mockup SVGs, then `generateTexture()` them under stable keys (`player`, `npc-scooper`, `tiles`, `scoop-vanilla`, and so on).
- Every texture key used by a scene must also work if a real PNG spritesheet with the same key is loaded instead. Document the expected frame sizes and layouts in `public/assets/README.md`.
- The player needs 4-direction walk cycles (2–3 frames each). Placeholder frames can be simple bobs or leg swaps.

## The overworld map

- **Format.** Author `public/maps/downtown.json` in Tiled JSON format so I can edit it in Tiled later. Generate it with a script (`scripts/build-map.js`) rather than by hand. Layers: `ground`, `buildings`, `decor` (above the player), and an object layer `interactables` (doors, NPCs, signs, each with a `stopId` or `dialogueId` property).
- **Size and layout.** Stylized, not geographically exact: about 60×24 tiles, with the camera following the player. Main Street runs east–west across the middle. Railroad Street branches north (SoCo Creamery is on it). Put Baba Louie's, GB Eats, and the Triplex along Main or Railroad, and the Mahaiwe, Town Hall, Berkshire Food Co-op, and a stretch of river path for the Housatonic River Walk around the edges. Match the look of the Main × Railroad corner in `Overworld.dc.html`.
- **Collisions.** Buildings and water block movement. Doors are overlap zones.

## The eight stops

| id | Business | Minigame | Built in phase |
|---|---|---|---|
| soco | SoCo Creamery | Scoop Stack | 3 |
| gbeats | GB Eats | Order Up! | 4 |
| mahaiwe | Mahaiwe Performing Arts Center | Curtain Call | 5 |
| baba | Baba Louie's | Dough Toss | 8 (stub until then) |
| triplex | Triplex Cinema | Popcorn Panic | 8 (stub) |
| coop | Berkshire Food Co-op | TBD | 8 (stub) |
| townhall | Town Hall | TBD | 8 (stub) |
| riverwalk | Housatonic River Walk | TBD | 8 (stub) |

A stub stop has a door and a shopkeeper who says the game is "coming soon." It does not award a stamp. All stamps start empty in a new game.

Collecting all 8 stamps unlocks an ending where the Monument Mountain trail opens: a simple celebration screen is fine for now.

---

## Phases

### Phase 0 — Scaffold and deploy

Scaffold the Vite + TypeScript template, then:

- set the game config above
- create the folder structure
- add Vitest with one passing test
- add an npm script to build the map
- set up GitHub Pages deployment with a GitHub Actions workflow that builds on push to `main`

**Done when:** `npm run dev` shows a blank 240×160 canvas scaled crisply, `npm test` passes, and the deployed URL loads on my phone.

### Phase 1 — Title screen, scene flow, saving

- **Boot** loads the fonts and generates placeholder textures.
- **Title** matches `Main.dc.html`: sunset sky bands, mountain silhouette, town skyline, logo, and a menu with New Game, Continue (only enabled if a save exists), and Options.
- **Options** holds sound on/off and "Reset save" (with a confirm step).
- `src/state/save.ts` handles load, save, and reset, with tests.
- Menu works with arrow keys + Enter and with tapping.

**Done when:** New Game → Overworld (blank placeholder is fine) and Continue restore the saved state, including after a page reload.

### Phase 2 — Overworld and dialogue

- Load the tilemap. The camera follows the player and is clamped to the map bounds.
- **Movement.** Keyboard uses arrows/WASD. Touch uses tap-to-walk: the player walks toward the tapped tile along a simple grid path, avoiding blocked tiles. Also add an optional on-screen d-pad, toggled in Options.
- **Interacting.** Face a door or NPC and press action (Space/Enter, or tap the NPC) to open dialogue.
- **UI scene** runs on top of Overworld and holds:
  - a location label (top-left) that updates by street zone
  - a clock box with day, time, and stamp count (top-right)
  - a Passport button
  - the dialogue box: bottom panel, speaker name tab, typewriter text (tap to finish the line, tap again to advance), and Yes/No choices
- **In-game clock.** It advances slowly (1 in-game minute every 2 real seconds). A tint overlay shifts between day, golden hour, and night as in the mockup's time-of-day variants.
- Walking into a playable stop's door runs its intro dialogue ("Stack five scoops…") and then the minigame on "Yes."

**Done when:** I can walk the whole map on my phone, talk to the SoCo scooper, and get sent into a placeholder minigame scene and back.

### Phase 3 — Scoop Stack (SoCo Creamery)

Match `SoCo.dc.html`.

**Mechanic:**
- A scoop slides left and right across the top of the screen.
- Tap, or press the action key, to drop it.
- It lands on the stack if its horizontal offset from the top scoop is within a tolerance. Otherwise it falls off and the run fails.
- Each landing adds that offset to a wobble value. The stack sways sinusoidally, and the sway amplitude grows with wobble and stack height.
- Too much wobble topples the stack.

**Rules:** win at 5 scoops within 30 seconds. Flavors cycle through vanilla, dark choc, strawberry, mint chip, and back.

**HUD:** title panel with a time bar, a stack counter with scoop icons, a wobble meter (safe/warn/danger zones), a tip line, [A] DROP, and [B] QUIT.

**Logic tests:** landing tolerance, wobble accumulation, topple threshold, win and lose conditions.

**Done when:** it's playable start to finish on a phone, winning stamps the passport, and quitting returns to the street with no stamp.

### Phase 4 — Order Up! (GB Eats)

Match `GBEats.dc.html`.

**Mechanic:**
- Up to 3 order tickets hang on a rail. Each asks for a doneness (rare, medium, or well) plus extras, and has a patience timer.
- The grill has 4 slots. Tap an empty slot to add a patty.
- Patties cook through raw → rare → medium → well → burnt. Each side cooks on a timer, and the color changes by stage.
- Tap a patty once to flip it. You only get one flip.
- Tap it again (or drag it to the plate) to serve it to the oldest ticket.
- Payment: a correct doneness earns a tip scaled by the time left on the ticket. A wrong one earns $0. Burnt patties must be tossed.

**Round:** 90 seconds. Win with at least $10 in tips. Saved tips accumulate across plays and show on the passport.

**Logic tests:** cooking stage by time, flip rules, matching a patty to a ticket, tip calculation.

**Done when:** it's playable on a phone and all tap targets are at least 12 game-pixels tall (48 screen pixels at 4×).

### Phase 5 — Curtain Call (Mahaiwe)

Match `Mahaiwe.dc.html`.

**Mechanic:**
- Four lanes (left, down, up, right). Notes scroll down to a hit line.
- Input: arrow keys, or tapping the four on-screen lane zones.
- Timing judgments against the audio clock (not frame time): Great within ±50 ms, Good within ±100 ms, otherwise Miss. Make the windows configurable.
- Combo counter, score, and an applause meter that rises on hits and drops on misses.
- Win if applause is at least 60% at the end of the song.

**Charts:** JSON files in `src/data/charts/` with the BPM, an offset, and a list of `{ beat, lane }`. Write one easy chart of about 60 seconds.

**Music:** CC0 or self-generated only; never copyrighted songs. Credit sources in `CREDITS.md`.

**Audio timing:** mobile browsers need a user tap before audio plays, so unlock audio on the Title screen's first tap. Add a calibration setting in Options that shifts the offset in ±10 ms steps.

**Logic tests:** judgment windows, combo reset, applause math.

**Done when:** it plays in sync on my phone after calibration.

### Phase 6 — Passport

Match `Passport.dc.html`:

- a 4×2 grid of stops with a progress bar and a "3 of 8 stamps" style subtitle
- stamped stops show a colored stamp icon at a slight tilt
- discovered but unstamped stops show a dashed ring and a "NEW" badge
- undiscovered stops show a lock and "???"

A stop counts as discovered once you've talked to its shopkeeper. Tapping a discovered stop shows the business name, street, and your best score.

Open the passport from the HUD button or the P key. Back returns to the Overworld at the same position.

**Done when:** stamps and discovery persist across reloads.

### Phase 7 — Mobile polish and PWA

- **Install and offline:** `vite-plugin-pwa` with a manifest (name, a 192 and 512 px icon made from the player sprite, `display: fullscreen`, `orientation: landscape`, theme color ink) and offline caching of all assets.
- **Portrait handling:** in portrait, show a "rotate your phone" screen and pause the game.
- **Layout:** respect safe areas (notches), and prevent scroll, pinch-zoom, and double-tap zoom on the canvas.
- **Lifecycle:** pause and mute when the tab is hidden. Save on the `visibilitychange` event.
- **Sound effects:** generate them with jsfxr-style tools or use CC0 packs. Add a mute toggle to the HUD.
- **Performance:** check for a steady 60 fps on a mid-range phone. Report any scenes that drop frames.

**Done when:** I can install it from Safari on iPhone and Chrome on Android, launch it full screen from the home-screen icon, and play offline.

### Phase 8 — Remaining stops

Replace the stubs one at a time, each as its own scene with logic in `src/logic/` and tests:

- **Dough Toss** (Baba Louie's): timing taps to toss and catch pizza dough as it stretches.
- **Popcorn Panic** (Triplex Cinema): catch falling popcorn in a bucket and avoid unpopped kernels.

Propose mechanics for the Co-op, Town Hall, and River Walk and check them with me before building.

---

## Working agreements

- Commit at the end of each phase with a clear message. Keep commits small inside a phase.
- Run `npm test` and `npm run build` before saying a phase is done.
- When you need a design decision this plan doesn't cover, make a reasonable choice, note it in `DECISIONS.md`, and keep going. Ask only when a choice would be expensive to undo.
- To test on my phone during development, run `npm run dev -- --host` and tell me the LAN URL.
