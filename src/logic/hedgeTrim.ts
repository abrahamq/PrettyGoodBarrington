// Trim the GB rules (Jack's hedge on the town lawn). No Phaser here: each function takes a state and returns a new
// one, and the scene only draws the state and passes on finger or mouse strokes.
//
// The hedge is shaped like the letters G and B: every pixel within `hedgeRadius` of the letters' middle lines.
// You trim its edges: guide points sit every 2 pixels around the outline of each letter (and around the two holes
// in the B). Dragging the clippers trims every guide point within `cutRadius` of them.
// Trim 95% of the guide points before the 30 seconds run out to win.
// Aim measures how close the clippers stay to the edge, over every pixel they travel:
// 100% within `exactDistance`, falling to 0% at `missDistance`. Lifting your finger between strokes costs nothing.
// The clock starts at the first cut, so reading the screen is free.
//
// Positions are in game pixels on the 240x160 screen.

export interface Point {
    x: number;
    y: number;
}

export type HedgeTrimStatus = 'ready' | 'playing' | 'won' | 'lost';

export const HEDGE_TRIM = {
    timeLimitMs: 30_000,
    sampleSpacing: 2,
    // Half the hedge's thickness.
    hedgeRadius: 7,
    // Smaller than hedgeRadius, so cutting along one edge never trims the edge across the hedge.
    cutRadius: 5,
    exactDistance: 3,
    missDistance: 10,
    goal: 0.95,
    aimPoints: 1000,
    pointsPerSecondLeft: 10
};

const G = { x: 88, y: 98, rx: 28, ry: 36 };
const B = { left: 142, top: 62, middle: 96, bottom: 134 };

// The middle lines of the letters, as connected points. Angles are in degrees, counterclockwise from 3 o'clock.
export const LETTER_STROKES: Point[][] = [
    // G: from its upper tip, around the left side to 3 o'clock, then the bar inward.
    [...arc(G.x, G.y, G.rx, G.ry, 40, 360), { x: G.x + 6, y: G.y }],
    // B: the spine, then the upper and lower bowls.
    [{ x: B.left, y: B.top }, { x: B.left, y: B.bottom }],
    [{ x: B.left, y: B.top }, ...arc(158, 79, 17, 17, 90, -90), { x: B.left, y: B.middle }],
    [{ x: B.left, y: B.middle }, ...arc(160, 115, 19, 19, 90, -90), { x: B.left, y: B.bottom }]
];

export const MIDDLE_POINTS: Point[] = LETTER_STROKES.flatMap((stroke) => resample(stroke, HEDGE_TRIM.sampleSpacing));

// The part of the screen the hedge can cover, with room for its overgrowth.
export const HEDGE_AREA = { x: 36, y: 40, width: 168, height: 116 };

// For each pixel in HEDGE_AREA, row by row: the distance from its center to the nearest middle point.
export const MIDDLE_DISTANCES: Float32Array = measureMiddleDistances();

export function isHedgePixel(x: number, y: number): boolean {
    const col = x - HEDGE_AREA.x;
    const row = y - HEDGE_AREA.y;

    return col >= 0 && row >= 0 && col < HEDGE_AREA.width && row < HEDGE_AREA.height
        && MIDDLE_DISTANCES[row * HEDGE_AREA.width + col] <= HEDGE_TRIM.hedgeRadius;
}

// The centers of the hedge's edge pixels (hedge pixels next to a pixel outside it), thinned to about 2 pixels apart.
export const GUIDE_POINTS: Point[] = spacedOut(edgePixels(), HEDGE_TRIM.sampleSpacing);

export interface HedgeTrimState {
    status: HedgeTrimStatus;
    elapsedMs: number;
    // One per guide point.
    trimmed: boolean[];
    trimmedCount: number;
    // Pixels the clippers have traveled, and the same pixels weighted by how close they stayed to the line.
    tracedLength: number;
    accurateLength: number;
}

export function newHedgeTrim(): HedgeTrimState {
    return {
        status: 'ready',
        elapsedMs: 0,
        trimmed: GUIDE_POINTS.map(() => false),
        trimmedCount: 0,
        tracedLength: 0,
        accurateLength: 0
    };
}

// Moves the clippers in a straight line, one pixel at a time. A tap is a stroke with `from` equal to `to`.
export function traceStroke(state: HedgeTrimState, from: Point, to: Point): HedgeTrimState {
    if (state.status === 'won' || state.status === 'lost') {
        return state;
    }

    const trimmed = [...state.trimmed];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(length));
    const stepLength = length / steps;
    let accurateLength = state.accurateLength;

    for (let i = 1; i <= steps; i++) {
        const point = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
        accurateLength += stepLength * closeness(cutAround(point, trimmed));
    }

    const trimmedCount = trimmed.filter(Boolean).length;
    const next: HedgeTrimState = {
        ...state,
        status: 'playing',
        trimmed,
        trimmedCount,
        tracedLength: state.tracedLength + length,
        accurateLength
    };

    if (trimmedCount / GUIDE_POINTS.length >= HEDGE_TRIM.goal) {
        return { ...next, status: 'won', trimmed: GUIDE_POINTS.map(() => true), trimmedCount: GUIDE_POINTS.length };
    }

    return next;
}

