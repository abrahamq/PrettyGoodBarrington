// The eight Main Street Passport stops. This is the only file that names the real businesses:
// use plain-text names (never logos), and change a name here to change it everywhere.
// `minigame` is the Phaser scene key of the stop's minigame, or null while the stop is a "coming soon" stub.
// Streets are for the passport screen; the overworld map is stylized, not exact.

export const STOPS = [
    { id: 'soco', name: 'SoCo Creamery', street: 'Railroad St', minigame: 'ScoopStack' },
    { id: 'gbeats', name: 'GB Eats', street: 'Main St', minigame: 'OrderUp' },
    { id: 'mahaiwe', name: 'Mahaiwe Performing Arts Center', street: 'Castle St', minigame: 'CurtainCall' },
    { id: 'baba', name: "Baba Louie's", street: 'Main St', minigame: null },
    { id: 'triplex', name: 'Triplex Cinema', street: 'Railroad St', minigame: null },
    { id: 'coop', name: 'Berkshire Food Co-op', street: 'Bridge St', minigame: null },
    { id: 'townhall', name: 'Town Hall', street: 'Main St', minigame: null },
    { id: 'riverwalk', name: 'Housatonic River Walk', street: 'River St', minigame: null }
] as const;

export type StopId = (typeof STOPS)[number]['id'];
