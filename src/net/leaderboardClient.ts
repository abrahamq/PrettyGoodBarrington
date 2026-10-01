// Talks to the Rails leaderboard API in server/. Every call resolves to { ok: true, value } or
// { ok: false, error } and never throws, so a scene only has to pick a message. The game does not need the server.
import { isRecord } from '../state/storage.ts';

export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 10;
export const REQUEST_TIMEOUT_MS = 5000;
const SERVER_PORT = 3000;
const NAME_FORMAT = /^[A-Z0-9]+( [A-Z0-9]+)*$/;

export interface BoardEntry {
    rank: number;
    name: string;
    stamps: number;
    tipsCents: number;
}

export interface Board {
    players: BoardEntry[];
    you: BoardEntry | null;
}

export interface Progress {
    stamps: number;
    tipsCents: number;
}

export interface Joined {
    token: string;
    you: BoardEntry;
}

// The first five come from the server (see PlayersController#error_code); the rest the client decides.
export type LeaderboardError =
    | 'name_taken' | 'name_not_allowed' | 'name_invalid' | 'bad_score' | 'unknown_player'
    | 'busy' | 'server' | 'offline';

export type Result<T> = { ok: true; value: T } | { ok: false; error: LeaderboardError };

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type NameProblem = 'too_short' | 'too_long' | 'bad_characters';

const SERVER_ERRORS: readonly LeaderboardError[] = ['name_taken', 'name_not_allowed', 'name_invalid', 'bad_score', 'unknown_player'];

// Same clean-up as Player#tidy_name on the server.
export function tidyName(name: string): string {
    return name.trim().replace(/ +/g, ' ').toUpperCase();
}

export function nameProblem(name: string): NameProblem | null {
    const tidy = tidyName(name);

    if (tidy.length < NAME_MIN_LENGTH) {
        return 'too_short';
    }
    if (tidy.length > NAME_MAX_LENGTH) {
        return 'too_long';
    }
    if (!NAME_FORMAT.test(tidy)) {
        return 'bad_characters';
    }
    return null;
}

// Without a configured address, assume the server runs on the same computer as the game's dev server,
// so a phone that opened the game by LAN address finds the server too.
export function leaderboardBaseUrl(location: Pick<Location, 'protocol' | 'hostname'>, configured: string | undefined): string {
    const base = configured?.trim() || `${location.protocol}//${location.hostname}:${SERVER_PORT}`;
    return base.replace(/\/+$/, '');
}

export class LeaderboardClient {
    private readonly baseUrl: string;
    private readonly fetchFn: FetchLike;
    private readonly timeoutMs: number;

    constructor(baseUrl: string, fetchFn: FetchLike = (url, init) => fetch(url, init), timeoutMs = REQUEST_TIMEOUT_MS) {
        this.baseUrl = baseUrl;
        this.fetchFn = fetchFn;
        this.timeoutMs = timeoutMs;
    }

    board(token: string | null): Promise<Result<Board>> {
        return this.request('GET', '/leaderboard', token, null, readBoard);
    }

    join(name: string, progress: Progress): Promise<Result<Joined>> {
        return this.request('POST', '/players', null, { name, ...progress }, readJoined);
    }

    submit(token: string, progress: Progress): Promise<Result<BoardEntry>> {
        return this.request('PATCH', '/players/me', token, progress, (body) => (isRecord(body) ? readEntry(body.you) : null));
    }

    private async request<T>(
        method: string, path: string, token: string | null, body: object | null, read: (body: unknown) => T | null
    ): Promise<Result<T>> {
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        if (body) {
            headers['Content-Type'] = 'application/json';
        }

        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), this.timeoutMs);

        try {
            const response = await this.fetchFn(`${this.baseUrl}${path}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: abort.signal
            });
            const parsed: unknown = await response.json().catch(() => null);

            if (!response.ok) {
                return { ok: false, error: errorFor(response.status, parsed) };
            }

            const value = read(parsed);
            return value === null ? { ok: false, error: 'server' } : { ok: true, value };
        } catch {
            return { ok: false, error: 'offline' };
        } finally {
            clearTimeout(timer);
        }
    }
}

export function leaderboardClient(): LeaderboardClient {
    return new LeaderboardClient(leaderboardBaseUrl(window.location, import.meta.env.VITE_LEADERBOARD_URL));
}

function errorFor(status: number, body: unknown): LeaderboardError {
    if (status === 401) {
        return 'unknown_player';
    }
    if (status === 429) {
        return 'busy';
    }

    const code = isRecord(body) ? body.error : null;
    return SERVER_ERRORS.find((known) => known === code) ?? 'server';
}

function readBoard(body: unknown): Board | null {
    if (!isRecord(body) || !Array.isArray(body.players)) {
        return null;
    }

    const players = body.players.map(readEntry);
    if (players.some((entry) => entry === null)) {
        return null;
    }

    return { players: players as BoardEntry[], you: readEntry(body.you) };
}

function readJoined(body: unknown): Joined | null {
    if (!isRecord(body) || typeof body.token !== 'string') {
        return null;
    }

    const you = readEntry(body.you);
    return you ? { token: body.token, you } : null;
}

function readEntry(value: unknown): BoardEntry | null {
    if (!isRecord(value)) {
        return null;
    }

    const { rank, name, stamps, tipsCents } = value;
    if (typeof rank !== 'number' || typeof name !== 'string' || typeof stamps !== 'number' || typeof tipsCents !== 'number') {
        return null;
    }

    return { rank, name, stamps, tipsCents };
}
