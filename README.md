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
| `npm run build:map` | Makes `public/maps/downtown.json` again. This overwrites edits made in Tiled. |

## Play on your phone during development

1. Connect the phone and the computer to the same Wi-Fi network.
2. Run `npm run dev -- --host`.
3. On the phone, open the `Network` URL that Vite prints, for example `http://192.168.18.44:8080/`.

## Project layout

```
src/
  main.ts         game config and scene list
  palette.ts      the 17 colors; use these, not hex codes
  data/           stops, dialogue, rhythm charts
  state/          saving to localStorage
  logic/          minigame rules, no Phaser (unit-tested)
  scenes/         Phaser scenes, minigames in scenes/minigames/
  ui/             Panel, Button, DialogueBox, and so on
  art/            placeholder art drawn at startup from the mockup shapes
public/
  assets/         images, audio, fonts (README lists every texture key and size)
  maps/           downtown.json (Tiled format)
scripts/          build-map.js (plain JavaScript, run by Node)
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
