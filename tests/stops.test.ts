// Checks the list of the eight passport stops.
import { describe, expect, it } from 'vitest';
import { STOPS } from '../src/data/stops.ts';

describe('STOPS', () => {
    it('lists the eight stops from the plan, in plan order', () => {
        expect(STOPS.map((stop) => stop.id)).toEqual([
            'soco', 'gbeats', 'mahaiwe', 'baba', 'triplex', 'coop', 'townhall', 'riverwalk'
        ]);
    });

    it('gives every stop a name and a street', () => {
        for (const stop of STOPS) {
            expect(stop.name.length).toBeGreaterThan(0);
            expect(stop.street.length).toBeGreaterThan(0);
        }
    });

    it('has a minigame only for the three stops built in phases 3 to 5', () => {
        const playable = STOPS.filter((stop) => stop.minigame !== null).map((stop) => stop.id);

        expect(playable).toEqual(['soco', 'gbeats', 'mahaiwe']);
    });
});
