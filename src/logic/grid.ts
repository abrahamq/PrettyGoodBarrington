// Grid helpers for tile-by-tile movement: which tiles are walkable, stepping in a direction,
// and the shortest path to a goal (breadth-first search) that goes around blocked tiles.

export interface Tile {
    col: number;
    row: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Grid {
    width: number;
    height: number;
    blocked: boolean[];
}

const STEPS: Record<Direction, Tile> = {
    up: { col: 0, row: -1 },
    down: { col: 0, row: 1 },
    left: { col: -1, row: 0 },
    right: { col: 1, row: 0 }
};

export const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

export function makeGrid(width: number, height: number, isBlocked: (col: number, row: number) => boolean): Grid {
    const blocked: boolean[] = [];

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            blocked.push(isBlocked(col, row));
        }
    }

    return { width, height, blocked };
}

export function isInside(grid: Grid, tile: Tile): boolean {
    return tile.col >= 0 && tile.row >= 0 && tile.col < grid.width && tile.row < grid.height;
}

export function isWalkable(grid: Grid, tile: Tile): boolean {
    return isInside(grid, tile) && !grid.blocked[tile.row * grid.width + tile.col];
}

export function setBlocked(grid: Grid, tile: Tile, blocked: boolean): void {
    if (isInside(grid, tile)) {
        grid.blocked[tile.row * grid.width + tile.col] = blocked;
    }
}

export function neighbor(tile: Tile, direction: Direction): Tile {
    const step = STEPS[direction];
    return { col: tile.col + step.col, row: tile.row + step.row };
}

export function sameTile(a: Tile, b: Tile): boolean {
    return a.col === b.col && a.row === b.row;
}

// Only for tiles that are next to each other.
export function directionBetween(from: Tile, to: Tile): Direction {
    if (to.col > from.col) {
        return 'right';
    }
    if (to.col < from.col) {
        return 'left';
    }
    return to.row > from.row ? 'down' : 'up';
}

// Returns the tiles to walk through, ending on the nearest walkable goal and not including `start`.
// Returns [] when `start` is already a goal, and null when no goal can be reached.
export function findPath(grid: Grid, start: Tile, goals: Tile[]): Tile[] | null {
    const isGoal = (tile: Tile) => goals.some((goal) => sameTile(goal, tile) && isWalkable(grid, goal));

    if (isGoal(start)) {
        return [];
    }

    const cameFrom = new Map<number, number>();
    const startKey = keyOf(grid, start);
    const queue: Tile[] = [start];
    cameFrom.set(startKey, startKey);

    while (queue.length > 0) {
        const current = queue.shift() as Tile;

        for (const direction of DIRECTIONS) {
            const next = neighbor(current, direction);
            const nextKey = keyOf(grid, next);

            if (!isWalkable(grid, next) || cameFrom.has(nextKey)) {
                continue;
            }

            cameFrom.set(nextKey, keyOf(grid, current));

            if (isGoal(next)) {
                return tracePath(grid, cameFrom, startKey, nextKey);
            }

            queue.push(next);
        }
    }

    return null;
}

function keyOf(grid: Grid, tile: Tile): number {
    return tile.row * grid.width + tile.col;
}

function tracePath(grid: Grid, cameFrom: Map<number, number>, startKey: number, endKey: number): Tile[] {
    const path: Tile[] = [];

    for (let key = endKey; key !== startKey; key = cameFrom.get(key) as number) {
        path.unshift({ col: key % grid.width, row: Math.floor(key / grid.width) });
    }

    return path;
}
