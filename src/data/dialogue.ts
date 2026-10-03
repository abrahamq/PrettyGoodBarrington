// Every NPC and sign line in the game, keyed by id.
// Business names never appear here: write {stopId} (for example {soco}) and fillNames() swaps in
// the name from src/data/stops.ts, so renaming a business there renames it everywhere.
// Each string in a list starts a new page of the dialogue box.
import type { SideGameId } from './sideGames.ts';
import { STOPS, type StopId } from './stops.ts';

export interface Line {
    speaker: string;
    text: string[];
}

export interface PlayableScript {
    kind: 'playable';
    speaker: string;
    intro: string[];
    again: string[];
    accept: string;
    decline: string;
    win: string[];
    lose: string[];
}

export interface StubScript {
    kind: 'stub';
    speaker: string;
    text: string[];
}

export type StopScript = PlayableScript | StubScript;

export const STOP_SCRIPTS: Record<StopId, StopScript> = {
    soco: {
        kind: 'playable',
        speaker: 'SCOOPER',
        intro: ["Hey, new face on Railroad Street! Stack five scoops on one cone without a spill and I'll stamp your passport."],
        again: ["Back for seconds? Your stamp is safe. Want to stack again?"],
        accept: "LET'S SCOOP",
        decline: 'MAYBE LATER',
        win: ["Five scoops, zero spills! Here's your stamp."],
        lose: ['Oof, sticky situation. Come back and try again!']
    },
    gbeats: {
        kind: 'playable',
        speaker: 'GRILL COOK',
        intro: ["Lunch rush and I'm down a cook! Grill burgers the way folks order them and the stamp is yours."],
        again: ['Want another shift on the grill?'],
        accept: 'FIRE IT UP',
        decline: 'NOT NOW',
        win: ['Every order just right! You earned this stamp.'],
        lose: ['The customers are still hungry. Come back soon!']
    },
    mahaiwe: {
        kind: 'playable',
        speaker: 'USHER',
        intro: ['The show starts in five and our drummer is stuck in traffic! Keep the beat and win over the crowd.'],
        again: ['Up for an encore?'],
        accept: 'BREAK A LEG',
        decline: 'NOT TONIGHT',
        win: ["Standing ovation! Here's your stamp."],
        lose: ['The crowd wanted more. Come back for an encore!']
    },
    baba: { kind: 'stub', speaker: 'PIZZA MAKER', text: ['Our dough toss contest is still rising. Come back soon!'] },
    triplex: { kind: 'stub', speaker: 'PROJECTIONIST', text: ["Popcorn Panic isn't showing yet. Check back soon!"] },
    coop: { kind: 'stub', speaker: 'GROCER', text: ["We're still stocking this aisle. Come back soon!"] },
    townhall: { kind: 'stub', speaker: 'CLERK', text: ["The town hasn't voted on this game yet. Check back soon!"] },
    riverwalk: { kind: 'stub', speaker: 'RANGER', text: ['The trail crew is still building this stop. Come back soon!'] }
};

// A side game's lines. After a round, one ending is said: `lost` when the time ran out, `great` for a finished
// round that scored at least the game's `greatScore` (src/data/sideGames.ts), and `finished` for any other.
// {score} is replaced with the round's score.
export interface SideGameScript {
    speaker: string;
    intro: string[];
    again: string[];
    accept: string;
    decline: string;
    endings: Record<'lost' | 'finished' | 'great', string>;
}

export const SIDE_GAME_SCRIPTS: Record<SideGameId, SideGameScript> = {
    hedgeTrim: {
        speaker: 'JACK',
        intro: ['Help me trim these bushes?'],
        again: ['Help me trim these bushes?'],
        accept: "LET'S TRIM",
        decline: 'NOT NOW',
        endings: {
            lost: 'Could be better... you only scored {score}.',
            finished: 'Those look okay, you got {score} points.',
            great: 'Not bad, you scored {score}.'
        }
    }
};

export const LINES: Record<string, Line> = {
    local: { speaker: 'LOCAL', text: ['I walk up Railroad Street every day. The ice cream is worth the trip.'] },
    dog: { speaker: 'DOG', text: ['Woof! It looks like it wants you to collect all eight stamps.'] },
    'sign-railroad': { speaker: 'SIGN', text: ['RAILROAD ST. Shops, a cinema, and ice cream to the north.'] },
    'sign-river': { speaker: 'SIGN', text: ['{riverwalk}. Please stay on the path.'] },
    'sign-bridge': { speaker: 'SIGN', text: ['BRIDGE ST. The {coop} is down by the river.'] },
    'gb-hedge': { speaker: 'HEDGE', text: ['The town hedge, shaped like a G and a B. Jack keeps it trimmed.'] }
};

export function fillNames(text: string): string {
    return text.replace(/\{(\w+)\}/g, (token, id: string) => STOPS.find((stop) => stop.id === id)?.name ?? token);
}
