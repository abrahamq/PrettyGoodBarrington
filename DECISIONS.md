# Decisions

Choices that `docs/PLAN.md` does not cover. Each entry says what we chose and why.

## Phase 0: Scaffold (2026-09-27)

1. **Scaffold source.** We copied the official `phaserjs/template-vite` (JavaScript) repo. `npm create @phaserjs/game@latest` downloads this same template, but it needs interactive answers that an automated shell cannot give. We removed the demo scenes, the demo images, and `log.js`. `log.js` sent a usage ping to `gryzor.co` on each dev and build run.
2. **Node 22.12.0, pinned in `.nvmrc`.** Vitest 5 needs Node 22.12 or later. We installed it with nvm for this project only. The global default stays on Node 20.14.0. The deploy workflow reads the same `.nvmrc`.
3. **Vite 8, not the template's Vite 6.** Vite 8 works with Vitest 5 and with `vite-plugin-pwa` 1.3 (needed in Phase 7).
4. **No terser.** The template used terser to minify. Vite's built-in minifier does the same job, so the dependency list stays at the four allowed packages.
5. **One `vite.config.js`.** The template had separate dev and prod configs. One file is easier to read, and Vitest reads the same file.
6. **Phaser in its own build file.** Phaser is about 1.4 MB. In its own file, the browser keeps it cached when only game code changes.
7. **Palette format.** `PALETTE` holds `'#rrggbb'` strings for text styles. `colorNumber(name)` returns the `0xrrggbb` number that Phaser Graphics needs. An unknown name throws an error, so a typo fails at once.
8. **Page background.** `src/style.css` repeats the `ink` hex code, because CSS cannot import `palette.js`.
9. **Map script output.** `npm run build:map` writes a blank 60x24 grass map with the four planned layers. `npm run build` does not run it, so edits made in Tiled stay. The tileset points to `public/assets/tiles.png`, which does not exist yet. Phase 2 must write that PNG, so Tiled can show the tiles.
10. **Boot scene draws a 1-pixel frame.** It is a temporary check that the canvas is 240x160 and scales crisply. Phase 1 replaces it.
11. **Deploy is local only for now.** The repo is private, and GitHub Pages needs GitHub Pro for a private repo. The workflow is committed but not pushed, and Pages is off. Because of this, the Phase 0 check "the deployed URL loads on my phone" is not done yet. Use `npm run dev -- --host` to test on a phone.
12. **The plan lives in the repo.** `docs/PLAN.md` holds the full build plan, so each new work session can read it.
