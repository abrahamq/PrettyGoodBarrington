// The player's settings (sound on or off, on-screen d-pad on or off), stored in localStorage under "msq-settings".
// Settings live apart from the save, so "Reset save" does not reset them.
import { browserStore, isRecord, readJson, writeJson, type KeyValueStore } from './storage.ts';

export const SETTINGS_KEY = 'msq-settings';

export interface Settings {
    version: 1;
    sound: boolean;
    dpad: boolean;
}

export function defaultSettings(): Settings {
    return { version: 1, sound: true, dpad: false };
}

export function loadSettings(store: KeyValueStore | null = browserStore()): Settings {
    const stored = readJson(store, SETTINGS_KEY);
    const settings = defaultSettings();

    if (!isRecord(stored)) {
        return settings;
    }

    if (typeof stored.sound === 'boolean') {
        settings.sound = stored.sound;
    }
    if (typeof stored.dpad === 'boolean') {
        settings.dpad = stored.dpad;
    }

    return settings;
}

export function saveSettings(settings: Settings, store: KeyValueStore | null = browserStore()): boolean {
    return writeJson(store, SETTINGS_KEY, settings);
}
