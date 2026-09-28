// The game's 17-color palette. Use these names everywhere instead of hard-coded hex values.

export const PALETTE = Object.freeze({
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
});

// Phaser Graphics methods (fillStyle, lineStyle) take numbers like 0x2b2230,
// while text styles take '#2b2230' strings.
export function colorNumber(name) {
    const hex = PALETTE[name];

    if (!hex) {
        throw new Error(`Unknown palette color: ${name}`);
    }

    return parseInt(hex.slice(1), 16);
}
