// Writes the character art from src/art/people.ts to public/assets/sprites/ as PNGs, which Boot loads instead of
// the code-drawn art. Existing files are skipped so pixel edits survive; delete a file to redraw it from people.ts.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import {
    CHARACTER_HEIGHT, CHARACTER_WIDTH, NPC_KEYS, PLAYER_SHEET_HEIGHT, PLAYER_SHEET_WIDTH, drawNpc, drawPlayerSheet,
    playerTextureKey, spriteUrl
} from '../src/art/people.ts';
import { createPixelBuffer, pixelBufferTarget, type PixelBuffer } from '../src/art/pixelBuffer.ts';
import type { PixelTarget } from '../src/art/paint.ts';
import { CHARACTER_IDS } from '../src/data/characters.ts';
import { encodePng } from './png.ts';

const SPRITES = [
    ...CHARACTER_IDS.map((character) => ({
        key: playerTextureKey(character),
        width: PLAYER_SHEET_WIDTH,
        height: PLAYER_SHEET_HEIGHT,
        draw: (target: PixelTarget) => drawPlayerSheet(target, character)
    })),
    ...NPC_KEYS.map((key) => ({
        key,
        width: CHARACTER_WIDTH,
        height: CHARACTER_HEIGHT,
        draw: (target: PixelTarget) => drawNpc(target, key)
    }))
];

function render({ width, height, draw }: (typeof SPRITES)[number]): PixelBuffer {
    const image = createPixelBuffer(width, height);
    draw(pixelBufferTarget(image));
    return image;
}

mkdirSync('public/assets/sprites', { recursive: true });

for (const sprite of SPRITES) {
    const path = `public/${spriteUrl(sprite.key)}`;

    if (existsSync(path)) {
        console.log(`Skipped ${path} (already exists)`);
        continue;
    }

    writeFileSync(path, encodePng(render(sprite)));
    console.log(`Wrote ${path} (${sprite.width}x${sprite.height} pixels)`);
}
