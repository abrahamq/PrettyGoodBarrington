// Scoop Stack rules (SoCo Creamery). No Phaser here: each function takes a state and returns a new one,
// and the scene only draws the state and passes on taps.
//
// A scoop slides left and right above the cone. Dropping it lets it fall onto the stack. It lands if it is
// within `tolerance` pixels of the top scoop's current position; otherwise it spills and the run is lost.
// Each landing adds the size of its offset to the wobble. The stack sways more with more wobble and more
// scoops, and the wobble slowly settles over time. Too much wobble topples the stack.
// Stack five scoops within 30 seconds to win.
//
// Positions are in game pixels. x is measured from the middle of the cone; y grows downward, and a
// scoop's y is its bottom edge.

export type Flavor = 'vanilla' | 'darkChoc' | 'strawberry' | 'mintChip';
export type LossReason = 'spill' | 'topple' | 'time';
export type WobbleLevel = 'safe' | 'warn' | 'danger';

export const SCOOP_STACK = {
    goal: 5,
    timeLimitMs: 30_000,
    flavors: ['vanilla', 'darkChoc', 'strawberry', 'mintChip'] as Flavor[],
    tolerance: 7,
    toppleWobble: 20,
    wobbleDecayPerSecond: 2,
    swayPeriodMs: 1400,
    swayPerWobble: 0.35,
    swayHeightFactor: 0.25,
    maxSway: 10,
    slideRange: 44,
    slideSpeed: 60,
    slideSpeedPerScoop: 15,
    slideY: 40,
    fallSpeed: 180,
    coneTopY: 100,
    scoopStep: 9
};

export interface Scoop {
    flavor: Flavor;
    // Where this scoop rests, not counting the sway.
    x: number;
}

export interface ScoopStackState {
    status: 'playing' | 'won' | 'lost';
    lossReason: LossReason | null;
    elapsedMs: number;
    slideX: number;
    slideDirection: 1 | -1;
    falling: { x: number; y: number } | null;
    stack: Scoop[];
    wobble: number;
    // Where the last scoop missed, so the scene can show it falling off.
    spilledX: number | null;
}

export function newScoopStack(): ScoopStackState {
    return {
        status: 'playing',
        lossReason: null,
        elapsedMs: 0,
        slideX: -SCOOP_STACK.slideRange,
        slideDirection: 1,
        falling: null,
        stack: [],
        wobble: 0,
        spilledX: null
    };
}

export function currentFlavor(state: ScoopStackState): Flavor {
    return SCOOP_STACK.flavors[state.stack.length % SCOOP_STACK.flavors.length];
}

export function dropScoop(state: ScoopStackState): ScoopStackState {
    if (state.status !== 'playing' || state.falling) {
        return state;
    }

    return { ...state, falling: { x: state.slideX, y: SCOOP_STACK.slideY } };
}

export function updateScoopStack(state: ScoopStackState, deltaMs: number): ScoopStackState {
    if (state.status !== 'playing') {
        return state;
    }

    const seconds = deltaMs / 1000;
    let next: ScoopStackState = {
        ...state,
        elapsedMs: state.elapsedMs + deltaMs,
        wobble: Math.max(0, state.wobble - SCOOP_STACK.wobbleDecayPerSecond * seconds),
        ...slide(state, seconds)
    };

    if (next.falling) {
        const y = next.falling.y + SCOOP_STACK.fallSpeed * seconds;
        next = y >= landingY(next) ? land(next, next.falling.x) : { ...next, falling: { x: next.falling.x, y } };
    }

    if (next.status === 'playing' && next.elapsedMs >= SCOOP_STACK.timeLimitMs) {
        next = { ...next, status: 'lost', lossReason: 'time', falling: null };
    }

    return next;
}

// Resolves a scoop arriving on top of the stack at `dropX`.
export function land(state: ScoopStackState, dropX: number): ScoopStackState {
    const offset = dropX - topX(state);

    if (Math.abs(offset) > SCOOP_STACK.tolerance) {
        return { ...state, status: 'lost', lossReason: 'spill', falling: null, spilledX: dropX };
    }

    const restX = dropX - swayOffset(state);
    const stack = [...state.stack, { flavor: currentFlavor(state), x: state.stack.length === 0 ? dropX : restX }];
    const wobble = state.wobble + Math.abs(offset);
    const landed = { ...state, stack, wobble, falling: null };

    if (wobble >= SCOOP_STACK.toppleWobble) {
        return { ...landed, status: 'lost', lossReason: 'topple' };
    }
    if (stack.length >= SCOOP_STACK.goal) {
        return { ...landed, status: 'won' };
    }

    return landed;
}

// How far the top of the stack leans right now (negative is left). The cone itself never sways.
export function swayOffset(state: ScoopStackState): number {
    const amplitude = Math.min(
        SCOOP_STACK.maxSway,
        state.wobble * SCOOP_STACK.swayPerWobble * (1 + SCOOP_STACK.swayHeightFactor * state.stack.length)
    );

    return amplitude * Math.sin((2 * Math.PI * state.elapsedMs) / SCOOP_STACK.swayPeriodMs);
}

// Where each scoop is drawn right now: its resting place plus its share of the sway (more for higher scoops).
export function scoopOffsets(state: ScoopStackState): number[] {
    const sway = swayOffset(state);
    const count = state.stack.length;

    return state.stack.map((scoop, i) => scoop.x + (sway * (i + 1)) / count);
}

// The y where a falling scoop's bottom touches the top of the stack.
export function landingY(state: ScoopStackState): number {
    return SCOOP_STACK.coneTopY - state.stack.length * SCOOP_STACK.scoopStep;
}

export function wobbleFraction(state: ScoopStackState): number {
    return Math.min(1, state.wobble / SCOOP_STACK.toppleWobble);
}

export function wobbleLevel(state: ScoopStackState): WobbleLevel {
    const fraction = wobbleFraction(state);

    if (fraction < 0.5) {
        return 'safe';
    }
    return fraction < 0.8 ? 'warn' : 'danger';
}

export function timeLeftMs(state: ScoopStackState): number {
    return Math.max(0, SCOOP_STACK.timeLimitMs - state.elapsedMs);
}

// 100 points per scoop on the cone, plus 10 points per whole second left if you win.
export function scoreFor(state: ScoopStackState): number {
    const timeBonus = state.status === 'won' ? Math.floor(timeLeftMs(state) / 1000) * 10 : 0;
    return state.stack.length * 100 + timeBonus;
}

function topX(state: ScoopStackState): number {
    if (state.stack.length === 0) {
        return 0;
    }
    return state.stack[state.stack.length - 1].x + swayOffset(state);
}

// The sliding scoop speeds up as the stack grows, and turns around at each end of its range.
function slide(state: ScoopStackState, seconds: number): Pick<ScoopStackState, 'slideX' | 'slideDirection'> {
    const range = SCOOP_STACK.slideRange;
    const speed = SCOOP_STACK.slideSpeed + SCOOP_STACK.slideSpeedPerScoop * state.stack.length;
    let x = state.slideX + state.slideDirection * speed * seconds;
    let direction = state.slideDirection;

    if (x > range) {
        x = range - (x - range);
        direction = -1;
    } else if (x < -range) {
        x = -range + (-range - x);
        direction = 1;
    }

    return { slideX: Math.max(-range, Math.min(range, x)), slideDirection: direction };
}
