// The Curtain Call song, generated in code (no recording, so no license questions): drums, bass, soft chords,
// and a lead melody. It uses the chart's tempo. Every chart note plays a lead note at the same moment, so what
// you tap is what you hear. The lead's pitch is a tone of the bar's chord, chosen by lane:
// left = root, down = third, up = fifth, right = octave.
// Bars 0-1 are a drum count-in; the chords go C, Am, F, G (a common I-vi-IV-V progression) from bar 2 on;
// the song ends on a held C chord with a cymbal crash.
import { beatToMs, type Chart } from '../logic/curtainCall.ts';

export type SoundKind = 'kick' | 'snare' | 'hat' | 'click' | 'crash' | 'bass' | 'chord' | 'lead';

export interface SoundEvent {
    timeMs: number;
    kind: SoundKind;
    frequencies: number[];
    durationMs: number;
}

type ChordName = 'C' | 'Am' | 'F' | 'G';

// Root, third, fifth, and octave of each chord, around middle C (Hz).
const CHORDS: Record<ChordName, number[]> = {
    C: [261.63, 329.63, 392.0, 523.25],
    Am: [220.0, 261.63, 329.63, 440.0],
    F: [174.61, 220.0, 261.63, 349.23],
    G: [196.0, 246.94, 293.66, 392.0]
};
const PROGRESSION: ChordName[] = ['C', 'Am', 'F', 'G'];
const INTRO_BARS = 2;
const BEATS_PER_BAR = 4;
const FINAL_CHORD_MS = 2000;

export function arrangeSong(chart: Chart): SoundEvent[] {
    const beatMs = 60_000 / chart.bpm;
    const lastBeat = chart.notes.length > 0 ? chart.notes[chart.notes.length - 1].beat : 0;
    const finalBar = Math.floor(lastBeat / BEATS_PER_BAR);
    const chordOf = (bar: number) => CHORDS[chordNameForBar(bar, finalBar)];
    const events: SoundEvent[] = [];
    const add = (timeMs: number, kind: SoundKind, frequencies: number[] = [], durationMs = 0) =>
        events.push({ timeMs, kind, frequencies, durationMs });

    for (let bar = 0; bar < finalBar; bar++) {
        for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
            const time = beatToMs(chart, bar * BEATS_PER_BAR + beat);
            const chord = chordOf(bar);

            add(time, 'hat');
            add(time + beatMs / 2, 'hat');

            if (bar >= 1) {
                add(time, beat % 2 === 0 ? 'kick' : 'snare');
            }
            if (bar === 1) {
                add(time, 'click');
            }
            if (bar >= INTRO_BARS && beat % 2 === 0) {
                add(time, 'bass', [chord[0] / 4], beatMs * 0.9);
            }
            if (bar >= INTRO_BARS && beat % 2 === 1) {
                add(time, 'chord', chord.slice(0, 3).map((f) => f / 2), beatMs * 0.4);
            }
        }
    }

    for (const note of chart.notes) {
        const bar = Math.floor(note.beat / BEATS_PER_BAR);
        add(beatToMs(chart, note.beat), 'lead', [chordOf(bar)[note.lane]], beatMs * 0.8);
    }

    const finale = beatToMs(chart, finalBar * BEATS_PER_BAR);
    add(finale, 'kick');
    add(finale, 'crash', [], FINAL_CHORD_MS);
    add(finale, 'chord', CHORDS.C.map((f) => f / 2), FINAL_CHORD_MS);
    add(finale, 'bass', [CHORDS.C[0] / 4], FINAL_CHORD_MS);

    return events.sort((a, b) => a.timeMs - b.timeMs);
}

function chordNameForBar(bar: number, finalBar: number): ChordName {
    if (bar < INTRO_BARS || bar >= finalBar) {
        return 'C';
    }
    return PROGRESSION[(bar - INTRO_BARS) % PROGRESSION.length];
}
