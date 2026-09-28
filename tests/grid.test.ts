// Checks grid movement helpers: which tiles are walkable, and shortest paths around blocked tiles.
import { describe, expect, it } from 'vitest';
import { directionBetween, findPath, isWalkable, makeGrid, neighbor } from '../src/logic/grid.ts';

// '#' is blocked, '.' is open.
function gridFrom(rows: string[]) {
    return makeGrid(rows[0].length, rows.length, (col, row) => rows[row][col] === '#');
}

describe('isWalkable', () => {
    const grid = gridFrom(['.#', '..']);

    it('is true for open tiles and false for blocked ones', () => {
        expect(isWalkable(grid, { col: 0, row: 0 })).toBe(true);
        expect(isWalkable(grid, { col: 1, row: 0 })).toBe(false);
    });

    it('is false outside the map', () => {
        expect(isWalkable(grid, { col: -1, row: 0 })).toBe(false);
        expect(isWalkable(grid, { col: 0, row: 2 })).toBe(false);
    });
});

describe('neighbor and directionBetween', () => {
    it('steps one tile in a direction', () => {
        expect(neighbor({ col: 3, row: 3 }, 'up')).toEqual({ col: 3, row: 2 });
        expect(neighbor({ col: 3, row: 3 }, 'left')).toEqual({ col: 2, row: 3 });
    });

    it('names the direction from one tile to the next', () => {
        expect(directionBetween({ col: 3, row: 3 }, { col: 3, row: 4 })).toBe('down');
        expect(directionBetween({ col: 3, row: 3 }, { col: 4, row: 3 })).toBe('right');
    });
});

describe('findPath', () => {
    it('walks a straight line, not counting the start tile', () => {
        const grid = gridFrom(['....']);

        expect(findPath(grid, { col: 0, row: 0 }, [{ col: 3, row: 0 }])).toEqual([
            { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 }
        ]);
    });

    it('goes around a wall', () => {
        const grid = gridFrom([
            '...',
            '.#.',
            '...'
        ]);
        const path = findPath(grid, { col: 1, row: 0 }, [{ col: 1, row: 2 }]);

        expect(path).toHaveLength(4);
        expect(path?.some((tile) => tile.col === 1 && tile.row === 1)).toBe(false);
        expect(path?.[path.length - 1]).toEqual({ col: 1, row: 2 });
    });

    it('returns an empty path when the start is already a goal', () => {
        expect(findPath(gridFrom(['..']), { col: 0, row: 0 }, [{ col: 0, row: 0 }])).toEqual([]);
    });

    it('returns null when no goal can be reached', () => {
        const grid = gridFrom(['.#.']);

        expect(findPath(grid, { col: 0, row: 0 }, [{ col: 2, row: 0 }])).toBeNull();
    });

    it('ignores blocked goals and picks the nearest open one', () => {
        const grid = gridFrom(['.....#']);
        const path = findPath(grid, { col: 0, row: 0 }, [{ col: 5, row: 0 }, { col: 4, row: 0 }, { col: 2, row: 0 }]);

        expect(path?.[path.length - 1]).toEqual({ col: 2, row: 0 });
    });
});
