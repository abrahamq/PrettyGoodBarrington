// Checks how wide the game view gets on different screens: always 160 tall, 240 to 384 wide.
import { describe, expect, it } from 'vitest';
import { GAME_WIDTH, MAX_VIEW_WIDTH, viewWidthFor } from '../src/layout.ts';

describe('viewWidthFor', () => {
    it('widens the view to match a wide landscape screen, like an iPhone 13', () => {
        expect(viewWidthFor(844, 390)).toBe(346);
        expect(viewWidthFor(750, 340)).toBe(352);
        expect(viewWidthFor(1920, 1080)).toBe(284);
    });

    it('keeps the base 240 width on 3:2 screens and on narrower ones', () => {
        expect(viewWidthFor(960, 640)).toBe(GAME_WIDTH);
        expect(viewWidthFor(1024, 768)).toBe(GAME_WIDTH);
        expect(viewWidthFor(390, 844)).toBe(GAME_WIDTH);
    });

    it('stops widening at the widest backgrounds', () => {
        expect(viewWidthFor(3440, 1000)).toBe(MAX_VIEW_WIDTH);
    });

    it('always returns an even width, so the centered stage starts on a whole pixel', () => {
        expect(viewWidthFor(2560, 1080) % 2).toBe(0);
        expect(viewWidthFor(1001, 500) % 2).toBe(0);
    });

    it('falls back to the base width before the page has a size', () => {
        expect(viewWidthFor(0, 0)).toBe(GAME_WIDTH);
    });
});
