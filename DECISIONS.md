# Decisions

Choices that `docs/PLAN.md` does not cover. Each entry says what we chose and why.

## Phase 0: Scaffold (2026-09-27)

1. **Scaffold source.** We copied the official `phaserjs/template-vite` (JavaScript) repo. `npm create @phaserjs/game@latest` downloads this same template, but it needs interactive answers that an automated shell cannot give. We removed the demo scenes, the demo images, and `log.js`. `log.js` sent a usage ping to `gryzor.co` on each dev and build run.
2. **Node 22.12.0, pinned in `.nvmrc`.** Vitest 5 needs Node 22.12 or later. We installed it with nvm for this project only. The global default stays on Node 20.14.0. The deploy workflow reads the same `.nvmrc`.
3. **Vite 8, not the template's Vite 6.** Vite 8 works with Vitest 5 and with `vite-plugin-pwa` 1.3 (needed in Phase 7).
4. **No terser.** The template used terser to minify. Vite's built-in minifier does the same job, so the dependency list stays inside the allowed packages.
5. **One `vite.config.ts`.** The template had separate dev and prod configs. One file is easier to read, and Vitest reads the same file.
6. **Phaser in its own build file.** Phaser is about 1.4 MB. In its own file, the browser keeps it cached when only game code changes.
7. **Palette format.** `PALETTE` holds `'#rrggbb'` strings for text styles. `colorNumber(name)` returns the `0xrrggbb` number that Phaser Graphics needs. TypeScript rejects an unknown name at compile time. At run time an unknown name (for example, one read from JSON) throws an error.
8. **Page background.** `src/style.css` repeats the `ink` hex code, because CSS cannot import `palette.ts`.
9. **Map script output.** `npm run build:map` writes a blank 60x24 grass map with the four planned layers. `npm run build` does not run it, so edits made in Tiled stay. The tileset points to `public/assets/tiles.png`, which does not exist yet. Phase 2 must write that PNG, so Tiled can show the tiles.
10. **Boot scene draws a 1-pixel frame.** It is a temporary check that the canvas is 240x160 and scales crisply. Phase 1 replaces it.
11. **Deploy is local only for now.** The repo is private, and GitHub Pages needs GitHub Pro for a private repo. The workflow is committed but not pushed, and Pages is off. Because of this, the Phase 0 check "the deployed URL loads on my phone" is not done yet. Use `npm run dev -- --host` to test on a phone.
12. **The plan lives in the repo.** `docs/PLAN.md` holds the full build plan, so each new work session can read it.
13. **TypeScript instead of JavaScript.** Abe asked for TypeScript after the JavaScript scaffold was done, so we converted it. Details:
    - **TypeScript 6.0, not 7.0.** 7.0 is the new native compiler. Vite's own TypeScript starter (`create-vite` 9.2) still uses 6.0, so we follow it.
    - **`strict` is on.** `strictPropertyInitialization` is off, as in the Phaser TypeScript template, because scenes set their fields in `create()`, not in the constructor.
    - **Imports use the `.ts` extension**, as in Vite's starter, so each import names the real file.
    - **`npm run build` runs `tsc` first.** Vite and Vitest do not check types, so a type error stops the build (and the deploy) instead.
    - **`scripts/build-map.js` stays JavaScript.** Node 22.12 runs `.ts` files only with an experimental flag, and type-checking Node scripts needs `@types/node`, which is not on the allowed list.

## Phase 1: Title screen, scene flow, saving (2026-09-27)

