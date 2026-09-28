// Draws the placeholder art at startup and stores it as textures under stable keys.
// If a real image was already loaded under the same key, the real one wins and the placeholder is skipped.
// Keys, sizes, and layouts are listed in public/assets/README.md.
import type { GameObjects, Scene } from 'phaser';
import { TILESET_HEIGHT, TILESET_NAME, TILESET_WIDTH, drawTileset } from '../map/tileset.ts';
import { drawLayers, graphicsTarget, type Layer } from './paint.ts';
import {
    CHARACTER_HEIGHT, CHARACTER_WIDTH, NPC_ART, NPC_KEYS, PLAYER_FRAMES_PER_ROW, PLAYER_KEY, PLAYER_ROWS, playerFrame
} from './people.ts';
import { rectPath } from './svgPath.ts';
import { TITLE_BACKGROUND } from './titleBackground.ts';

export const TEXTURES = {
    titleBackground: 'title-bg',
    panel: 'ui-panel',
    cursor: 'ui-cursor',
    stamp: 'ui-stamp',
    arrow: 'ui-arrow',
    more: 'ui-more',
    tiles: TILESET_NAME,
    player: PLAYER_KEY
} as const;

export function generatePlaceholderTextures(scene: Scene): void {
    makeTexture(scene, TEXTURES.titleBackground, 240, 160, (graphics) => drawLayers(graphicsTarget(graphics), TITLE_BACKGROUND));
    makeTexture(scene, TEXTURES.panel, 7, 7, paintPanel);
    makeTexture(scene, TEXTURES.cursor, 6, 7, (graphics) => paintArt(graphics, CURSOR));
    makeTexture(scene, TEXTURES.stamp, 10, 10, (graphics) => paintArt(graphics, STAMP));
    makeTexture(scene, TEXTURES.arrow, 7, 4, (graphics) => paintArt(graphics, ARROW));
    makeTexture(scene, TEXTURES.more, 5, 3, (graphics) => paintArt(graphics, MORE));
    makeTexture(scene, TEXTURES.tiles, TILESET_WIDTH, TILESET_HEIGHT, (graphics) => drawTileset(graphicsTarget(graphics)));

    for (const key of NPC_KEYS) {
        makeTexture(scene, key, CHARACTER_WIDTH, CHARACTER_HEIGHT, (graphics) =>
            drawLayers(graphicsTarget(graphics), NPC_ART[key], { width: CHARACTER_WIDTH, height: CHARACTER_HEIGHT }));
    }

    if (makeTexture(scene, TEXTURES.player, CHARACTER_WIDTH * PLAYER_FRAMES_PER_ROW, CHARACTER_HEIGHT * PLAYER_ROWS.length, paintPlayer)) {
        addPlayerFrames(scene);
    }
}

// The menu arrow from Main.dc.html, one mockup unit per game pixel.
const CURSOR: Layer[] = [{ color: 'gold', path: 'M0 0h2v7h-2z M2 1h2v5h-2z M4 2h2v3h-2z' }];
// The stamp icon from the clock box in Overworld.dc.html.
const STAMP: Layer[] = [
    { color: 'red', path: 'M2 0h6v1h-6z M1 1h8v8h-8z M2 9h6v1h-6z' },
    { color: 'cream', path: 'M3 3h4v4h-4z' }
];
// An up arrow for the d-pad; the game rotates it for the other directions.
const ARROW: Layer[] = [{ color: 'cream', path: 'M3 0h1v1h-1z M2 1h3v1h-3z M1 2h5v1h-5z M0 3h7v1h-7z' }];
// The small "more to read" arrow in the corner of the dialogue box.
const MORE: Layer[] = [{ color: 'ink', path: 'M0 0h5v1h-5z M1 1h3v1h-3z M2 2h1v1h-1z' }];

// Returns true when it drew the texture, false when a real image already uses the key.
function makeTexture(
    scene: Scene,
    key: string,
    width: number,
    height: number,
    paint: (graphics: GameObjects.Graphics) => void
): boolean {
    if (scene.textures.exists(key)) {
        return false;
    }

    const graphics = scene.make.graphics({}, false);
    paint(graphics);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
    return true;
}

function paintArt(graphics: GameObjects.Graphics, layers: Layer[]): void {
    drawLayers(graphicsTarget(graphics), layers);
}

// 7x7: ink outer line, then parchment, then wood, then a cream center. The Panel 9-slice uses 3px corners.
function paintPanel(graphics: GameObjects.Graphics): void {
    paintArt(graphics, [
        { color: 'ink', path: rectPath(0, 0, 7, 7) },
        { color: 'parchment', path: rectPath(1, 1, 5, 5) },
        { color: 'wood', path: rectPath(2, 2, 3, 3) },
        { color: 'cream', path: rectPath(3, 3, 1, 1) }
    ]);
}

// 3 columns (standing, left foot, right foot) by 4 rows (down, left, right, up).
function paintPlayer(graphics: GameObjects.Graphics): void {
    PLAYER_ROWS.forEach((row, rowIndex) => {
        for (let step = 0; step < PLAYER_FRAMES_PER_ROW; step++) {
            const frame = playerFrame(row, step);
            drawLayers(graphicsTarget(graphics), frame.layers, {
                x: step * CHARACTER_WIDTH,
                y: rowIndex * CHARACTER_HEIGHT,
                width: CHARACTER_WIDTH,
                height: CHARACTER_HEIGHT,
                mirror: frame.mirror
            });
        }
    });
}

// Numbers the frames 0-11, row by row, the same way load.spritesheet() numbers a real sheet.
function addPlayerFrames(scene: Scene): void {
    const texture = scene.textures.get(TEXTURES.player);

    for (let index = 0; index < PLAYER_FRAMES_PER_ROW * PLAYER_ROWS.length; index++) {
        const x = (index % PLAYER_FRAMES_PER_ROW) * CHARACTER_WIDTH;
        const y = Math.floor(index / PLAYER_FRAMES_PER_ROW) * CHARACTER_HEIGHT;
        texture.add(index, 0, x, y, CHARACTER_WIDTH, CHARACTER_HEIGHT);
    }
}
