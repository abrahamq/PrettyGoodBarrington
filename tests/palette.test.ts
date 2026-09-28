// Checks the shared color palette: every color is a valid hex code, and names convert to Phaser color numbers.
import { describe, expect, it } from 'vitest';
import { PALETTE, SCENERY, colorNumber } from '../src/palette.ts';

describe('PALETTE', () => {
    it('has 17 colors, each written as #rrggbb', () => {
        expect(Object.keys(PALETTE)).toHaveLength(17);

        for (const hex of Object.values(PALETTE)) {
            expect(hex).toMatch(/^#[0-9a-f]{6}$/);
        }
    });
});

describe('SCENERY', () => {
    it('writes each color as #rrggbb', () => {
        for (const hex of Object.values(SCENERY)) {
            expect(hex).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it('does not reuse a PALETTE name', () => {
        const shared = Object.keys(SCENERY).filter((name) => name in PALETTE);

        expect(shared).toEqual([]);
    });
});

describe('colorNumber', () => {
    it('turns a palette name into the number Phaser Graphics expects', () => {
        expect(colorNumber('ink')).toBe(0x2b2230);
        expect(colorNumber('sky')).toBe(0x6f9fd8);
    });

    it('also knows the SCENERY colors', () => {
        expect(colorNumber('duskTop')).toBe(0x4c5a9a);
    });

    it('throws on an unknown name, so typos in JSON data fail loudly', () => {
        // @ts-expect-error: TypeScript also rejects this name at compile time.
        expect(() => colorNumber('purple')).toThrow('Unknown palette color: purple');
    });
});
