// Checks the generated Curtain Call song: every chart note has a melody note at the same moment,
// the drums count the player in before the first note, and the included chart is valid and about a minute long.
import { describe, expect, it } from 'vitest';
import openingNight from '../src/data/charts/openingNight.json';
import { arrangeSong } from '../src/audio/openingNight.ts';
import { beatToMs, parseChart, type Chart } from '../src/logic/curtainCall.ts';

const chart: Chart = parseChart(openingNight);
const events = arrangeSong(chart);

describe('arrangeSong', () => {
    it('plays a lead note at the exact time of every chart note', () => {
        const leadTimes = new Set(events.filter((e) => e.kind === 'lead').map((e) => e.timeMs));

        for (const note of chart.notes) {
            expect(leadTimes.has(beatToMs(chart, note.beat))).toBe(true);
        }
    });

    it('counts in with drums before the first note', () => {
        const firstNote = beatToMs(chart, chart.notes[0].beat);
        const drumsBefore = events.filter((e) => ['kick', 'snare', 'click'].includes(e.kind) && e.timeMs < firstNote);

        expect(drumsBefore.length).toBeGreaterThanOrEqual(4);
    });

    it('lists events in time order', () => {
        const times = events.map((e) => e.timeMs);
        expect(times).toEqual([...times].sort((a, b) => a - b));
    });
});

describe('the Opening Night chart', () => {
    it('lasts about a minute', () => {
        const lastNote = beatToMs(chart, chart.notes[chart.notes.length - 1].beat);

        expect(lastNote).toBeGreaterThan(50_000);
        expect(lastNote).toBeLessThan(70_000);
    });

    it('is easy: no two notes closer than half a beat, and no chords', () => {
        for (let i = 1; i < chart.notes.length; i++) {
            expect(chart.notes[i].beat - chart.notes[i - 1].beat).toBeGreaterThanOrEqual(0.5);
        }
    });
});