1. **Mockups folder.** The mockups are in `docs/mocks/`, not `docs/mockups/` as the plan first said. We kept Abe's folder name and changed the plan.
2. **Text sizes.** The mockup SVGs use game pixels, but the mockup HTML text does not (for example, 20px CSS is 5 game pixels). All text uses Press Start 2P at 8px, and the logo uses 16px, so each glyph pixel lands on a game pixel.
3. **Tagline on two lines, without the dark box.** At 8px the tagline is 304 pixels wide, wider than the 240-pixel screen. VT323 is 243 pixels wide at 16px, and its glyph pixels blur at smaller sizes. So the tagline takes two lines. A 1px ink shadow replaces the box, so the text does not cover the sun.
4. **Extra mockup colors.** The sunset, mountains, and skyline use colors that are not in the 17-color palette. They are in `SCENERY` in `src/palette.ts` with names, so no hex codes appear anywhere else.
5. **Placeholder art is painted one pixel row at a time.** Phaser's `generateTexture` draws with the Canvas 2D API, which blurs diagonal edges (the church steeple). `src/art/svgPath.ts` turns the mockup paths into rows of whole pixels, so every edge stays crisp. The mockup paths are copied as-is.
6. **PRESS START comes first.** The mockup shows PRESS START and the menu together. Both do not fit at 8px, so the first key or tap hides PRESS START and opens the menu. Phase 5 can unlock audio on that same first tap. The menu opens on the key or tap *release*, so the same press cannot also pick a menu item.
7. **Menu input.** Tapping a menu row picks it at once. Escape or Backspace goes back. Rows are 12 game pixels tall (48 screen pixels at 4x).
8. **New Game over an existing save asks first.** One wrong tap on a phone must not erase progress. Continue is disabled (grey) when there is no valid save.
9. **Settings are stored apart from the save** (`msq-settings`), so "Reset save" does not turn the sound back on.
10. **Save details.** The stop `id` is also the stamp id. `lastPosition: null` means "start at the map's start point". `loadSave` replaces missing or broken values with new-game defaults, and it ignores a save from a newer game version. Two browser tabs share one save; the last write wins.
11. **The save in play lives in Phaser's registry** (`src/state/session.ts`), so every scene can read it.
12. **Placeholder Overworld.** A 15x10 grid of grass with a box for the player. Arrows, WASD, or a tap move one tile, and each step writes the save. MENU or Escape goes back to the Title menu. Phase 2 replaces it.
13. **Streets in `stops.ts`.** SoCo and the Triplex are on Railroad St; GB Eats, Baba Louie's, and Town Hall on Main St; the Mahaiwe on Castle St; the Co-op on Bridge St; the River Walk on River St. Change them in that one file if they are wrong.
14. **Panels need WebGL.** Phaser's NineSlice works only in WebGL. `AUTO` picks WebGL on every phone we target.

## Phase 2: Overworld and dialogue (2026-09-27)

1. **Grid movement.** The player moves one whole tile per step (200 ms), like early Pokémon, instead of using a physics engine. Tap-to-walk uses a breadth-first path search on the same grid (`src/logic/grid.ts`), so it always goes around blocked tiles.
2. **The map script is TypeScript.** `scripts/build-map.ts` runs with Node's `--experimental-strip-types` flag, so it shares the tile art and map code with the game. It writes `tiles.png` with Node's built-in zlib. `scripts/node.d.ts` declares the few Node functions it needs, instead of adding `@types/node`. This replaces Phase 0 decision 13 (the script stayed JavaScript).
3. **Tile art lives in one place** (`src/map/tileset.ts`). The game paints the `tiles` texture from it at startup, and `build:map` saves the same art as `public/maps/tiles.png` for Tiled. Each tile has a `blocks` property in the Tiled tileset, and the game reads blocking from the map JSON, so edits made in Tiled keep working.
4. **Map layout.** 60x24 tiles. Main Street is rows 13-16; Railroad Street goes north at columns 30-33 (the Triplex and SoCo are up it); Castle Street is a lane at the west end (the Mahaiwe); Town Hall, Baba Louie's, and GB Eats face Main Street; Bridge Street goes south to a bridge, with the Co-op on the river; the River Walk boardwalk runs along the Housatonic, and its ranger stands on a small pier.
5. **Two extra object layers.** Besides `interactables`, the map has `zones` (rectangles named with the street for the HUD label; the first match wins, and MAIN ST covers the rest) and `labels` (where the building name boards go).
6. **Building names come from `stops.ts`.** Each stop has a short `sign` (for example "BABA LOUIE'S"), and the game paints the name board at runtime. Dialogue writes `{soco}` instead of a name, and `fillNames()` fills it in. A test fails if a business name is typed straight into dialogue.
7. **Doors.** A door tile blocks movement. Walking into it opens the shopkeeper's dialogue (once per bump, so holding the key does not reopen it), and the shopkeeper stands in the doorway. Signs and other NPCs need the action key or a tap, so walking past them does not interrupt you.
8. **HUD at 8px.** The mockup's HUD text is smaller than 8px, so it was simplified: the clock reads "SAT  2:40PM" (no date), the stamp count is the stamp icon plus "3/8", and the location panel has no subtitle.
9. **Dialogue layout.** 3 lines of 27 characters per page, typed at 40 characters per second. Choices appear in a small menu above the right end of the box, not inside it: at 8px, "LET'S SCOOP" does not fit in the mockup's side column.
10. **Clock.** `dayMinutes` counts game minutes since midnight of day one (a Saturday); the game starts at 2:00 PM. The tint fades over 30 game minutes at 6:00 AM (night to day), 5:00 PM (day to golden hour), and 7:30 PM (golden hour to night). The save is written after every step and every 5 game minutes.
11. **Minigame placeholders.** Until phases 3-5, the Scoop Stack, Order Up!, and Curtain Call scene keys run a placeholder with WIN, LOSE, and QUIT. A loss still records the best score; a stamp is never taken away.
12. **Passport button.** Until Phase 6, `[P] PASSPORT` shows a dialogue with the stamp count.
13. **On-screen d-pad.** Off by default, turned on in Options, stored as `dpad` in `msq-settings`. It adds an A button for talking. It hides while dialogue is open.
14. **Small choices.** Escape goes back to the Title menu (a desktop shortcut). The player's facing is kept in memory across a minigame, not in the save. NPCs draw above decor, so shopkeepers show in front of their door art.

