// Short on-screen messages for leaderboard errors and name problems. Each fits on one line of the screen.
import type { LeaderboardError, NameProblem } from './leaderboardClient.ts';

export const MESSAGE_MAX_LENGTH = 28;

const ERROR_MESSAGES: Record<LeaderboardError, string> = {
    name_taken: 'THAT NAME IS TAKEN',
    name_not_allowed: 'PLEASE PICK A NICER NAME',
    name_invalid: 'LETTERS AND NUMBERS ONLY',
    bad_score: 'THE BOARD SAID NO',
    unknown_player: 'PLEASE PICK A NAME AGAIN',
    busy: 'TOO MANY TRIES. WAIT A BIT.',
    server: 'SOMETHING WENT WRONG',
    offline: "CAN'T REACH THE BOARD"
};

const NAME_PROBLEM_MESSAGES: Record<NameProblem, string> = {
    too_short: 'AT LEAST 3 CHARACTERS',
    too_long: 'AT MOST 10 CHARACTERS',
    bad_characters: 'LETTERS AND NUMBERS ONLY'
};

export function errorMessage(error: LeaderboardError): string {
    return ERROR_MESSAGES[error];
}

export function nameProblemMessage(problem: NameProblem): string {
    return NAME_PROBLEM_MESSAGES[problem];
}