export function updateHedgeTrim(state: HedgeTrimState, deltaMs: number): HedgeTrimState {
    if (state.status !== 'playing') {
        return state;
    }

    const elapsedMs = state.elapsedMs + deltaMs;

    if (elapsedMs >= HEDGE_TRIM.timeLimitMs) {
        return { ...state, status: 'lost', elapsedMs: HEDGE_TRIM.timeLimitMs };
    }

    return { ...state, elapsedMs };
}

// The share of guide points trimmed, from 0 to 1.
export function neatness(state: HedgeTrimState): number {
    return state.trimmedCount / GUIDE_POINTS.length;
}

// From 0 to 1, or null before the clippers have moved.
export function aim(state: HedgeTrimState): number | null {
    return state.tracedLength > 0 ? state.accurateLength / state.tracedLength : null;
}

export function timeLeftMs(state: HedgeTrimState): number {
    return Math.max(0, HEDGE_TRIM.timeLimitMs - state.elapsedMs);
}

// A win scores up to 1000 for aim, plus 10 per whole second left. Running out of time scores the aim
// times the share trimmed, with no time bonus.
export function scoreFor(state: HedgeTrimState): number {
    const aimShare = aim(state) ?? 0;

    if (state.status === 'won') {
        return Math.round(HEDGE_TRIM.aimPoints * aimShare) + HEDGE_TRIM.pointsPerSecondLeft * Math.floor(timeLeftMs(state) / 1000);
    }

    return Math.round(HEDGE_TRIM.aimPoints * aimShare * neatness(state));
}

// From 1 (on the line) down to 0 (a miss).
export function closeness(distance: number): number {
    const { exactDistance, missDistance } = HEDGE_TRIM;

    if (distance <= exactDistance) {
        return 1;
    }

    return Math.max(0, 1 - (distance - exactDistance) / (missDistance - exactDistance));
}

export function nearestGuidePoint(point: Point): { index: number; distance: number } {
    let index = 0;
    let distance = Infinity;

    GUIDE_POINTS.forEach((guide, i) => {
        const d = Math.hypot(guide.x - point.x, guide.y - point.y);
        if (d < distance) {
            index = i;
            distance = d;
        }
    });

    return { index, distance };
}

// Trims the guide points near `point` and returns its distance to the nearest one.
function cutAround(point: Point, trimmed: boolean[]): number {
    let nearest = Infinity;

    GUIDE_POINTS.forEach((guide, i) => {
        const d = Math.hypot(guide.x - point.x, guide.y - point.y);
        nearest = Math.min(nearest, d);
        if (d <= HEDGE_TRIM.cutRadius) {
            trimmed[i] = true;
        }
    });

    return nearest;
}

function measureMiddleDistances(): Float32Array {
    const distances = new Float32Array(HEDGE_AREA.width * HEDGE_AREA.height);

    for (let row = 0; row < HEDGE_AREA.height; row++) {
        for (let col = 0; col < HEDGE_AREA.width; col++) {
            const x = HEDGE_AREA.x + col + 0.5;
            const y = HEDGE_AREA.y + row + 0.5;
            let nearest = Infinity;

            for (const point of MIDDLE_POINTS) {
                nearest = Math.min(nearest, (point.x - x) ** 2 + (point.y - y) ** 2);
            }
            distances[row * HEDGE_AREA.width + col] = Math.sqrt(nearest);
        }
    }

    return distances;
}

function edgePixels(): Point[] {
    const points: Point[] = [];

    for (let y = HEDGE_AREA.y; y < HEDGE_AREA.y + HEDGE_AREA.height; y++) {
        for (let x = HEDGE_AREA.x; x < HEDGE_AREA.x + HEDGE_AREA.width; x++) {
            const onEdge = isHedgePixel(x, y)
                && (!isHedgePixel(x - 1, y) || !isHedgePixel(x + 1, y) || !isHedgePixel(x, y - 1) || !isHedgePixel(x, y + 1));
            if (onEdge) {
                points.push({ x: x + 0.5, y: y + 0.5 });
            }
        }
    }

    return points;
}

// Keeps each point unless an earlier kept point is closer than `spacing`.
export function spacedOut(points: Point[], spacing: number): Point[] {
    const kept: Point[] = [];

    for (const point of points) {
        if (kept.every((other) => Math.hypot(other.x - point.x, other.y - point.y) >= spacing)) {
            kept.push(point);
        }
    }

    return kept;
}

// Points around an ellipse, every 2 degrees. y grows downward, so a positive angle is above the center.
function arc(cx: number, cy: number, rx: number, ry: number, fromDegrees: number, toDegrees: number): Point[] {
    const points: Point[] = [];
    const steps = Math.ceil(Math.abs(toDegrees - fromDegrees) / 2);

    for (let i = 0; i <= steps; i++) {
        const radians = ((fromDegrees + ((toDegrees - fromDegrees) * i) / steps) * Math.PI) / 180;
        points.push({ x: cx + rx * Math.cos(radians), y: cy - ry * Math.sin(radians) });
    }

    return points;
}

// Evenly spaced points along a line of connected points, starting with its first point.
export function resample(points: Point[], spacing: number): Point[] {
    const result = [points[0]];
    // How far along the line the last placed point is, measured back from the end of the current piece.
    let sinceLast = 0;

    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        let along = spacing - sinceLast;

        while (along <= length) {
            result.push({ x: a.x + ((b.x - a.x) * along) / length, y: a.y + ((b.y - a.y) * along) / length });
            along += spacing;
        }
        sinceLast = length - (along - spacing);
    }

    return result;
}
