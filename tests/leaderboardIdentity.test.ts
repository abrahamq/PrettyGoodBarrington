// Checks how the device's leaderboard name and token are kept in localStorage, apart from the save.
import { describe, expect, it } from 'vitest';
import { IDENTITY_KEY, forgetIdentity, loadIdentity, saveIdentity } from '../src/state/leaderboardIdentity.ts';
import { SAVE_KEY, resetSave } from '../src/state/save.ts';
import { memoryStore } from './helpers/memoryStore.ts';

describe('leaderboard identity', () => {
    it('is empty until the player joins', () => {
        expect(loadIdentity(memoryStore())).toBeNull();
    });

    it('loads back the saved name and token', () => {
        const store = memoryStore();
        saveIdentity({ name: 'ABE', token: 'secret' }, store);

        expect(loadIdentity(store)).toEqual({ name: 'ABE', token: 'secret' });
    });

    it('ignores broken or incomplete data', () => {
        const store = memoryStore();

        store.data.set(IDENTITY_KEY, '{oops');
        expect(loadIdentity(store)).toBeNull();

        store.data.set(IDENTITY_KEY, '{"name":"ABE"}');
        expect(loadIdentity(store)).toBeNull();
    });

    it('survives Reset Save, and can be forgotten on its own', () => {
        const store = memoryStore();
        saveIdentity({ name: 'ABE', token: 'secret' }, store);
        store.data.set(SAVE_KEY, '{"version":1}');

        resetSave(store);
        expect(loadIdentity(store)).not.toBeNull();

        forgetIdentity(store);
        expect(loadIdentity(store)).toBeNull();
    });
});
