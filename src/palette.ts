// The game's colors. Use these names everywhere instead of hard-coded hex values.
// PALETTE is the 17-color core palette from the plan. SCENERY holds the extra shades
// the mockups use for backdrops (the title screen's sunset, mountains, and skyline).

export const PALETTE = {
    ink: '#2b2230',
    cream: '#f4ecd6',
    parchment: '#e7d3a1',
    wood: '#8a5a2b',
    brick: '#b5553c',
    brickDark: '#7d3326',
    gold: '#f7d58c',
    amber: '#f2b84b',
    teal: '#3f8f7a',
    mint: '#6cc3a0',
    pink: '#f29bab',
    red: '#9b2d30',
    grass: '#7bb454',
    grassDark: '#5e9a40',
    road: '#6d6a7a',
    paver: '#dcc9a0',
    sky: '#6f9fd8'
} as const;

export const SCENERY = {
    duskTop: '#4c5a9a',
    duskHigh: '#6f6aa8',
    duskMid: '#b27fa6',
    duskLow: '#e39a8a',
    duskGlow: '#f4bf7c',
    sunlight: '#fbe3a0',
    mountainFar: '#8a6f9e',
    mountainNear: '#5a4f7e',
    mountainMist: '#7a6b9a',
    treeline: '#3a5a4f',
    skyline: '#3b2f4a',
    awning: '#d9534f',
    lawn: '#2f4a2e',
    lawnDark: '#243a24',
    curb: '#6b5f5a',
    asphaltDusk: '#4a4452',
    laneLine: '#f2c94c'
} as const;

const COLORS = { ...PALETTE, ...SCENERY };

export type ColorName = keyof typeof COLORS;

export function colorHex(name: ColorName): string {
    return COLORS[name];
}

// Phaser Graphics methods (fillStyle, lineStyle) take numbers like 0x2b2230,
// while text styles take '#2b2230' strings.
// The runtime check still matters for names that come from JSON data, which TypeScript cannot see.
export function colorNumber(name: ColorName): number {
    const hex = COLORS[name];

    if (!hex) {
        throw new Error(`Unknown palette color: ${name}`);
    }

    return parseInt(hex.slice(1), 16);
}
