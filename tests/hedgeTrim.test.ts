// Checks the Trim the GB rules: the guide points around the letters' edges, trimming, aim, the clock, and the score.
// Also checks that the hedge art shrinks from shaggy to neat when it is trimmed.
import { describe, expect, it } from 'vitest';
import { paintHedge } from '../src/art/hedge.ts';
import {
    GUIDE_POINTS, HEDGE_TRIM, LETTER_STROKES, aim, closeness, isHedgePixel, neatness, newHedgeTrim, resample, scoreFor,
    spacedOut, timeLeftMs, traceStroke, updateHedgeTrim, type HedgeTrimState, type Point
} from '../src/logic/hedgeTrim.ts';

// Drags the clippers from every guide point to its nearest neighbor, so they never leave the edge.
function traceEverything(state: HedgeTrimState): HedgeTrimState {
    let next = state;

    for (const point of GUIDE_POINTS) {
        next = traceStroke(next, point, nearestOther(point));
    }

    return next;
}

function nearestOther(point: Point): Point {
    const others = GUIDE_POINTS.filter((other) => other !== point);
    const distance = (other: Point) => Math.hypot(other.x - point.x, other.y - point.y);

    return others.reduce((best, other) => (distance(other) < distance(best) ? other : best));
}

function started(): HedgeTrimState {
    return traceStroke(newHedgeTrim(), GUIDE_POINTS[0], GUIDE_POINTS[0]);
}

describe('GUIDE_POINTS', () => {
    it('lie on screen, below the HUD', () => {
        for (const point of GUIDE_POINTS) {
            expect(point.x).toBeGreaterThan(0);
            expect(point.x).toBeLessThan(240);
            expect(point.y).toBeGreaterThan(40);
            expect(point.y).toBeLessThan(160);
        }
        expect(GUIDE_POINTS.length).toBeGreaterThan(300);
    });

    it('sit on the edge of the hedge, next to a pixel outside it', () => {
        for (const { x, y } of GUIDE_POINTS) {
            const [col, row] = [Math.floor(x), Math.floor(y)];

            expect(isHedgePixel(col, row)).toBe(true);
            expect([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !isHedgePixel(col + dx, row + dy))).toBe(true);
        }
    });

    it('keep the G and the B apart, so tracing one never trims the other', () => {
        const gRight = Math.max(...GUIDE_POINTS.filter((point) => point.x < 128).map((point) => point.x));
        const bLeft = Math.min(...GUIDE_POINTS.filter((point) => point.x > 128).map((point) => point.x));

        expect(bLeft - gRight).toBeGreaterThan(HEDGE_TRIM.cutRadius * 2);
    });

    it('cannot be trimmed from the middle of a letter', () => {
        const [g] = LETTER_STROKES.map((stroke) => resample(stroke, HEDGE_TRIM.sampleSpacing));
        let state = newHedgeTrim();
        for (let i = 11; i <= 30; i++) {
            state = traceStroke(state, g[i - 1], g[i]);
        }

        expect(state.trimmedCount).toBe(0);
    });
});

describe('spacedOut', () => {
    it('drops points closer than the spacing to one already kept', () => {
        const points = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];

        expect(spacedOut(points, 2)).toEqual([{ x: 0, y: 0 }, { x: 2, y: 0 }]);
    });
});

describe('resample', () => {
    it('places points the same distance apart, around corners too', () => {
        const points = resample([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 3 }], 1);

        expect(points).toHaveLength(7);
        expect(points[4]).toEqual({ x: 3, y: 1 });
    });
});

describe('traceStroke', () => {
    it('waits for the first cut to start the clock', () => {
        const waiting = updateHedgeTrim(newHedgeTrim(), 5000);
        expect(waiting.elapsedMs).toBe(0);

        const state = traceStroke(waiting, GUIDE_POINTS[0], GUIDE_POINTS[0]);
        expect(state.status).toBe('playing');
        expect(updateHedgeTrim(state, 5000).elapsedMs).toBe(5000);
    });

    it('trims the guide points near the clippers', () => {
        const state = started();

        expect(state.trimmed[0]).toBe(true);
        expect(state.trimmedCount).toBeGreaterThan(1);
        expect(state.trimmedCount).toBeLessThan(10);
    });

    it('wins with perfect aim when every letter is traced on the line', () => {
        const state = traceEverything(newHedgeTrim());

        expect(state.status).toBe('won');
        expect(neatness(state)).toBe(1);
        expect(aim(state)).toBeCloseTo(1);
    });

    it('trims nothing and scores no aim far from the hedge', () => {
        const state = traceStroke(newHedgeTrim(), { x: 5, y: 150 }, { x: 30, y: 150 });

        expect(state.trimmedCount).toBe(0);
        expect(aim(state)).toBe(0);
    });

    it('ignores strokes after the round ends', () => {
        const won = traceEverything(newHedgeTrim());

        expect(traceStroke(won, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(won);
    });
});

describe('closeness', () => {
    it('is full near the line and falls to nothing at the miss distance', () => {
        expect(closeness(0)).toBe(1);
        expect(closeness(HEDGE_TRIM.exactDistance)).toBe(1);
        expect(closeness((HEDGE_TRIM.exactDistance + HEDGE_TRIM.missDistance) / 2)).toBeCloseTo(0.5);
        expect(closeness(HEDGE_TRIM.missDistance + 5)).toBe(0);
    });
});

describe('updateHedgeTrim', () => {
    it('loses when the time runs out', () => {
        const state = updateHedgeTrim(started(), HEDGE_TRIM.timeLimitMs);

        expect(state.status).toBe('lost');
        expect(timeLeftMs(state)).toBe(0);
    });
});

describe('scoreFor', () => {
    it('gives a win its aim points plus 10 per whole second left', () => {
        const state = traceEverything(updateHedgeTrim(started(), 20_500));

        expect(scoreFor(state)).toBe(1000 + 10 * 9);
    });

    it('scales a loss by how much was trimmed, with no time bonus', () => {
        const partway = traceStroke(newHedgeTrim(), GUIDE_POINTS[0], GUIDE_POINTS[10]);
        const state = updateHedgeTrim(partway, HEDGE_TRIM.timeLimitMs);

        expect(scoreFor(state)).toBe(Math.round(1000 * (aim(state) ?? 0) * neatness(state)));
        expect(scoreFor(state)).toBeLessThan(200);
    });
});

describe('paintHedge', () => {
    function leafPixels(trimmed: boolean[]): number {
        const pixels = new Uint8ClampedArray(240 * 160 * 4);
        paintHedge(pixels, trimmed);

        let count = 0;
        for (let i = 3; i < pixels.length; i += 4) {
            count += pixels[i] === 255 ? 1 : 0;
        }
        return count;
    }

    it('draws the shaggy hedge bigger than the trimmed one', () => {
        const shaggy = leafPixels(GUIDE_POINTS.map(() => false));
        const neat = leafPixels(GUIDE_POINTS.map(() => true));

        expect(neat).toBeGreaterThan(1000);
        expect(shaggy).toBeGreaterThan(neat * 1.3);
    });
});
