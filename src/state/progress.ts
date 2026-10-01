// Applies a finished minigame to the save: a win stamps the passport, and the best score only goes up.
// A score of 0 (for example, from quitting) is not recorded, so the passport shows no score instead of 0.
// Minigames hand their result back to the Overworld as { stopId, passed, score }, plus `tips` (in cents)
// from Order Up!, which add to the saved total whether the round was won or not.
import { STOPS, type StopId } from '../data/stops.ts';
import type { Progress } from '../net/leaderboardClient.ts';
import type { SaveData } from './save.ts';
import { isRecord } from './storage.ts';

export interface MinigameResult {
    stopId: StopId;
    passed: boolean;
    score: number;
    tips?: number;
}

export function applyResult(save: SaveData, result: MinigameResult): SaveData {
    const best = save.bestScores[result.stopId] ?? 0;
    const bestScores = result.score > best ? { ...save.bestScores, [result.stopId]: result.score } : save.bestScores;

    return {
        ...save,
        stamps: { ...save.stamps, [result.stopId]: save.stamps[result.stopId] || result.passed },
        bestScores,
        tips: save.tips + (result.tips ?? 0)
    };
}

export function stampCount(save: SaveData): number {
    return Object.values(save.stamps).filter(Boolean).length;
}

export function leaderboardProgress(save: SaveData): Progress {
    return { stamps: stampCount(save), tipsCents: save.tips };
}

export function isStopId(value: unknown): value is StopId {
    return STOPS.some((stop) => stop.id === value);
}

export function isMinigameResult(value: unknown): value is MinigameResult {
    return isRecord(value)
        && isStopId(value.stopId)
        && typeof value.passed === 'boolean'
        && typeof value.score === 'number'
        && (value.tips === undefined || typeof value.tips === 'number');
}
