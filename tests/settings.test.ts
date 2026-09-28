// Checks the player's settings (sound on or off), which live apart from the save.
import { describe, expect, it } from 'vitest';
import { SETTINGS_KEY, loadSettings, saveSettings } from '../src/state/settings.ts';
import { memoryStore } from './helpers/memoryStore.ts';

describe('loadSettings', () => {
    it('turns sound on and the d-pad off when nothing is stored', () => {
        expect(loadSettings(memoryStore())).toEqual({ version: 1, sound: true, dpad: false });
    });

    it('loads back what was saved', () => {
        const store = memoryStore();
        saveSettings({ version: 1, sound: false, dpad: true }, store);

        expect(loadSettings(store)).toEqual({ version: 1, sound: false, dpad: true });
    });

    it('uses the defaults when the stored text is broken', () => {
        const store = memoryStore();
        store.data.set(SETTINGS_KEY, '{oops');

        expect(loadSettings(store)).toEqual({ version: 1, sound: true, dpad: false });
    });

    it('turns sound on when the stored sound value is not true or false', () => {
        const store = memoryStore();
        store.data.set(SETTINGS_KEY, '{"version":1,"sound":"loud"}');

        expect(loadSettings(store).sound).toBe(true);
    });

    it('keeps older settings that have no d-pad value, with the d-pad off', () => {
        const store = memoryStore();
        store.data.set(SETTINGS_KEY, '{"version":1,"sound":false}');

        expect(loadSettings(store)).toEqual({ version: 1, sound: false, dpad: false });
    });

    it('works without localStorage', () => {
        expect(loadSettings(null)).toEqual({ version: 1, sound: true, dpad: false });
        expect(saveSettings({ version: 1, sound: false, dpad: false }, null)).toBe(false);
    });
});