## Phase 3: Scoop Stack (2026-09-28)

1. **Numbers.** A scoop lands if it is within 7 px of the top scoop's current position. The stack topples at 20 wobble. The sliding scoop moves ±44 px at 60 px/s, plus 15 px/s for each scoop already stacked, and falls at 180 px/s. All tuning numbers are in `SCOOP_STACK` in `src/logic/scoopStack.ts`.
2. **Wobble settles over time** (2 per second). The plan did not say whether wobble goes down. With settling, the mockup's tip "Drop when the cone stops swaying" has a real choice behind it: waiting steadies the stack but uses up the 30 seconds.
3. **Sway.** Amplitude = wobble × 0.35 × (1 + 0.25 × scoops), at most 10 px, on a 1.4-second cycle. Higher scoops lean further, and a landing is measured against where the top scoop is at that moment.
4. **The fifth scoop can still topple the stack.** The topple check comes before the win check.
5. **Score** = 100 per scoop, plus 10 per whole second left on a win (at most 800). A score of 0, for example from quitting, is not saved as a best score, so the passport shows no score instead of 0.
6. **HUD at 8px.** Changes from `SoCo.dc.html`: no subtitle under SCOOP STACK; the flavor board shows swatches with marks instead of names, and a gold arrow points at the current flavor; the tip panel shows "NEXT: <flavor>" plus a tip that changes with the wobble; [B] QUIT and [A] DROP are stacked at the bottom right; the framed picture is gone (the HUD would cover it), and there is one lamp over the cone.
7. **Input.** A tap anywhere drops the scoop, and so do Space, Enter, Z, and A. Escape, Backspace, X, B, or [B] QUIT leave without a stamp.
8. **Ending.** A spill drops the missed scoop onto the floor; a topple tips the scoops toward the side the stack leans. A banner shows the result and score for 1.8 seconds, then the game returns to the street. Quitting also shows the scooper's "try again" line.
9. **New UI parts.** `src/ui/Button.ts` (primary and secondary styles from the mockups) and `src/ui/ProgressBar.ts` (the TIME bar).

## Phase 4: Order Up! (2026-09-28)

