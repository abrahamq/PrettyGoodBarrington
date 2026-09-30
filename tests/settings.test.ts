// Checks the player's settings (sound on or off), which live apart from the save.
import { describe, expect, it } from 'vitest';
import { SETTINGS_KEY, defaultSettings, loadSettings, saveSettings } from '../src/state/settings.ts';
import { memoryStore } from './helpers/memoryStore.ts';

describe('loadSettings', () => {
    it('turns sound on and the d-pad off when nothing is stored', () => {
        expect(loadSettings(memoryStore())).toEqual({ version: 1, sound: true, dpad: false, audioOffsetMs: 0 });
    });

    it('loads back what was saved', () => {
        const store = memoryStore();
        saveSettings({ version: 1, sound: false, dpad: true, audioOffsetMs: 0 }, store);

        expect(loadSettings(store)).toEqual({ version: 1, sound: false, dpad: true, audioOffsetMs: 0 });
    });

    it('uses the defaults when the stored text is broken', () => {
        const store = memoryStore();
        store.data.set(SETTINGS_KEY, '{oops');

        expect(loadSettings(store)).toEqual({ version: 1, sound: true, dpad: false, audioOffsetMs: 0 });
    });

    it('turns sound on when the stored sound value is not true or false', () => {
        const store = memoryStore();
        store.data.set(SETTINGS_KEY, '{"version":1,"sound":"loud"}');

        expect(loadSettings(store).sound).toBe(true);
    });

    it('keeps older settings that have no d-pad value, with the d-pad off', () => {
        const store = memoryStore();
        store.data.set(SETTINGS_KEY, '{"version":1,"sound":false}');

        expect(loadSettings(store)).toEqual({ version: 1, sound: false, dpad: false, audioOffsetMs: 0 });
    });

    it('keeps the rhythm calibration offset, between -300 and +300 ms', () => {
        const store = memoryStore();

        saveSettings({ ...defaultSettings(), audioOffsetMs: 40 }, store);
        expect(loadSettings(store).audioOffsetMs).toBe(40);

        store.data.set(SETTINGS_KEY, '{"version":1,"audioOffsetMs":999}');
        expect(loadSettings(store).audioOffsetMs).toBe(300);

        store.data.set(SETTINGS_KEY, '{"version":1,"audioOffsetMs":"soon"}');
        expect(loadSettings(store).audioOffsetMs).toBe(0);
    });

    it('works without localStorage', () => {
        expect(loadSettings(null)).toEqual({ version: 1, sound: true, dpad: false, audioOffsetMs: 0 });
        expect(saveSettings({ version: 1, sound: false, dpad: false, audioOffsetMs: 0 }, null)).toBe(false);
    });
});
