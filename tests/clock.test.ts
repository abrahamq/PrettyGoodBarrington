// Checks the in-game clock: the HUD text, the time-of-day tint, and how real time advances it.
import { describe, expect, it } from 'vitest';
import { advanceClock, clockText, tintAt } from '../src/logic/clock.ts';

const at = (hours: number, minutes = 0, day = 0) => day * 1440 + hours * 60 + minutes;

describe('clockText', () => {
    it('starts the game on Saturday at 2:00 PM', () => {
        expect(clockText(840)).toBe('SAT  2:00PM');
    });

    it('always has 11 characters, so the clock box never changes size', () => {
        expect(clockText(at(0, 5))).toBe('SAT 12:05AM');
        expect(clockText(at(12, 30))).toBe('SAT 12:30PM');
        expect(clockText(at(9, 7))).toHaveLength(11);
    });

    it('moves to the next weekday after midnight', () => {
        expect(clockText(at(10, 0, 1))).toBe('SUN 10:00AM');
        expect(clockText(at(10, 0, 7))).toBe('SAT 10:00AM');
    });
});

describe('tintAt', () => {
    it('has no tint during the day', () => {
        expect(tintAt(at(14)).alpha).toBe(0);
    });

    it('is a warm orange at golden hour', () => {
        expect(tintAt(at(18))).toEqual({ color: 0xf2963c, alpha: 0.22 });
    });

    it('is a dark blue at night, before and after midnight', () => {
        expect(tintAt(at(21))).toEqual({ color: 0x1c1850, alpha: 0.5 });
        expect(tintAt(at(2))).toEqual({ color: 0x1c1850, alpha: 0.5 });
    });

    it('fades in over half an hour instead of jumping', () => {
        expect(tintAt(at(17, 15))).toEqual({ color: 0xf2963c, alpha: 0.11 });
        expect(tintAt(at(6, 15))).toEqual({ color: 0x1c1850, alpha: 0.25 });
        expect(tintAt(at(19, 45)).alpha).toBeCloseTo(0.36);
    });
});

describe('advanceClock', () => {
    it('adds one game minute for every two real seconds', () => {
        expect(advanceClock({ dayMinutes: 840, carryMs: 0 }, 2000)).toEqual({ dayMinutes: 841, carryMs: 0 });
    });

    it('carries leftover milliseconds to the next frame', () => {
        const first = advanceClock({ dayMinutes: 840, carryMs: 0 }, 1500);
        const second = advanceClock(first, 1500);

        expect(first).toEqual({ dayMinutes: 840, carryMs: 1500 });
        expect(second).toEqual({ dayMinutes: 841, carryMs: 1000 });
    });
});
