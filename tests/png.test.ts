// Checks the tiny PNG writer the map script uses to save tiles.png.
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { createPixelBuffer } from '../src/art/pixelBuffer.ts';
import { encodePng } from '../scripts/png.ts';

describe('encodePng', () => {
    const image = createPixelBuffer(2, 1);
    image.data.set([255, 0, 0, 255, 0, 0, 255, 128]);
    const png = encodePng(image);

    it('starts with the PNG signature and an IHDR chunk for a 2x1 RGBA image', () => {
        expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        expect(new TextDecoder().decode(png.slice(12, 16))).toBe('IHDR');
        expect(Array.from(png.slice(16, 26))).toEqual([0, 0, 0, 2, 0, 0, 0, 1, 8, 6]);
    });

    it('stores each row with filter byte 0 followed by the raw pixels', () => {
        const idatStart = 8 + 25 + 8;
        const view = new DataView(png.buffer, png.byteOffset);
        const length = view.getUint32(idatStart - 8);

        expect(Array.from(inflateSync(png.slice(idatStart, idatStart + length)))).toEqual([0, 255, 0, 0, 255, 0, 0, 255, 128]);
    });

    it('ends with an IEND chunk', () => {
        expect(new TextDecoder().decode(png.slice(png.length - 8, png.length - 4))).toBe('IEND');
    });
});
