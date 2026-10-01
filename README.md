# Main Street Quest

A retro top-down game set in downtown Great Barrington, MA. You walk Main Street and Railroad Street, talk to shopkeepers, and play short minigames to collect stamps in a Main Street Passport. It runs in a phone browser and on desktop. It uses Phaser 4, Vite, and TypeScript.

## Setup

You need [nvm](https://github.com/nvm-sh/nvm). This project uses Node 22.12.0, set in `.nvmrc`. It does not change your global Node version.

1. `nvm install` installs Node 22.12.0. You do this one time only.
2. `nvm use` switches the current terminal to Node 22.12.0. Do this in each new terminal.
3. `npm install`
4. `npm run dev`
5. Open http://localhost:8080.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server at http://localhost:8080. The page reloads when you save a file. |
| `npm run dev -- --host` | Same, but also opens the server to your local network, so a phone can connect. |
| `npm test` | Runs the Vitest specs in `tests/` one time. |
| `npm run test:watch` | Runs the specs again each time you save. |
| `npm run typecheck` | Checks all types with `tsc`. Vite and Vitest do not check types, so run this (or `build`) to find type errors. |
| `npm run build` | Checks types, then builds the game into `dist/`. |
| `npm run preview` | Serves `dist/`, so you can check the production build. |
| `npm run server` | Starts the leaderboard server (Rails, in `server/`) at http://localhost:3030, open to your local network. See [Leaderboard server](#leaderboard-server). |
| `npm run server:test` | Runs the Rails tests in `server/test/`. |
| `npm run build:map` | Makes `public/maps/downtown.json` and `public/maps/tiles.png` again from `src/map/`. This overwrites edits made in Tiled. |
| `npm run wt -- <name>` | Makes a worktree at `.worktrees/<name>` on a new branch `<name>`, from your current commit. |
| `npm run wt:rm -- <name>` | Removes that worktree. Git refuses if it has uncommitted changes. The branch is deleted only if it is merged. |
| `npm run wt:ls` | Lists all worktrees. |

## Work in a worktree

A worktree is a second checkout of the repo on its own branch, so you can work on two things at once.

1. `npm run wt -- my-feature`
2. `cd .worktrees/my-feature`
3. `npm run dev`. If port 8080 is in use, Vite takes the next free port and prints it.

You do not run `npm install` in a worktree. Node looks for `node_modules` in each parent folder, so it finds the main one. If a branch adds a package, run `npm install` in that worktree; it then gets its own `node_modules`.

Claude Code can make worktrees too: `claude -w my-feature` puts one in `.claude/worktrees/my-feature` on the branch `worktree-my-feature`. `.claude/settings.json` sets `worktree.baseRef` to `"head"`, so it starts from your local commit, not from `origin/main`.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Pick a player (after New Game) | Left/Right, then Space, Enter, Z, or A. Escape, Backspace, X, or B goes back | Tap a boy, then tap him again or tap `[A] GO` |
| Walk | Arrow keys or WASD | Tap a tile to walk there, or turn on the D-PAD in Options |
| Talk, read a sign, next page | Space, Enter, or Z (face the person first) | Tap the person or sign; tap anywhere for the next page |
| Enter a shop | Walk into its door | Tap the shopkeeper in the doorway |
| Passport | P | Tap `[P] PASSPORT` |
| Drop a scoop (Scoop Stack) | Space, Enter, Z, or A | Tap anywhere, or tap `[A] DROP` |
| Grill a patty (Order Up!) | Left/Right to pick a spot, then Space, Enter, Z, or A; or 1-4 | Tap a grill spot: add, flip, serve, or toss |
| Hit a note (Curtain Call) | Left, Down, Up, Right, or D, F, J, K | Tap the lane (outer lanes reach the screen edges) |
| Calibrate rhythm timing | Options > CALIBRATE: tap Space on each click, Left/Right to nudge | Tap on each click, then USE; or -10 / +10 |
| Leave a minigame | Escape, Backspace, X, or B | Tap `[B] QUIT` |
| Pick a leaderboard name | Type it, then Enter; or Arrow keys and Enter on the letters; Backspace deletes | Tap the letters, then OK |
| Back to the title menu | Escape | (none yet) |

## Edit the map

The map is made by code in `src/map/downtown.ts` (layout) and `src/map/tileset.ts` (tile art). After a change, run `npm run build:map`, then reload the game. You can also open `public/maps/downtown.json` in [Tiled](https://www.mapeditor.org/), but `build:map` overwrites edits made there.

## Play on your phone during development

1. Connect the phone and the computer to the same Wi-Fi network.
2. Run `npm run dev -- --host`.
3. On the phone, open the `Network` URL that Vite prints, for example `http://192.168.18.44:8080/`.

## Leaderboard server

The LEADERBOARD screen shows the top 10 players and sends your stamps and tips when you tap SUBMIT. It needs the small Rails API in `server/`. The game works fully without it; the screen then says CAN'T REACH THE BOARD.

You need Ruby 3.3.3 (set in `server/.ruby-version`; rbenv or another Ruby version manager picks it up).

1. `cd server`
2. `bundle install` (one time only)
3. `bin/rails db:prepare` (one time only; makes the SQLite database in `server/storage/`)
4. `cd ..`
5. `npm run server`, in its own terminal, next to `npm run dev`.

The game looks for the server on the same host as the page, on port **3030**. So a phone that opens `http://192.168.18.44:8080/` uses `http://192.168.18.44:3030/`. The port is not the usual Rails 3000, because another Rails app often uses 3000 on a developer's computer. To use a server somewhere else, set `VITE_LEADERBOARD_URL` when you build, for example `VITE_LEADERBOARD_URL=https://board.example.com npm run build`. `server/README.md` has the API and how to remove a player.

## Project layout

```
src/
  main.ts         game config and scene list
  palette.ts      the 17 colors; use these, not hex codes
  data/           stops, dialogue, rhythm charts
  state/          saving to localStorage
  net/            the leaderboard API client and its messages
  logic/          game rules with no Phaser: grid paths, clock, text pages (unit-tested)
  map/            the downtown map, its tileset, and the Tiled reader
  scenes/         Phaser scenes, minigames in scenes/minigames/
  ui/             Panel, Button, DialogueBox, and so on
  art/            placeholder art drawn at startup from the mockup shapes
public/
  assets/         images, audio, fonts (README lists every texture key and size)
  maps/           downtown.json (Tiled format)
server/           the leaderboard API (Ruby on Rails, SQLite); see server/README.md
scripts/          build-map.ts (run by Node; writes the map files), worktree.sh (npm run wt)
tests/            Vitest specs (*.test.ts)
tsconfig.json     TypeScript settings (strict)
docs/PLAN.md      the build plan, phase by phase
docs/mocks/       screen mockups (.dc.html); their SVGs use game pixels
DECISIONS.md      choices the plan does not cover
```

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` runs on each push to `main`. It runs the tests, builds the game, and publishes `dist/` to GitHub Pages.

The deploy is **not on yet**. To turn it on:

1. Make sure Pages is available. A private repo needs GitHub Pro. A public repo works on the free plan.
2. In the repo on GitHub, go to Settings > Pages and set Source to "GitHub Actions".
3. Push to `main`.

## Troubleshooting

**Blank page, and the console shows `__SERVER_FORWARD_CONSOLE__ is not defined`.** An old dev server from before the Vite 8 upgrade still runs on port 8080. Stop it with Ctrl+C in its terminal. If you cannot find that terminal, run `lsof -nP -iTCP:8080 -sTCP:LISTEN` to get its PID, then `kill <PID>`. Then run `npm run dev` again.

**LEADERBOARD says CAN'T REACH THE BOARD.** The leaderboard server is not running, or not on port 3030. Run `npm run server`. To see what uses the port, run `lsof -nP -iTCP:3030 -sTCP:LISTEN`. The message can take 5 seconds to appear, because some firewalls drop the request instead of refusing it.
