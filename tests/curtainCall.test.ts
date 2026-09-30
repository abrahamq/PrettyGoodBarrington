// Checks the Curtain Call rules: chart timing, judgment windows, combo, applause, and the end of the song.
import { describe, expect, it } from 'vitest';
import {
    CURTAIN_CALL, advanceCurtainCall, applauseAfter, beatToMs, hitLane, judge, newCurtainCall, parseChart, type Chart
} from '../src/logic/curtainCall.ts';

// 120 BPM: one beat every 500 ms. Notes at 1000, 1500, and 2000 ms.
const chart: Chart = {
    title: 'Test',
    bpm: 120,
    offsetMs: 0,
    notes: [{ beat: 2, lane: 0 }, { beat: 3, lane: 1 }, { beat: 4, lane: 0 }]
};

describe('parseChart and beatToMs', () => {
    it('turns beats into milliseconds using the BPM and offset', () => {
        expect(beatToMs(chart, 4)).toBe(2000);
        expect(beatToMs({ ...chart, offsetMs: 30 }, 4)).toBe(2030);
    });

    it('accepts a well-formed chart and rejects a bad lane', () => {
        expect(parseChart(chart)).toEqual(chart);
        expect(() => parseChart({ ...chart, notes: [{ beat: 1, lane: 4 }] })).toThrow('lane');
    });
});

describe('judge', () => {
    it('is great within 50 ms, good within 100 ms, and not a hit beyond that', () => {
        expect(judge(0)).toBe('great');
        expect(judge(-50)).toBe('great');
        expect(judge(51)).toBe('good');
        expect(judge(-100)).toBe('good');
        expect(judge(101)).toBeNull();
    });

    it('uses other windows when given', () => {
        expect(judge(60, { greatMs: 70, goodMs: 140 })).toBe('great');
    });
});

describe('hitLane', () => {
    it('judges the note in that lane closest to the tap', () => {
        const state = hitLane(newCurtainCall(chart), 0, 1030);

        expect(state.notes[0].judgment).toBe('great');
        expect(state.score).toBe(CURTAIN_CALL.points.great);
        expect(state.combo).toBe(1);
    });

    it('ignores a tap with no note in reach, and a tap in the wrong lane', () => {
        const start = newCurtainCall(chart);

        expect(hitLane(start, 0, 700)).toEqual(start);
        expect(hitLane(start, 2, 1000)).toEqual(start);
    });

    it('cannot hit the same note twice', () => {
        const once = hitLane(newCurtainCall(chart), 1, 1480);
        const twice = hitLane(once, 1, 1500);

        expect(twice.combo).toBe(1);
        expect(twice.counts.good + twice.counts.great).toBe(1);
    });
});

describe('advanceCurtainCall', () => {
    it('counts a note as missed once it is more than 100 ms late, and resets the combo', () => {
        const hit = hitLane(newCurtainCall(chart), 0, 1000);
        const state = advanceCurtainCall(hit, 1601);

        expect(state.notes[1].judgment).toBe('miss');
        expect(state.combo).toBe(0);
        expect(state.maxCombo).toBe(1);
        expect(state.events).toContainEqual({ kind: 'judged', lane: 1, judgment: 'miss' });
    });

    it('ends two seconds after the last note, won at 60% applause or more', () => {
        const end = beatToMs(chart, 4) + CURTAIN_CALL.endPaddingMs;
        const allHit = newCurtainCall(chart).notes.map((note) => ({ ...note, judgment: 'great' as const }));
        const cheered = { ...newCurtainCall(chart), notes: allHit, applause: 60 };
        const quiet = { ...newCurtainCall(chart), notes: allHit, applause: 59 };

        expect(advanceCurtainCall(cheered, end - 1).status).toBe('playing');
        expect(advanceCurtainCall(cheered, end).status).toBe('won');
        expect(advanceCurtainCall(quiet, end).status).toBe('lost');
    });
});

describe('applauseAfter', () => {
    it('rises on hits and falls on misses', () => {
        expect(applauseAfter(50, 'great')).toBe(50 + CURTAIN_CALL.applause.great);
        expect(applauseAfter(50, 'good')).toBe(50 + CURTAIN_CALL.applause.good);
        expect(applauseAfter(50, 'miss')).toBe(50 + CURTAIN_CALL.applause.miss);
    });

    it('stays between 0 and 100', () => {
        expect(applauseAfter(99, 'great')).toBe(100);
        expect(applauseAfter(3, 'miss')).toBe(0);
    });
});
