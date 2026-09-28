// Safe wrappers around localStorage. Some browsers throw when storage is full, blocked,
// or in private mode, so every call here catches errors instead of crashing the game.

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function browserStore(): KeyValueStore | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

export function readJson(store: KeyValueStore | null, key: string): unknown {
    try {
        const text = store?.getItem(key) ?? null;
        return text === null ? null : JSON.parse(text);
    } catch {
        return null;
    }
}

export function writeJson(store: KeyValueStore | null, key: string, value: unknown): boolean {
    if (!store) {
        return false;
    }

    try {
        store.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

export function removeKey(store: KeyValueStore | null, key: string): void {
    try {
        store?.removeItem(key);
    } catch {
        // Nothing to do: if storage is blocked, there is nothing stored to remove.
    }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
