// Checks the dialogue data: every stop has a script of the right kind, and business names
// only come from src/data/stops.ts (dialogue uses {stopId} tokens instead of writing names out).
import { describe, expect, it } from 'vitest';
import { LINES, SIDE_GAME_SCRIPTS, STOP_SCRIPTS, fillNames } from '../src/data/dialogue.ts';
import { STOPS } from '../src/data/stops.ts';

describe('STOP_SCRIPTS', () => {
    it('has a playable script for stops with a minigame and a "coming soon" script for the rest', () => {
        for (const stop of STOPS) {
            expect(STOP_SCRIPTS[stop.id].kind, stop.id).toBe(stop.minigame ? 'playable' : 'stub');
        }
    });

    it('keeps choice labels short enough for the choice box', () => {
        for (const script of [...Object.values(STOP_SCRIPTS), ...Object.values(SIDE_GAME_SCRIPTS)]) {
            if (script.kind === 'playable') {
                expect(script.accept.length).toBeLessThanOrEqual(11);
                expect(script.decline.length).toBeLessThanOrEqual(11);
            }
        }
    });
});

describe('business names', () => {
    it('never writes a business name straight into dialogue', () => {
        const allText = JSON.stringify({ STOP_SCRIPTS, SIDE_GAME_SCRIPTS, LINES });

        for (const stop of STOPS) {
            expect(allText, stop.name).not.toContain(stop.name);
        }
    });

    it('fills {stopId} tokens with the name from stops.ts', () => {
        expect(fillNames('Welcome to {soco}!')).toBe('Welcome to SoCo Creamery!');
    });

    it('leaves unknown tokens alone', () => {
        expect(fillNames('{nope}')).toBe('{nope}');
    });
});
