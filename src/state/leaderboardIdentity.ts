// Remembers which leaderboard row belongs to this device: the chosen name and the secret token from the server.
// It has its own localStorage key, so RESET SAVE starts a new game but keeps the same leaderboard name.
import { browserStore, isRecord, readJson, removeKey, writeJson, type KeyValueStore } from './storage.ts';

export const IDENTITY_KEY = 'msq-leaderboard';

export interface LeaderboardIdentity {
    name: string;
    token: string;
}

export function loadIdentity(store: KeyValueStore | null = browserStore()): LeaderboardIdentity | null {
    const stored = readJson(store, IDENTITY_KEY);

    if (!isRecord(stored) || typeof stored.name !== 'string' || typeof stored.token !== 'string') {
        return null;
    }

    return { name: stored.name, token: stored.token };
}

export function saveIdentity(identity: LeaderboardIdentity, store: KeyValueStore | null = browserStore()): boolean {
    return writeJson(store, IDENTITY_KEY, identity);
}

export function forgetIdentity(store: KeyValueStore | null = browserStore()): void {
    removeKey(store, IDENTITY_KEY);
}
