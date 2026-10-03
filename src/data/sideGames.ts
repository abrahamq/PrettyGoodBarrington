// Side games: minigames that are not passport stops. They earn no stamp and do not count toward the leaderboard,
// but the save keeps each one's best score.
// `scene` is the Phaser scene key of the minigame. A finished round scoring `greatScore` or more gets the
// script's "great" ending (src/data/dialogue.ts).

export const SIDE_GAMES = {
    hedgeTrim: { name: 'Trim the GB', scene: 'HedgeTrim', greatScore: 1000 }
} as const;

export type SideGameId = keyof typeof SIDE_GAMES;

export const SIDE_GAME_IDS = Object.keys(SIDE_GAMES) as SideGameId[];

export function isSideGameId(value: unknown): value is SideGameId {
    return SIDE_GAME_IDS.includes(value as SideGameId);
}
