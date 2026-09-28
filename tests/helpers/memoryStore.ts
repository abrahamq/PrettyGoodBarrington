// An in-memory stand-in for localStorage, for tests. With failWrites it acts like full or blocked storage.
import type { KeyValueStore } from '../../src/state/storage.ts';

export function memoryStore({ failWrites = false } = {}): KeyValueStore & { data: Map<string, string> } {
    const data = new Map<string, string>();

    return {
        data,
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => {
            if (failWrites) {
                throw new Error('QuotaExceededError');
            }
            data.set(key, value);
        },
        removeItem: (key) => {
            data.delete(key);
        }
    };
}
