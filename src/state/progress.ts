// Applies a finished minigame to the save: a win stamps the passport, and the best score only goes up.
// Minigames hand their result back to the Overworld as { stopId, passed, score }.
import { STOPS, type StopId } from '../data/stops.ts';
import type { SaveData } from './save.ts';
import { isRecord } from './storage.ts';

export interface MinigameResult {
    stopId: StopId;
    passed: boolean;
    score: number;
}

export function applyResult(save: SaveData, result: MinigameResult): SaveData {
    const best = save.bestScores[result.stopId];

    return {
        ...save,
        stamps: { ...save.stamps, [result.stopId]: save.stamps[result.stopId] || result.passed },
        bestScores: {
            ...save.bestScores,
            [result.stopId]: best === undefined ? result.score : Math.max(best, result.score)
        }
    };
}

export function stampCount(save: SaveData): number {
    return Object.values(save.stamps).filter(Boolean).length;
}

export function isStopId(value: unknown): value is StopId {
    return STOPS.some((stop) => stop.id === value);
}

export function isMinigameResult(value: unknown): value is MinigameResult {
    return isRecord(value)
        && isStopId(value.stopId)
        && typeof value.passed === 'boolean'
        && typeof value.score === 'number';
}
