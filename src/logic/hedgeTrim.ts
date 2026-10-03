// Trim the GB rules (Jack's hedge on the town lawn). No Phaser here: each function takes a state and returns a new
// one, and the scene only draws the state and passes on finger or mouse strokes.
//
// The hedge is shaped like the letters G and B. Each letter is a few strokes along its middle line, and guide points
// sit every 2 pixels along them. Dragging the clippers trims every guide point within `cutRadius` of them.
// Trim 95% of the guide points before the 60 seconds run out to win.
// Aim measures how close the clippers stay to the middle line, over every pixel they travel:
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
    timeLimitMs: 60_000,
    sampleSpacing: 2,
    // Half the hedge's thickness.
    hedgeRadius: 7,
    cutRadius: 6,
    exactDistance: 3,
    missDistance: 12,
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

export const GUIDE_POINTS: Point[] = LETTER_STROKES.flatMap((stroke) => resample(stroke, HEDGE_TRIM.sampleSpacing));

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
