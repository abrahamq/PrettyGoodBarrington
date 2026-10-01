// Checks the three player boys: every frame fits the 12x16 character frame with feet on the bottom row,
// and their sizes match the picks on Character Select (youngest shortest, 11-year-old widest).
import { describe, expect, it } from 'vitest';
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, PLAYER_FRAMES_PER_ROW, PLAYER_ROWS, playerFrame } from '../src/art/people.ts';
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

    it('makes the 11-year-old wider than the two skinny boys', () => {
        const width = (character: CharacterId): number => standing(character).right - standing(character).left;

        expect(width('eleven')).toBeGreaterThan(width('five'));
        expect(width('eleven')).toBeGreaterThan(width('fifteen'));
    });

    it('mirrors the left-facing art for the right-facing row', () => {
        const left = playerFrame('five', 'left', 1);
        const right = playerFrame('five', 'right', 1);

        expect(right.layers).toEqual(left.layers);
        expect([left.mirror, right.mirror]).toEqual([false, true]);
    });
});
