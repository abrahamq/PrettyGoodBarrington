// Checks that every leaderboard message exists and fits on one line of the 240-pixel screen.
import { describe, expect, it } from 'vitest';
import { MESSAGE_MAX_LENGTH, errorMessage, nameProblemMessage } from '../src/net/leaderboardMessages.ts';
import type { LeaderboardError, NameProblem } from '../src/net/leaderboardClient.ts';

const ERRORS: LeaderboardError[] = [
    'name_taken', 'name_not_allowed', 'name_invalid', 'bad_score', 'unknown_player', 'busy', 'server', 'offline'
];
const NAME_PROBLEMS: NameProblem[] = ['too_short', 'too_long', 'bad_characters'];

describe('leaderboard messages', () => {
    it('fit on one line, in characters the pixel font has', () => {
        const messages = [...ERRORS.map(errorMessage), ...NAME_PROBLEMS.map(nameProblemMessage)];

        for (const message of messages) {
            expect(message.length).toBeGreaterThan(0);
            expect(message.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);
            expect(message).toMatch(/^[A-Z0-9 .,!?'#-]+$/);
        }
    });

    it('says CAN\'T REACH THE BOARD when the server is down', () => {
        expect(errorMessage('offline')).toBe("CAN'T REACH THE BOARD");
    });
});
