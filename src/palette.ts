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
    laneLine: '#f2c94c',
    goldenTint: '#f2963c',
    nightTint: '#1c1850',

    // Overworld ground, from docs/mocks/Overworld.dc.html
    grassLight: '#98cd6c',
    paverJoint: '#c2ab7f',
    asphaltSpeck: '#615e6e',
    curbStone: '#8e8a7a',
    waterLight: '#a9c9ee',
    waterDeep: '#5a86c0',
    plank: '#b07a35',

    // Overworld buildings
    brickMortar: '#8f3f2c',
    shinglePurple: '#5b4a6e',
    shinglePurpleLine: '#4a3b5b',
    shingleRed: '#9a4040',
    shingleRedLine: '#7a2f30',
    roofRedEdge: '#5a1f22',
    shingleTeal: '#4a7b8c',
    shingleTealLine: '#386473',
    roofTealEdge: '#2c4f5a',
    shingleGreen: '#5e8a4a',
    shingleGreenLine: '#4a7039',
    facadeCream: '#e8d9b5',
    facadePink: '#f3c6c8',
    facadeSage: '#a7c49a',
    facadeSageLine: '#8fae82',
    facadeNavy: '#3d4f7a',
    facadeNavyLine: '#34446a',
    facadeMustard: '#e0a040',
    facadeMustardLine: '#c98d33',
    whiteCream: '#fff7ea',
    glassShine: '#cfe6f5',
    signGreen: '#2f7a4f',
    ochre: '#d9a45b',

    // Overworld plants and props
    leaf: '#4e8a36',
    leafLight: '#6fae4f',
    leafDark: '#3a6b28',
    bark: '#6b3e22',
    carBlue: '#4b6fb5',
    carBlueDark: '#3d5a96',
    glassLight: '#bfe3ef',

    // People
    skinLight: '#f1c27d',
    skinTan: '#c68642',
    skinDeep: '#8d5a3b',
    hairBrown: '#5a3a22',
    hairGray: '#a09aa6',
    shirtOlive: '#6b8f3a',
    mintLight: '#a8e0c8'
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
