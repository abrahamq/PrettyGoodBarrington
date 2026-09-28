// Checks the Scoop Stack rules: landing tolerance, wobble, toppling, sway, flavors, time, winning, and score.
import { describe, expect, it } from 'vitest';
import {
    SCOOP_STACK, currentFlavor, dropScoop, land, newScoopStack, scoopOffsets, scoreFor, swayOffset,
    updateScoopStack, wobbleLevel, type ScoopStackState
} from '../src/logic/scoopStack.ts';

function withStack(offsets: number[], wobble = 0): ScoopStackState {
    const state = newScoopStack();
    return {
        ...state,
        wobble,
        stack: offsets.map((x, i) => ({ flavor: SCOOP_STACK.flavors[i % 4], x }))
    };
}

// Drops a scoop at x and runs the game until it lands (or misses).
function dropAt(state: ScoopStackState, x: number): ScoopStackState {
    let next = dropScoop({ ...state, slideX: x });
    for (let i = 0; i < 200 && next.falling; i++) {
        next = updateScoopStack(next, 10);
    }
    return next;
}

describe('landing', () => {
    it('lands a scoop that is within the tolerance of the cone', () => {
        const state = land(newScoopStack(), SCOOP_STACK.tolerance);

        expect(state.status).toBe('playing');
        expect(state.stack).toEqual([{ flavor: 'vanilla', x: SCOOP_STACK.tolerance }]);
    });

    it('spills a scoop that misses by more than the tolerance, and the run is lost', () => {
        const state = land(newScoopStack(), SCOOP_STACK.tolerance + 1);

        expect(state.status).toBe('lost');
        expect(state.lossReason).toBe('spill');
        expect(state.stack).toHaveLength(0);
    });

    it('measures the miss from the top scoop, not from the cone', () => {
        const state = land(withStack([5]), 5 + SCOOP_STACK.tolerance);

        expect(state.status).toBe('playing');
        expect(state.stack[1].x).toBe(5 + SCOOP_STACK.tolerance);
    });
});

describe('wobble', () => {
    it('adds the size of each landing offset', () => {
        const once = land(newScoopStack(), -3);
        const twice = land(once, -3 + 4);

        expect(once.wobble).toBe(3);
        expect(twice.wobble).toBe(7);
    });

    it('topples the stack when wobble reaches the limit', () => {
        const state = land(withStack([0, 0], SCOOP_STACK.toppleWobble - 2), 2);

        expect(state.status).toBe('lost');
        expect(state.lossReason).toBe('topple');
    });

    it('settles slowly over time, but never below zero', () => {
        const state = updateScoopStack(withStack([0], 5), 1000);

        expect(state.wobble).toBe(5 - SCOOP_STACK.wobbleDecayPerSecond);
        expect(updateScoopStack(withStack([0], 1), 5000).wobble).toBe(0);
    });

    it('is safe, then warn, then danger as it nears the limit', () => {
        expect(wobbleLevel(withStack([], 0))).toBe('safe');
        expect(wobbleLevel(withStack([], SCOOP_STACK.toppleWobble * 0.6))).toBe('warn');
        expect(wobbleLevel(withStack([], SCOOP_STACK.toppleWobble * 0.9))).toBe('danger');
    });
});

describe('sway', () => {
    it('does not sway with no wobble', () => {
        expect(swayOffset({ ...withStack([0, 0], 0), elapsedMs: 350 })).toBe(0);
    });

    it('sways more with more wobble and a taller stack', () => {
        const quarterSwing = SCOOP_STACK.swayPeriodMs / 4;
        const small = swayOffset({ ...withStack([0], 4), elapsedMs: quarterSwing });
        const moreWobble = swayOffset({ ...withStack([0], 8), elapsedMs: quarterSwing });
        const taller = swayOffset({ ...withStack([0, 0, 0], 4), elapsedMs: quarterSwing });

        expect(moreWobble).toBeGreaterThan(small);
        expect(taller).toBeGreaterThan(small);
    });

    it('never sways more than the maximum', () => {
        const state = { ...withStack([0, 0, 0, 0], 100), elapsedMs: SCOOP_STACK.swayPeriodMs / 4 };

        expect(swayOffset(state)).toBeCloseTo(SCOOP_STACK.maxSway);
    });

    it('leans higher scoops further than lower ones', () => {
        const state = { ...withStack([0, 0, 0], 8), elapsedMs: SCOOP_STACK.swayPeriodMs / 4 };
        const offsets = scoopOffsets(state);

        expect(offsets[0]).toBeLessThan(offsets[1]);
        expect(offsets[1]).toBeLessThan(offsets[2]);
        expect(offsets[2]).toBeCloseTo(swayOffset(state));
    });

    it('measures a landing against the top scoop where it is right now', () => {
        const swaying = { ...withStack([0], 8), elapsedMs: SCOOP_STACK.swayPeriodMs / 4 };
        const sway = swayOffset(swaying);
        const state = land(swaying, sway);

        expect(state.wobble).toBeCloseTo(8);
    });
});

describe('dropping and sliding', () => {
    it('drops the sliding scoop, which lands on the stack', () => {
        const state = dropAt(newScoopStack(), 2);

        expect(state.stack).toHaveLength(1);
        expect(state.falling).toBeNull();
    });

    it('ignores a second drop while a scoop is still falling', () => {
        const first = dropScoop({ ...newScoopStack(), slideX: 3 });
        const second = dropScoop({ ...first, slideX: -20 });

        expect(second.falling?.x).toBe(3);
    });

    it('keeps the sliding scoop inside its range, turning around at each end', () => {
        let state = newScoopStack();
        for (let i = 0; i < 400; i++) {
            state = updateScoopStack(state, 16);
            expect(Math.abs(state.slideX)).toBeLessThanOrEqual(SCOOP_STACK.slideRange);
        }
    });

    it('cycles flavors: vanilla, dark choc, strawberry, mint chip, then vanilla again', () => {
        let state = newScoopStack();
        const flavors = [];
        for (let i = 0; i < 5; i++) {
            flavors.push(currentFlavor(state));
            state = land({ ...state, wobble: 0 }, state.stack.length > 0 ? state.stack[state.stack.length - 1].x : 0);
        }

        expect(flavors).toEqual(['vanilla', 'darkChoc', 'strawberry', 'mintChip', 'vanilla']);
    });
});

describe('winning and losing', () => {
    it('wins at five scoops', () => {
        const state = land(withStack([0, 0, 0, 0]), 0);

        expect(state.status).toBe('won');
        expect(state.stack).toHaveLength(SCOOP_STACK.goal);
    });

    it('loses when time runs out first', () => {
        const state = updateScoopStack({ ...withStack([0, 0]), elapsedMs: SCOOP_STACK.timeLimitMs - 5 }, 10);

        expect(state.status).toBe('lost');
        expect(state.lossReason).toBe('time');
    });

    it('stops changing once the run is over', () => {
        const lost = land(newScoopStack(), 50);

        expect(updateScoopStack(lost, 1000)).toEqual(lost);
        expect(dropScoop(lost)).toEqual(lost);
    });
});

describe('scoreFor', () => {
    it('gives 100 points per scoop, plus 10 per second left on a win', () => {
        const won = { ...land(withStack([0, 0, 0, 0]), 0), elapsedMs: 12_500 };

        expect(scoreFor(won)).toBe(500 + 17 * 10);
        expect(scoreFor(land(withStack([0, 0]), 40))).toBe(200);
    });
});
