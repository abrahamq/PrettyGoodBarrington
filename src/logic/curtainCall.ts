// Curtain Call rules (the Mahaiwe rhythm game). No Phaser here: each function takes a state and a song time
// and returns a new state. Song time comes from the audio clock (src/audio/songClock.ts), never frame time.
//
// Notes in four lanes (0 left, 1 down, 2 up, 3 right) reach the hit line at their chart time. A tap in a lane
// judges the closest note there: Great within 50 ms, Good within 100 ms. A note more than 100 ms late is a Miss.
// Hits add score and combo and raise the applause; misses reset the combo and lower it.
// Two seconds after the last note, the show ends: 60% applause or more wins.

export type Lane = 0 | 1 | 2 | 3;
export type Judgment = 'great' | 'good' | 'miss';

export interface Windows {
    greatMs: number;
    goodMs: number;
}

export const CURTAIN_CALL = {
    windows: { greatMs: 50, goodMs: 100 } as Windows,
    points: { great: 100, good: 50 },
    applauseStart: 50,
    applause: { great: 4, good: 2, miss: -8 } as Record<Judgment, number>,
    winApplause: 60,
    endPaddingMs: 2000
};

export interface ChartNote {
    beat: number;
    lane: Lane;
}

export interface Chart {
    title: string;
    bpm: number;
    offsetMs: number;
    notes: ChartNote[];
}

export interface Note {
    timeMs: number;
    lane: Lane;
    judgment: Judgment | null;
}

export interface CallEvent {
    kind: 'judged';
    lane: Lane;
    judgment: Judgment;
}

export interface CurtainCallState {
    status: 'playing' | 'won' | 'lost';
    notes: Note[];
    score: number;
    combo: number;
    maxCombo: number;
    applause: number;
    counts: Record<Judgment, number>;
    endMs: number;
    // What happened during the last call, so the scene can show GREAT!, GOOD, or MISS.
    events: CallEvent[];
}

// Checks chart data (for example, from a JSON file) and returns it as a Chart. Throws on anything malformed.
export function parseChart(data: unknown): Chart {
    const chart = data as Partial<Chart> | null;

    if (!chart || typeof chart.title !== 'string' || typeof chart.bpm !== 'number' || chart.bpm <= 0
        || typeof chart.offsetMs !== 'number' || !Array.isArray(chart.notes)) {
        throw new Error('A chart needs a title, a positive bpm, an offsetMs, and a notes list.');
    }

    const notes = chart.notes.map((note, i) => {
        if (typeof note?.beat !== 'number' || note.beat < 0) {
            throw new Error(`Chart note ${i} has a bad beat.`);
        }
        if (![0, 1, 2, 3].includes(note.lane)) {
            throw new Error(`Chart note ${i} has a bad lane (use 0-3).`);
        }
        return { beat: note.beat, lane: note.lane };
    });

    return { title: chart.title, bpm: chart.bpm, offsetMs: chart.offsetMs, notes };
}

export function beatToMs(chart: Chart, beat: number): number {
    return chart.offsetMs + (beat * 60_000) / chart.bpm;
}

export function newCurtainCall(chart: Chart): CurtainCallState {
    const notes: Note[] = chart.notes.map((note) => ({ timeMs: beatToMs(chart, note.beat), lane: note.lane, judgment: null }));
    const lastNoteMs = notes.length > 0 ? notes[notes.length - 1].timeMs : 0;

    return {
        status: 'playing',
        notes,
        score: 0,
        combo: 0,
        maxCombo: 0,
        applause: CURTAIN_CALL.applauseStart,
        counts: { great: 0, good: 0, miss: 0 },
        endMs: lastNoteMs + CURTAIN_CALL.endPaddingMs,
        events: []
    };
}

// Great, good, or null (too far from the note to count as a hit at all).
export function judge(deltaMs: number, windows: Windows = CURTAIN_CALL.windows): Judgment | null {
    const distance = Math.abs(deltaMs);

    if (distance <= windows.greatMs) {
        return 'great';
    }
    return distance <= windows.goodMs ? 'good' : null;
}

export function hitLane(state: CurtainCallState, lane: Lane, songTimeMs: number, windows: Windows = CURTAIN_CALL.windows): CurtainCallState {
    if (state.status !== 'playing') {
        return state;
    }

    let closest = -1;
    state.notes.forEach((note, i) => {
        const inReach = note.lane === lane && note.judgment === null && Math.abs(songTimeMs - note.timeMs) <= windows.goodMs;
        if (inReach && (closest === -1 || Math.abs(songTimeMs - note.timeMs) < Math.abs(songTimeMs - state.notes[closest].timeMs))) {
            closest = i;
        }
    });

    if (closest === -1) {
        return state;
    }

    const judgment = judge(songTimeMs - state.notes[closest].timeMs, windows) as Exclude<Judgment, 'miss'>;
    return record({ ...state, events: [] }, closest, judgment);
}

export function advanceCurtainCall(state: CurtainCallState, songTimeMs: number, windows: Windows = CURTAIN_CALL.windows): CurtainCallState {
    if (state.status !== 'playing') {
        return state;
    }

    let next: CurtainCallState = { ...state, events: [] };
    state.notes.forEach((note, i) => {
        if (note.judgment === null && songTimeMs - note.timeMs > windows.goodMs) {
            next = record(next, i, 'miss');
        }
    });

    if (songTimeMs >= next.endMs) {
        next = { ...next, status: next.applause >= CURTAIN_CALL.winApplause ? 'won' : 'lost' };
    }

    return next;
}

export function applauseAfter(applause: number, judgment: Judgment): number {
    return Math.max(0, Math.min(100, applause + CURTAIN_CALL.applause[judgment]));
}

function record(state: CurtainCallState, index: number, judgment: Judgment): CurtainCallState {
    const note = state.notes[index];
    const combo = judgment === 'miss' ? 0 : state.combo + 1;

    return {
        ...state,
        notes: state.notes.map((n, i) => (i === index ? { ...n, judgment } : n)),
        score: state.score + (judgment === 'miss' ? 0 : CURTAIN_CALL.points[judgment]),
        combo,
        maxCombo: Math.max(state.maxCombo, combo),
        applause: applauseAfter(state.applause, judgment),
        counts: { ...state.counts, [judgment]: state.counts[judgment] + 1 },
        events: [...state.events, { kind: 'judged', lane: note.lane, judgment }]
    };
}
