// Vite settings for the dev server, the production build, and Vitest.
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Worktrees live inside this folder and run their own dev servers, so this one does not watch them.
// The paths are absolute: a pattern like '**/.worktrees/**' also matches every file of a checkout that is
// itself a worktree, and its dev server would then miss every edit.
const nestedWorktrees = ['.worktrees/', '.claude/worktrees/']
    .map((folder) => decodeURIComponent(new URL(folder, import.meta.url).pathname) + '**');

export default defineConfig({
    // Relative asset paths, so the build also works from a GitHub Pages subfolder.
    base: './',
    server: {
        port: 8080,
        watch: {
            ignored: nestedWorktrees
        }
    },
    build: {
        // Phaser alone is about 1.4 MB minified. Keep it in its own file so the
        // browser can keep it cached when only game code changes.
        chunkSizeWarningLimit: 1500,
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        { name: 'phaser', test: /node_modules[\\/]phaser/ }
                    ]
                }
            }
        }
    },
    test: {
        include: ['tests/**/*.test.ts']
    }
});
