// Checks drawWide: background layers that repeat past the stage edges, for screens wider than 240 pixels.
import { describe, expect, it } from 'vitest';
import { drawWide, type Layer } from '../src/art/paint.ts';
import { createPixelBuffer, pixelAt, pixelBufferTarget } from '../src/art/pixelBuffer.ts';

const STAGE = { stageWidth: 8, wing: 4, height: 1 };

function paintedColumns(layers: Layer[]): number[] {
    const buffer = createPixelBuffer(STAGE.stageWidth + STAGE.wing * 2, 1);
    drawWide(pixelBufferTarget(buffer), layers, STAGE);

    const columns: number[] = [];
    for (let x = 0; x < buffer.width; x++) {
        if (pixelAt(buffer, x, 0)[3] > 0) {
            columns.push(x);
        }
    }
    return columns;
}

describe('drawWide', () => {
    it('draws a layer without a repeat on the stage only, shifted past the left wing', () => {
        expect(paintedColumns([{ color: 'ink', path: 'M3 0h1v1h-1z' }])).toEqual([7]);
    });

    it('extends a full-width band across both wings', () => {
        const band: Layer = { color: 'ink', path: 'M0 0h8v1h-8z', repeat: 8 };

        expect(paintedColumns([band])).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    });

    it('continues a pattern at its own period, even when the stage width is not a multiple of it', () => {
        const dots: Layer = { color: 'ink', path: 'M1 0h1v1h-1z', at: [[0, 0], [3, 0], [6, 0]], repeat: 3 };

        expect(paintedColumns([dots])).toEqual([2, 5, 8, 11, 14]);
    });
});
