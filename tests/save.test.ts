// Checks saving, loading, and resetting the player's progress.
import { describe, expect, it } from 'vitest';
import { SAVE_KEY, hasSave, loadSave, newSave, resetSave, writeSave } from '../src/state/save.ts';
import { SETTINGS_KEY } from '../src/state/settings.ts';
import { memoryStore } from './helpers/memoryStore.ts';

describe('newSave', () => {
    it('starts with no stamps, no tips, at 2:00 PM, at the map start point', () => {
        expect(newSave()).toEqual({
            version: 1,
            stamps: {
                soco: false, gbeats: false, mahaiwe: false, baba: false,
                triplex: false, coop: false, townhall: false, riverwalk: false
            },
            bestScores: {},
            tips: 0,
            dayMinutes: 840,
            lastPosition: null
        });
    });
});

describe('writeSave and loadSave', () => {
    it('has no save in empty storage', () => {
        const store = memoryStore();

        expect(hasSave(store)).toBe(false);
        expect(loadSave(store)).toBeNull();
    });

    it('loads back exactly what was written', () => {
        const store = memoryStore();
        const save = newSave();
        save.stamps.soco = true;
        save.bestScores.soco = 5;
        save.tips = 12;
        save.dayMinutes = 900;
        save.lastPosition = { x: 48, y: 96 };

        expect(writeSave(save, store)).toBe(true);
        expect(loadSave(store)).toEqual(save);
        expect(hasSave(store)).toBe(true);
    });

    it('stores JSON under the msq-save key', () => {
        const store = memoryStore();
        writeSave(newSave(), store);

        expect(JSON.parse(store.data.get(SAVE_KEY) ?? '')).toMatchObject({ version: 1 });
    });

    it('treats text that is not JSON as no save', () => {
        const store = memoryStore();
        store.data.set(SAVE_KEY, '{not json');

        expect(loadSave(store)).toBeNull();
    });

    it('ignores a save from a newer version of the game', () => {
        const store = memoryStore();
        store.data.set(SAVE_KEY, JSON.stringify({ ...newSave(), version: 2 }));

        expect(loadSave(store)).toBeNull();
    });

    it('fills in missing stamps and drops stamps for unknown stops', () => {
        const store = memoryStore();
        store.data.set(SAVE_KEY, JSON.stringify({ version: 1, stamps: { soco: true, pizzaPlanet: true } }));

        const save = loadSave(store);

        expect(save?.stamps.soco).toBe(true);
        expect(save?.stamps.mahaiwe).toBe(false);
        expect(save?.stamps).not.toHaveProperty('pizzaPlanet');
    });

    it('replaces broken values with the new-game defaults', () => {
        const store = memoryStore();
        store.data.set(SAVE_KEY, JSON.stringify({
            version: 1, tips: 'lots', dayMinutes: null, lastPosition: 'here', bestScores: { soco: 'high' }
        }));

        const save = loadSave(store);

        expect(save).toEqual(newSave());
    });
});

describe('resetSave', () => {
    it('removes the save but keeps the settings', () => {
        const store = memoryStore();
        writeSave(newSave(), store);
        store.data.set(SETTINGS_KEY, '{"version":1,"sound":false}');

        resetSave(store);

        expect(hasSave(store)).toBe(false);
        expect(store.data.has(SETTINGS_KEY)).toBe(true);
    });
});

describe('when storage fails', () => {
    it('reports a failed write instead of crashing', () => {
        expect(writeSave(newSave(), memoryStore({ failWrites: true }))).toBe(false);
    });

    it('acts like an empty storage when there is no localStorage at all', () => {
        expect(hasSave(null)).toBe(false);
        expect(loadSave(null)).toBeNull();
        expect(writeSave(newSave(), null)).toBe(false);
        expect(() => resetSave(null)).not.toThrow();
    });
});
