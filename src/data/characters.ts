// The three boys the player can pick on the Character Select screen, youngest first.
// The pick changes only the walking sprite; it is stored in the save.

export const CHARACTER_IDS = ['five', 'eleven', 'fifteen'] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];

// Saves made before the select screen existed load as this boy.
export const DEFAULT_CHARACTER: CharacterId = 'eleven';

export function isCharacterId(value: unknown): value is CharacterId {
    return CHARACTER_IDS.includes(value as CharacterId);
}
