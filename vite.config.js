// Vite settings for the dev server, the production build, and Vitest.
import { defineConfig } from 'vite';

export default defineConfig({
    // Relative asset paths, so the build also works from a GitHub Pages subfolder.
    base: './',
    server: {
        port: 8080
    },
    build: {
        // Phaser alone is about 1.2 MB minified. Keep it in its own file so the
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
        include: ['tests/**/*.test.js']
    }
});
