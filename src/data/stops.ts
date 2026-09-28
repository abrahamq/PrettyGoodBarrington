// The eight Main Street Passport stops. This is the only file that names the real businesses:
// use plain-text names (never logos), and change a name here to change it everywhere.
// `sign` is the short name painted on the building's name board in the overworld.
// `minigame` is the Phaser scene key of the stop's minigame, or null while the stop is a "coming soon" stub.
// Streets are for the passport screen; the overworld map is stylized, not exact.

export const STOPS = [
    { id: 'soco', name: 'SoCo Creamery', sign: 'SOCO', street: 'Railroad St', minigame: 'ScoopStack' },
    { id: 'gbeats', name: 'GB Eats', sign: 'GB EATS', street: 'Main St', minigame: 'OrderUp' },
    { id: 'mahaiwe', name: 'Mahaiwe Performing Arts Center', sign: 'MAHAIWE', street: 'Castle St', minigame: 'CurtainCall' },
    { id: 'baba', name: "Baba Louie's", sign: "BABA LOUIE'S", street: 'Main St', minigame: null },
    { id: 'triplex', name: 'Triplex Cinema', sign: 'TRIPLEX', street: 'Railroad St', minigame: null },
    { id: 'coop', name: 'Berkshire Food Co-op', sign: 'CO-OP', street: 'Bridge St', minigame: null },
    { id: 'townhall', name: 'Town Hall', sign: 'TOWN HALL', street: 'Main St', minigame: null },
    { id: 'riverwalk', name: 'Housatonic River Walk', sign: 'RIVER WALK', street: 'River St', minigame: null }
] as const;

export type StopId = (typeof STOPS)[number]['id'];
export type Stop = (typeof STOPS)[number];

export function stopById(id: StopId): Stop {
    return STOPS.find((stop) => stop.id === id) as Stop;
}