1. **Cooking.** Only the side facing down cooks. Doneness comes from the total cooking time: rare at 3 s, medium at 6 s, well at 9 s. One side alone burns at 6 s, so burning always comes from one side. A well-done patty needs its one flip between 3 s and 6 s. A blinking "FLIP!" appears when the bottom side passes 4.5 s.
2. **Taps.** A tap on a grill spot does one of these: add a patty (empty spot), flip it (first tap), serve it to the oldest ticket (second tap), or toss it (burnt). With no ticket waiting, the patty stays on the grill. There is no drag-to-plate; the plan offered it only as an alternative to the second tap.
3. **Tips.** The right doneness pays $3 plus 50 cents per extra, times the share of patience left, rounded to a quarter. The wrong doneness pays $0, and the ticket is gone. Extras (cheese, fries) change only the tip. Tips are stored in cents (`save.tips`), so totals stay exact.
4. **Tickets.** The round starts with 1 ticket; a new one comes every 7 s, up to 3 on the rail. Each has 25 s of patience; when it runs out, the ticket leaves with no tip. Tickets come from a seeded random generator, so tests are repeatable; the game seeds it from the clock.
5. **Balance.** A near-perfect scripted player earned $39 in 90 s, so the $10 goal is forgiving. The tuning numbers are in `ORDER_UP` in `src/logic/orderUp.ts`.
6. **Result and tips.** `MinigameResult` has an optional `tips` (in cents), added to the saved total whether the round is won or lost. Quitting gives up the round's tips.
7. **HUD at 8px.** Changes from `GBEats.dc.html`: the title panel shows the tips and a round time bar (the mockup has no timer, but a 90-second round needs one), and no subtitle; tickets hang at slightly different heights instead of being rotated (rotation blurs pixel art); each ticket shows #, RARE/MED/WELL with a color swatch, extras icons, and a patience bar that goes teal, amber, then red; a gold strip marks the oldest ticket; each patty has a label (RAW, RARE, MED, WELL, or TOSS when burnt); the action button's label follows the selected spot ([A] ADD, FLIP, SERVE, TOSS); the spatula is left out.
8. **Keyboard.** Left and Right pick a grill spot, 1-4 act on a spot directly, and Space, Enter, Z, or A act on the picked spot. Escape, Backspace, X, or B quit.
9. **Shared UI.** `src/ui/Banner.ts` (the end-of-round banner, now used by both minigames) and `src/ui/Popup.ts` (rising text like "+$2.75"). `Button` gained `setLabel`.

## Phase 5: Curtain Call (2026-09-30)

1. **Music made in code.** "Opening Night" is played by a small Web Audio synthesizer (`src/audio/synth.ts`): drums from noise and pitch sweeps, triangle-wave bass and chords, and a square-wave lead. No recordings or existing songs; see `CREDITS.md`. The chords follow a common I-vi-IV-V pattern (C, Am, F, G).
2. **The chart drives the melody.** Every chart note plays a lead note at the same moment (lane picks the chord tone: left root, down third, up fifth, right octave), so the notes you tap are the melody you hear and cannot drift apart. A test checks this for every note.
3. **The chart.** `src/data/charts/openingNight.json`: 112 BPM, 68 notes on whole beats from beat 8 to beat 104 (about 56 seconds), no two notes closer than one beat, no chords. Bars 0-1 are a drum count-in with clicks. The file follows the plan's format (`bpm`, `offsetMs`, `notes: [{ beat, lane }]`), plus a `title`.
4. **Timing.** Song time comes from the AudioContext clock. A tap is timed from its browser event timestamp, moved onto the audio clock, so a late frame does not make a tap late. Great is within 50 ms, Good within 100 ms (configurable in `CURTAIN_CALL.windows`); a note more than 100 ms late is a Miss. A tap with no note in reach does nothing (no penalty).
5. **Calibration.** The offset (`audioOffsetMs` in `msq-settings`, -300 to +300 ms) is added to the latency the browser reports (`baseLatency + outputLatency`, where available). Positive means the player hears the music late, so notes are drawn and judged that much later. Options > CALIBRATE opens a metronome screen: tap along, and USE sets the offset to your average (rounded to 10 ms), or nudge it with -10 and +10.
6. **Scoring.** Great 100 points, Good 50. Applause starts at 50%: +4 per Great, +2 per Good, -8 per Miss, kept between 0 and 100. The show ends 2 seconds after the last note, and 60% applause wins. A tick on the applause bar marks 60%; the bar turns teal above it.
7. **Controls.** Left, Down, Up, Right, or D, F, J, K. On touch, each lane is a tap zone, and the two outer lanes stretch to the screen edges for thumbs; the scene allows 3 fingers at once.
8. **Audio unlock.** Phaser unlocks Web Audio on the first touch, click, or key press on the page, which is the Title screen's PRESS START. If Web Audio is not running when a song starts, Curtain Call plays silently on the page clock instead, so it never freezes.
9. **HUD at 8px.** Changes from `Mahaiwe.dc.html`: the title panel reads CURTAIN / CALL with no subtitle; score and combo are stacked on four lines; the applause panel sits at the bottom left, next to [B] QUIT.
10. **Placeholders removed.** All three minigames are real now, so the Phase 2 placeholder scene is gone.

