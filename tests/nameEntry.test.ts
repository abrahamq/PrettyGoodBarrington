// Checks the arcade name picker: typing rules and moving the cursor around the letter grid.
import { describe, expect, it } from 'vitest';
import { GRID_COLUMNS, GRID_ROWS, NAME_GRID, cellAt, deleteChar, moveCursor, typeChar } from '../src/logic/nameEntry.ts';

describe('typeChar', () => {
    it('adds letters and digits, in capitals, up to ten characters', () => {
        expect(typeChar('AB', 'e')).toBe('ABE');
        expect(typeChar('ABE', '7')).toBe('ABE7');
        expect(typeChar('ABCDEFGHIJ', 'K')).toBe('ABCDEFGHIJ');
    });

    it('allows one space between words, but not at the start', () => {
        expect(typeChar('ABE', ' ')).toBe('ABE ');
        expect(typeChar('ABE ', ' ')).toBe('ABE ');
        expect(typeChar('', ' ')).toBe('');
    });

    it('ignores characters that are not on the grid', () => {
        expect(typeChar('ABE', '!')).toBe('ABE');
        expect(typeChar('ABE', 'é')).toBe('ABE');
    });
});

describe('deleteChar', () => {
    it('removes the last character', () => {
        expect(deleteChar('ABE')).toBe('AB');
        expect(deleteChar('')).toBe('');
    });
});

describe('NAME_GRID', () => {
    it('has every letter and digit once, plus SPACE, DEL, BACK, and OK', () => {
        const typed = NAME_GRID.filter((cell) => cell.action === 'type').map((cell) => cell.label).sort().join('');
        const actions = NAME_GRID.filter((cell) => cell.action !== 'type').map((cell) => cell.label);

        expect(typed).toBe('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        expect(actions).toEqual(['SPACE', 'DEL', 'BACK', 'OK']);
    });

    it('covers each grid square exactly once', () => {
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLUMNS; col++) {
                const covering = NAME_GRID.filter((cell) => cell.row === row && col >= cell.col && col < cell.col + cell.span);
                expect(covering).toHaveLength(1);
            }
        }
    });
});

describe('moveCursor', () => {
    it('moves left and right one cell, wrapping at the edges', () => {
        expect(cellAt(moveCursor({ row: 0, col: 0 }, 1, 0)).label).toBe('B');
        expect(cellAt(moveCursor({ row: 0, col: 0 }, -1, 0)).label).toBe('I');
        expect(cellAt(moveCursor({ row: 4, col: 0 }, 1, 0)).label).toBe('DEL');
        expect(cellAt(moveCursor({ row: 4, col: 8 }, 1, 0)).label).toBe('SPACE');
    });

    it('moves up and down in the same column, landing on the wide button that covers it', () => {
        expect(cellAt(moveCursor({ row: 3, col: 8 }, 0, 1)).label).toBe('OK');
        expect(cellAt(moveCursor(moveCursor({ row: 3, col: 8 }, 0, 1), 0, -1)).label).toBe('9');
        expect(cellAt(moveCursor({ row: 0, col: 2 }, 0, -1)).label).toBe('SPACE');
    });
});
