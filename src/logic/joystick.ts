// Turns a thumb's offset from the joystick's center into one of the four grid directions, and places the knob.
import type { Direction } from './grid.ts';

export const STICK = { deadZone: 4, switchRatio: 1.25 };

export function stickDirection(dx: number, dy: number, current: Direction | null): Direction | null {
    const across = Math.abs(dx);
    const along = Math.abs(dy);

    if (Math.hypot(dx, dy) < STICK.deadZone) {
        return null;
    }

    let horizontal = across > along;
    if (current === 'left' || current === 'right') {
        horizontal = along <= across * STICK.switchRatio;
    } else if (current === 'up' || current === 'down') {
        horizontal = across > along * STICK.switchRatio;
    }

    if (horizontal) {
        return dx < 0 ? 'left' : 'right';
    }
    return dy < 0 ? 'up' : 'down';
}

export function knobOffset(dx: number, dy: number, travel: number): { x: number; y: number } {
    const scale = Math.min(1, travel / (Math.hypot(dx, dy) || 1));
    return { x: Math.trunc(dx * scale), y: Math.trunc(dy * scale) };
}
