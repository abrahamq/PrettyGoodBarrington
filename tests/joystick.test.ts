// Checks how a thumb's offset from the joystick's center becomes a walking direction and a knob position.
import { describe, expect, it } from 'vitest';
import { knobOffset, stickDirection } from '../src/logic/joystick.ts';

describe('stickDirection', () => {
    it('is null inside the 4-pixel dead zone', () => {
        expect(stickDirection(0, 0, null)).toBeNull();
        expect(stickDirection(3, 0, null)).toBeNull();
        expect(stickDirection(2, 3, null)).toBeNull();
    });

    it('points the way the thumb pushes', () => {
        expect(stickDirection(10, 0, null)).toBe('right');
        expect(stickDirection(-10, 0, null)).toBe('left');
        expect(stickDirection(0, 10, null)).toBe('down');
        expect(stickDirection(0, -10, null)).toBe('up');
    });

    it('picks the bigger axis when nothing is held', () => {
        expect(stickDirection(10, 9, null)).toBe('right');
        expect(stickDirection(9, 10, null)).toBe('down');
    });

    it('keeps the current axis until the other one is 25% bigger', () => {
        expect(stickDirection(10, 12, 'right')).toBe('right');
        expect(stickDirection(10, 13, 'right')).toBe('down');
        expect(stickDirection(12, 10, 'down')).toBe('down');
        expect(stickDirection(13, 10, 'down')).toBe('right');
    });

    it('turns around on the same axis at once', () => {
        expect(stickDirection(-10, 0, 'right')).toBe('left');
    });

    it('lets go when the thumb comes back to the middle', () => {
        expect(stickDirection(1, 1, 'up')).toBeNull();
    });
});

describe('knobOffset', () => {
    it('follows the thumb inside the ring', () => {
        expect(knobOffset(3, -4, 11)).toEqual({ x: 3, y: -4 });
    });

    it('stops at the edge of the ring, on whole pixels', () => {
        expect(knobOffset(30, 0, 11)).toEqual({ x: 11, y: 0 });
        expect(knobOffset(30, 40, 11)).toEqual({ x: 6, y: 8 });
    });
});
