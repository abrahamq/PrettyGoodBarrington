// Checks the three player boys: every frame fits the 12x16 character frame with feet on the bottom row,
// and their heights and widths match the design (youngest shortest, 11-year-old widest).
import { describe, expect, it } from 'vitest';
import {
    CHARACTER_HEIGHT, CHARACTER_WIDTH, PLAYER_FRAMES_PER_ROW, PLAYER_ROWS, PLAYER_SHEET_HEIGHT, PLAYER_SHEET_WIDTH,
    drawPlayerSheet, playerFrame
} from '../src/art/people.ts';
import { createPixelBuffer, pixelAt, pixelBufferTarget } from '../src/art/pixelBuffer.ts';
import { pathToSpans } from '../src/art/svgPath.ts';
import { CHARACTER_IDS, type CharacterId } from '../src/data/characters.ts';
import type { Layer } from '../src/art/paint.ts';

interface Bounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

// The drop shadow is left out: it is the same for every boy.
function bounds(layers: Layer[]): Bounds {
    const spans = layers.filter((layer) => layer.alpha === undefined).flatMap((layer) => pathToSpans(layer.path));

    return {
        left: Math.min(...spans.map((span) => span.x)),
        right: Math.max(...spans.map((span) => span.x + span.width)),
        top: Math.min(...spans.map((span) => span.y)),
        bottom: Math.max(...spans.map((span) => span.y + 1))
    };
}

function standing(character: CharacterId): Bounds {
    return bounds(playerFrame(character, 'down', 0).layers);
}

describe('playerFrame', () => {
    it.each(CHARACTER_IDS)('keeps every frame of %s inside 12x16 with feet on the bottom row', (character) => {
        for (const row of PLAYER_ROWS) {
            for (let step = 0; step < PLAYER_FRAMES_PER_ROW; step++) {
                const box = bounds(playerFrame(character, row, step).layers);

                expect(box.left).toBeGreaterThanOrEqual(0);
                expect(box.right).toBeLessThanOrEqual(CHARACTER_WIDTH);
                expect(box.top).toBeGreaterThanOrEqual(0);
                expect(box.bottom).toBe(CHARACTER_HEIGHT);
            }
        }
    });

    it('makes the 5-year-old 11 pixels tall, the 11-year-old 14, and the 15-year-old 16', () => {
        const heights = CHARACTER_IDS.map((character) => CHARACTER_HEIGHT - standing(character).top);

        expect(heights).toEqual([11, 14, 16]);
    });

    it('makes the 5-year-old 6 pixels wide, the 11-year-old 8, and the 15-year-old 6', () => {
        const widths = CHARACTER_IDS.map((character) => standing(character).right - standing(character).left);

        expect(widths).toEqual([6, 8, 6]);
    });

    it('mirrors the left-facing art for the right-facing row', () => {
        const left = playerFrame('five', 'left', 1);
        const right = playerFrame('five', 'right', 1);

        expect(right.layers).toEqual(left.layers);
        expect([left.mirror, right.mirror]).toEqual([false, true]);
    });
});

describe('drawPlayerSheet', () => {
    it.each(CHARACTER_IDS)('draws the right-facing row of %s as the mirror image of the left-facing row', (character) => {
        const sheet = createPixelBuffer(PLAYER_SHEET_WIDTH, PLAYER_SHEET_HEIGHT);
        drawPlayerSheet(pixelBufferTarget(sheet), character);
        const leftTop = PLAYER_ROWS.indexOf('left') * CHARACTER_HEIGHT;
        const rightTop = PLAYER_ROWS.indexOf('right') * CHARACTER_HEIGHT;
        let painted = 0;

        for (let y = 0; y < CHARACTER_HEIGHT; y++) {
            for (let x = 0; x < PLAYER_SHEET_WIDTH; x++) {
                const left = pixelAt(sheet, x, leftTop + y);
                const frameX = x % CHARACTER_WIDTH;
                const mirroredX = x - frameX + (CHARACTER_WIDTH - 1 - frameX);

                expect(pixelAt(sheet, mirroredX, rightTop + y)).toEqual(left);
                painted += left[3] > 0 ? 1 : 0;
            }
        }

        expect(painted).toBeGreaterThan(0);
    });
});
