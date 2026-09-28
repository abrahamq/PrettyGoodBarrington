// Draws the placeholder art at startup and stores it as textures under stable keys.
// If a real image was already loaded under the same key, the real one wins and the placeholder is skipped.
// Keys, sizes, and layouts are listed in public/assets/README.md.
import type { GameObjects, Scene } from 'phaser';
import { paintLayers, paintPath } from './paint.ts';
import { rectPath } from './svgPath.ts';
import { TITLE_BACKGROUND } from './titleBackground.ts';

export const TEXTURES = {
    titleBackground: 'title-bg',
    panel: 'ui-panel',
    cursor: 'ui-cursor'
} as const;

export function generatePlaceholderTextures(scene: Scene): void {
    makeTexture(scene, TEXTURES.titleBackground, 240, 160, (graphics) => paintLayers(graphics, TITLE_BACKGROUND));
    makeTexture(scene, TEXTURES.panel, 7, 7, paintPanel);
    makeTexture(scene, TEXTURES.cursor, 6, 7, paintCursor);
}

function makeTexture(
    scene: Scene,
    key: string,
    width: number,
    height: number,
    paint: (graphics: GameObjects.Graphics) => void
): void {
    if (scene.textures.exists(key)) {
        return;
    }

    const graphics = scene.make.graphics({}, false);
    paint(graphics);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
}

// 7x7: ink outer line, then parchment, then wood, then a cream center. The Panel 9-slice uses 3px corners.
function paintPanel(graphics: GameObjects.Graphics): void {
    paintPath(graphics, 'ink', rectPath(0, 0, 7, 7));
    paintPath(graphics, 'parchment', rectPath(1, 1, 5, 5));
    paintPath(graphics, 'wood', rectPath(2, 2, 3, 3));
    paintPath(graphics, 'cream', rectPath(3, 3, 1, 1));
}

// The menu arrow from Main.dc.html, one mockup unit per game pixel.
function paintCursor(graphics: GameObjects.Graphics): void {
    paintPath(graphics, 'gold', 'M0 0h2v7h-2z M2 1h2v5h-2z M4 2h2v3h-2z');
}
