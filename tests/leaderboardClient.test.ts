// Checks the game's side of the leaderboard: name rules, where the API lives, and how the client
// talks to it (with a fake fetch, so no server is needed) and reports failures.
import { describe, expect, it } from 'vitest';
import {
    LeaderboardClient, leaderboardBaseUrl, nameProblem, tidyName, type FetchLike
} from '../src/net/leaderboardClient.ts';

function fakeFetch(status: number, body: unknown): FetchLike & { calls: { url: string; init?: RequestInit }[] } {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchFn = async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    };
    return Object.assign(fetchFn, { calls });
}

describe('names', () => {
    it('tidies a name the way the server does', () => {
        expect(tidyName('  abe   q ')).toBe('ABE Q');
    });

    it('explains what is wrong with a name, or returns null when it is fine', () => {
        expect(nameProblem('AB')).toBe('too_short');
        expect(nameProblem('ABCDEFGHIJK')).toBe('too_long');
        expect(nameProblem('ABE!')).toBe('bad_characters');
        expect(nameProblem('ABE Q')).toBeNull();
    });
});

describe('leaderboardBaseUrl', () => {
    it('uses the configured address when there is one', () => {
        expect(leaderboardBaseUrl({ protocol: 'https:', hostname: 'game.example' }, 'https://api.example/')).toBe('https://api.example');
    });

    it('otherwise uses port 3000 on the same host as the game, so phones on Wi-Fi work', () => {
        expect(leaderboardBaseUrl({ protocol: 'http:', hostname: '192.168.18.44' }, undefined)).toBe('http://192.168.18.44:3000');
    });
});

describe('LeaderboardClient', () => {
    const board = { players: [{ rank: 1, name: 'ABE', stamps: 3, tipsCents: 1250 }], you: null };

    it('loads the board, sending the token when there is one', async () => {
        const fetchFn = fakeFetch(200, board);
        const result = await new LeaderboardClient('http://api', fetchFn).board('secret');

        expect(result).toEqual({ ok: true, value: board });
        expect(fetchFn.calls[0].url).toBe('http://api/leaderboard');
        expect(new Headers(fetchFn.calls[0].init?.headers).get('Authorization')).toBe('Bearer secret');
    });

    it('joins with a name and progress, and returns the new token', async () => {
        const fetchFn = fakeFetch(201, { token: 'new-token', you: board.players[0] });
        const result = await new LeaderboardClient('http://api', fetchFn).join('ABE', { stamps: 3, tipsCents: 1250 });

        expect(result).toEqual({ ok: true, value: { token: 'new-token', you: board.players[0] } });
        expect(fetchFn.calls[0].init?.method).toBe('POST');
        expect(JSON.parse(String(fetchFn.calls[0].init?.body))).toEqual({ name: 'ABE', stamps: 3, tipsCents: 1250 });
    });

    it('submits progress with the token', async () => {
        const fetchFn = fakeFetch(200, { you: board.players[0] });
        await new LeaderboardClient('http://api', fetchFn).submit('secret', { stamps: 3, tipsCents: 1250 });

        expect(fetchFn.calls[0].url).toBe('http://api/players/me');
        expect(fetchFn.calls[0].init?.method).toBe('PATCH');
    });

    it('passes on the server error codes', async () => {
        const result = await new LeaderboardClient('http://api', fakeFetch(422, { error: 'name_taken' })).join('ABE', { stamps: 0, tipsCents: 0 });

        expect(result).toEqual({ ok: false, error: 'name_taken' });
    });

    it('names the other failures: unknown player, too many tries, and server trouble', async () => {
        const submit = (status: number) =>
            new LeaderboardClient('http://api', fakeFetch(status, {})).submit('secret', { stamps: 0, tipsCents: 0 });

        expect(await submit(401)).toEqual({ ok: false, error: 'unknown_player' });
        expect(await submit(429)).toEqual({ ok: false, error: 'busy' });
        expect(await submit(500)).toEqual({ ok: false, error: 'server' });
    });

    it('reports offline when the request fails or takes too long', async () => {
        const failing: FetchLike = async () => {
            throw new TypeError('Failed to fetch');
        };
        const hanging: FetchLike = (_url, init) =>
            new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));

        expect(await new LeaderboardClient('http://api', failing).board(null)).toEqual({ ok: false, error: 'offline' });
        expect(await new LeaderboardClient('http://api', hanging, 20).board(null)).toEqual({ ok: false, error: 'offline' });
    });
});
