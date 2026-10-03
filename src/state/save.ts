// Loads, writes, and resets the player's progress in localStorage (key "msq-save").
// Each save has a version number, so a later phase can upgrade old saves instead of losing them.
import { DEFAULT_CHARACTER, isCharacterId, type CharacterId } from '../data/characters.ts';
import { SIDE_GAME_IDS, type SideGameId } from '../data/sideGames.ts';
import { STOPS, type StopId } from '../data/stops.ts';
import { browserStore, isRecord, readJson, removeKey, writeJson, type KeyValueStore } from './storage.ts';

export const SAVE_KEY = 'msq-save';
export const SAVE_VERSION = 1;
export const START_DAY_MINUTES = 14 * 60;

export interface Position {
    x: number;
    y: number;
}

export interface SaveData {
    version: typeof SAVE_VERSION;
    character: CharacterId;
    stamps: Record<StopId, boolean>;
    bestScores: Partial<Record<StopId, number>>;
    // Best scores in the side games, which earn no stamps (src/data/sideGames.ts).
    sideBests: Partial<Record<SideGameId, number>>;
    // Total tips earned in Order Up!, in cents.
    tips: number;
    dayMinutes: number;
    // null means "start at the map's start point".
    lastPosition: Position | null;
}

export function newSave(character: CharacterId = DEFAULT_CHARACTER): SaveData {
    return {
        version: SAVE_VERSION,
        character,
        stamps: emptyStamps(),
        bestScores: {},
        sideBests: {},
        tips: 0,
        dayMinutes: START_DAY_MINUTES,
        lastPosition: null
    };
}

export function loadSave(store: KeyValueStore | null = browserStore()): SaveData | null {
    const stored = readJson(store, SAVE_KEY);

    if (!isRecord(stored) || stored.version !== SAVE_VERSION) {
        return null;
    }

    return readVersion1(stored);
}

export function hasSave(store: KeyValueStore | null = browserStore()): boolean {
    return loadSave(store) !== null;
}

export function writeSave(save: SaveData, store: KeyValueStore | null = browserStore()): boolean {
    return writeJson(store, SAVE_KEY, save);
}

export function resetSave(store: KeyValueStore | null = browserStore()): void {
    removeKey(store, SAVE_KEY);
}

function emptyStamps(): Record<StopId, boolean> {
    const stamps = {} as Record<StopId, boolean>;

    for (const stop of STOPS) {
        stamps[stop.id] = false;
    }

    return stamps;
}

// Builds a clean save from stored data. Any missing or broken value gets its new-game default.
function readVersion1(stored: Record<string, unknown>): SaveData {
    const save = newSave(isCharacterId(stored.character) ? stored.character : DEFAULT_CHARACTER);
    const stamps = isRecord(stored.stamps) ? stored.stamps : {};
    const bestScores = isRecord(stored.bestScores) ? stored.bestScores : {};

    for (const stop of STOPS) {
        save.stamps[stop.id] = stamps[stop.id] === true;

        const score = bestScores[stop.id];
        if (typeof score === 'number') {
            save.bestScores[stop.id] = score;
        }
    }

    const sideBests = isRecord(stored.sideBests) ? stored.sideBests : {};
    for (const id of SIDE_GAME_IDS) {
        const score = sideBests[id];
        if (typeof score === 'number') {
            save.sideBests[id] = score;
        }
    }

    if (typeof stored.tips === 'number') {
        save.tips = stored.tips;
    }

    if (typeof stored.dayMinutes === 'number') {
        save.dayMinutes = stored.dayMinutes;
    }

    if (isPosition(stored.lastPosition)) {
        save.lastPosition = { x: stored.lastPosition.x, y: stored.lastPosition.y };
    }

    return save;
}

function isPosition(value: unknown): value is Position {
    return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
}
