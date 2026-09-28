// Checks the SVG path helpers that turn mockup shapes into rows of whole pixels.
import { describe, expect, it } from 'vitest';
import { fillSpans, parsePath, pathToSpans, rectPath } from '../src/art/svgPath.ts';

describe('parsePath', () => {
    it('reads a 1x1 square drawn with relative h and v', () => {
        expect(parsePath('M12 6h1v1h-1z')).toEqual([
            [{ x: 12, y: 6 }, { x: 13, y: 6 }, { x: 13, y: 7 }, { x: 12, y: 7 }]
        ]);
    });

    it('starts a new shape at each M', () => {
        const shapes = parsePath('M12 6h1v1h-1z M40 14h1v1h-1z');

        expect(shapes).toHaveLength(2);
        expect(shapes[1][0]).toEqual({ x: 40, y: 14 });
    });

    it('reads absolute H and V', () => {
        expect(parsePath('M0 104V84h12V112H0z')).toEqual([
            [{ x: 0, y: 104 }, { x: 0, y: 84 }, { x: 12, y: 84 }, { x: 12, y: 112 }, { x: 0, y: 112 }]
        ]);
    });

    it('reads relative l, including numbers joined by a minus sign', () => {
        expect(parsePath('M27 88l3-22l3 22z')).toEqual([
            [{ x: 27, y: 88 }, { x: 30, y: 66 }, { x: 33, y: 88 }]
        ]);
    });

    it('throws on a command it does not support, so a bad port fails loudly', () => {
        expect(() => parsePath('M0 0C1 1 2 2 3 3z')).toThrow('Unsupported SVG path command: C');
    });
});

describe('rectPath', () => {
    it('writes a rectangle as a path', () => {
        expect(parsePath(rectPath(0, 30, 240, 18))).toEqual([
            [{ x: 0, y: 30 }, { x: 240, y: 30 }, { x: 240, y: 48 }, { x: 0, y: 48 }]
        ]);
    });
});

describe('fillSpans', () => {
    it('fills a 1x1 square with one pixel', () => {
        const [square] = parsePath('M12 6h1v1h-1z');

        expect(fillSpans(square)).toEqual([{ y: 6, x: 12, width: 1 }]);
    });

    it('fills a rectangle with one full-width row per pixel row', () => {
        const [rect] = parsePath(rectPath(4, 10, 24, 3));

        expect(fillSpans(rect)).toEqual([
            { y: 10, x: 4, width: 24 },
            { y: 11, x: 4, width: 24 },
            { y: 12, x: 4, width: 24 }
        ]);
    });

    it('fills a concave L shape', () => {
        const [shape] = parsePath('M0 0h2v1h-1v1h-1z');

        expect(fillSpans(shape)).toEqual([
            { y: 0, x: 0, width: 2 },
            { y: 1, x: 0, width: 1 }
        ]);
    });

    it('fills a diagonal steeple with whole pixels, widest at the base', () => {
        const [steeple] = parsePath('M27 88l3-22l3 22z');
        const spans = fillSpans(steeple);
        const base = spans[spans.length - 1];

        expect(base).toEqual({ y: 87, x: 27, width: 6 });
        for (const span of spans) {
            expect(span.x + span.width / 2).toBe(30);
        }
        for (let i = 1; i < spans.length; i++) {
            expect(spans[i].width).toBeGreaterThanOrEqual(spans[i - 1].width);
        }
    });
});

describe('pathToSpans', () => {
    it('fills every shape in the path', () => {
        expect(pathToSpans('M0 0h1v1h-1z M5 5h2v1h-2z')).toEqual([
            { y: 0, x: 0, width: 1 },
            { y: 5, x: 5, width: 2 }
        ]);
    });
});
