// Checks the shared color palette: every color is a valid hex code, and names convert to Phaser color numbers.
import { describe, expect, it } from 'vitest';
import { PALETTE, colorNumber } from '../src/palette.js';

describe('PALETTE', () => {
    it('has 17 colors, each written as #rrggbb', () => {
        expect(Object.keys(PALETTE)).toHaveLength(17);

        for (const hex of Object.values(PALETTE)) {
            expect(hex).toMatch(/^#[0-9a-f]{6}$/);
        }
    });
});

describe('colorNumber', () => {
    it('turns a palette name into the number Phaser Graphics expects', () => {
        expect(colorNumber('ink')).toBe(0x2b2230);
        expect(colorNumber('sky')).toBe(0x6f9fd8);
    });

    it('throws on an unknown name, so typos fail loudly', () => {
        expect(() => colorNumber('purple')).toThrow('Unknown palette color: purple');
    });
});