## Leaderboard (2026-09-30)

1. **A Rails API in `server/`.** You asked for Ruby on Rails. It is API-only (`rails new --api --minimal`), with SQLite, in this repo so one commit can change both sides. The plan's "No server" rule now says the game must work fully without it. Design: `docs/superpowers/specs/2026-09-30-leaderboard-design.md`.
2. **Names, no login.** The first SUBMIT asks for a name and the server returns a secret token, stored in `msq-leaderboard` apart from the save, so RESET SAVE keeps the name. Only the token's SHA-256 digest is stored on the server. If the server no longer knows the token (for example, after a database reset), the game forgets it and asks for a name again.
3. **Ranking.** Most stamps, then most tips, then the earliest to reach that score. Scores only go up. SUBMIT is manual, so nothing is sent unless the player asks.
4. **Self-reported scores.** A determined person can post fake numbers with `curl`. Value caps (8 stamps, $1000 in tips), a rate limit (10 per minute per IP), and removing rows by hand are the defense. That is enough for a hometown game.
5. **Port 3030.** The game looks for the server on the page's host at port 3030, unless `VITE_LEADERBOARD_URL` is set. Port 3000 was already taken on this computer by another Rails app, which then got the game's requests.
6. **5-second timeout.** On this Mac, a request to a LAN port with nothing on it hangs instead of failing (the firewall drops it), so without a timeout the screen would say LOADING forever.
7. **Name picker keys.** Arrow keys and Enter work the letter grid. Typing a letter jumps the cursor to OK, so typing a name and pressing Enter sends it. Space types a space (it does not pick, unlike in menus); Backspace deletes; Escape goes back. Names are 3-10 characters; the game checks this before it sends, and the server checks again.
8. **Layout.** The board shows 10 rows of 10 pixels (the stamp icon is 10 pixels tall). Status messages sit on a dark strip, because the title backdrop's road has yellow dashes behind them. The title menu moved up to y 88 to fit LEADERBOARD.
9. **One gem added: `rack-cors`.** The game and the API run on different ports, so the browser needs CORS headers. The plan's dependency rule covers npm packages; this is a Ruby gem that the Rails template already lists, commented out.

## Character Select (2026-09-30)

1. **Three boys, no names.** NEW GAME (after the erase confirm, if there is a save) opens Character Select. The player picks one of three boys: 5 years old, 11, or 15. The screen shows no names or ages, only the heading WHO'S PLAYING?. The pick changes only the walking sprite.
2. **One frame size.** Each boy stands at his own height inside the same 12x16 frame: 11, 14, and 16 pixels. The map, collision, and tap targets did not change. The 15-year-old is as tall as the adult NPCs.
3. **Looks.** 5: fair skin, light brown eyes, mousey brown hair, red Mickey Mouse tee (a 4x3 ink Mickey head), 1-pixel legs. 11: mid-tan skin, brown eyes, dark brown hair over the ears, 8-pixel-wide teal tee. 15: fair skin, blue eyes, blonde hair, narrow navy tee, long arms, hips and 4-pixel legs. The teal and navy shirts are placeholder choices. The side views have no arm: a 1-pixel arm read as a stripe on the shirt.
4. **Save.** The save has a `character` field. A save from before this phase has no such field, so it loads as the 11-year-old. The version stays at 1, because the loader already fills in missing fields.
5. **Textures.** Three spritesheets (`player-five`, `player-eleven`, `player-fifteen`) replace `player`. Boot makes all twelve walk animations once, because animations belong to the whole game.
6. **Controls.** Left/Right move the gold arrow, and the chosen boy walks in place. Space, Enter, Z, or A starts; Escape, Backspace, X, or B goes back to the Title menu, and the old save stays. On touch, the first tap on a card chooses that boy, and a second tap (or `[A] GO`) starts. Boys who are not chosen keep their real colors: a grey tint made their skin and hair look wrong.

