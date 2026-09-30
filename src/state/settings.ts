// The player's settings, stored in localStorage under "msq-settings": sound on or off, the on-screen d-pad,
// and the rhythm-game calibration offset. Settings live apart from the save, so "Reset save" keeps them.
import { browserStore, isRecord, readJson, writeJson, type KeyValueStore } from './storage.ts';

export const SETTINGS_KEY = 'msq-settings';
export const AUDIO_OFFSET_LIMIT_MS = 300;

export interface Settings {
    version: 1;
    sound: boolean;
    dpad: boolean;
    // How much later than scheduled the player hears the music (headphones, TV speakers). Curtain Call
    // judges taps this many milliseconds later. Set on the Calibrate screen.
    audioOffsetMs: number;
}

export function defaultSettings(): Settings {
    return { version: 1, sound: true, dpad: false, audioOffsetMs: 0 };
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
    if (typeof stored.audioOffsetMs === 'number' && Number.isFinite(stored.audioOffsetMs)) {
        settings.audioOffsetMs = clampOffset(stored.audioOffsetMs);
    }

    return settings;
}

export function saveSettings(settings: Settings, store: KeyValueStore | null = browserStore()): boolean {
    return writeJson(store, SETTINGS_KEY, settings);
}

export function clampOffset(offsetMs: number): number {
    return Math.max(-AUDIO_OFFSET_LIMIT_MS, Math.min(AUDIO_OFFSET_LIMIT_MS, Math.round(offsetMs)));
}
