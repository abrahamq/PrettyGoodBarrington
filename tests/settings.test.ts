// Checks the player's settings (sound on or off), which live apart from the save.
import { describe, expect, it } from 'vitest';
import { SETTINGS_KEY, loadSettings, saveSettings } from '../src/state/settings.ts';
import { memoryStore } from './helpers/memoryStore.ts';

describe('loadSettings', () => {
    it('turns sound on when nothing is stored', () => {
        expect(loadSettings(memoryStore())).toEqual({ version: 1, sound: true });
    });

    it('loads back what was saved', () => {
        const store = memoryStore();
        saveSettings({ version: 1, sound: false }, store);

        expect(loadSettings(store)).toEqual({ version: 1, sound: false });
    });

    it('uses the defaults when the stored text is broken', () => {
        const store = memoryStore();
        store.data.set(SETTINGS_KEY, '{oops');

        expect(loadSettings(store)).toEqual({ version: 1, sound: true });
    });

    it('turns sound on when the stored sound value is not true or false', () => {
        const store = memoryStore();
        store.data.set(SETTINGS_KEY, '{"version":1,"sound":"loud"}');

        expect(loadSettings(store).sound).toBe(true);
    });

    it('works without localStorage', () => {
        expect(loadSettings(null)).toEqual({ version: 1, sound: true });
        expect(saveSettings({ version: 1, sound: false }, null)).toBe(false);
    });
});
