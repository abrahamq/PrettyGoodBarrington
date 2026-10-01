// The arcade-style name picker: a 9-column grid of letters and digits with SPACE, DEL, BACK, and OK
// buttons on the bottom row, plus the typing rules. The NameEntry scene draws this grid.
import { NAME_MAX_LENGTH } from '../net/leaderboardClient.ts';

export const GRID_COLUMNS = 9;
export const GRID_ROWS = 5;

export type GridAction = 'type' | 'space' | 'delete' | 'back' | 'ok';

export interface GridCell {
    row: number;
    col: number;
    span: number;
    label: string;
    action: GridAction;
}

export interface GridCursor {
    row: number;
    col: number;
}

const CHARACTER_ROWS = ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ0', '123456789'];

export const NAME_GRID: GridCell[] = [
    ...CHARACTER_ROWS.flatMap((chars, row) =>
        [...chars].map((char, col): GridCell => ({ row, col, span: 1, label: char, action: 'type' }))
    ),
    { row: 4, col: 0, span: 3, label: 'SPACE', action: 'space' },
    { row: 4, col: 3, span: 2, label: 'DEL', action: 'delete' },
    { row: 4, col: 5, span: 2, label: 'BACK', action: 'back' },
    { row: 4, col: 7, span: 2, label: 'OK', action: 'ok' }
];

export function cellAt(cursor: GridCursor): GridCell {
    const cell = NAME_GRID.find((each) =>
        each.row === cursor.row && cursor.col >= each.col && cursor.col < each.col + each.span
    );

    if (!cell) {
        throw new Error(`No grid cell at row ${cursor.row}, column ${cursor.col}`);
    }
    return cell;
}

// Left and right step a whole cell. Up and down keep the column, so going down from 9 and back up returns to 9.
export function moveCursor(cursor: GridCursor, dx: -1 | 0 | 1, dy: -1 | 0 | 1): GridCursor {
    if (dy !== 0) {
        return { row: wrap(cursor.row + dy, GRID_ROWS), col: cursor.col };
    }

    const cell = cellAt(cursor);
    if (dx > 0) {
        return { row: cursor.row, col: wrap(cell.col + cell.span, GRID_COLUMNS) };
    }
    if (dx < 0) {
        return { row: cursor.row, col: wrap(cell.col - 1, GRID_COLUMNS) };
    }
    return cursor;
}

export function typeChar(name: string, char: string): string {
    const upper = char.toUpperCase();

    if (name.length >= NAME_MAX_LENGTH) {
        return name;
    }
    if (upper === ' ') {
        return name === '' || name.endsWith(' ') ? name : `${name} `;
    }
    return /^[A-Z0-9]$/.test(upper) ? name + upper : name;
}

export function deleteChar(name: string): string {
    return name.slice(0, -1);
}

function wrap(value: number, count: number): number {
    return ((value % count) + count) % count;
}
