// Checks the generated downtown map: its size and layers, that every stop can be reached on foot
// from the start point, and that every place the player can stand has a street name.
import { describe, expect, it } from 'vitest';
import { JACK, NPC_KEYS } from '../src/art/people.ts';
import { LINES } from '../src/data/dialogue.ts';
import { STOPS } from '../src/data/stops.ts';
import { DIRECTIONS, findPath, isWalkable, neighbor, type Tile } from '../src/logic/grid.ts';
import { buildDowntownMap } from '../src/map/downtown.ts';
import { readMap, zoneLabelAt } from '../src/map/tiled.ts';

const map = buildDowntownMap();
const info = readMap(map);

function standingSpots(target: { col: number; row: number; width: number; height: number }): Tile[] {
    const spots: Tile[] = [];

    for (let row = target.row; row < target.row + target.height; row++) {
        for (let col = target.col; col < target.col + target.width; col++) {
            for (const direction of DIRECTIONS) {
                spots.push(neighbor({ col, row }, direction));
            }
        }
    }

    return spots;
}

describe('buildDowntownMap', () => {
    it('is 60x24 tiles of 16 pixels', () => {
        expect([map.width, map.height, map.tilewidth, map.tileheight]).toEqual([60, 24, 16, 16]);
    });

    it('has the planned layers', () => {
        expect(map.layers.map((layer) => layer.name)).toEqual(['ground', 'buildings', 'decor', 'interactables', 'zones', 'labels']);
    });

    it('starts the player on a walkable tile', () => {
        expect(isWalkable(info.grid, info.spawn)).toBe(true);
    });

    it('has exactly one interactable for each stop', () => {
        for (const stop of STOPS) {
            const matches = info.interactables.filter((item) => item.stopId === stop.id);
            expect(matches, stop.id).toHaveLength(1);
        }
    });

    it('lets the player walk up to every door, NPC, and sign from the start', () => {
        for (const item of info.interactables) {
            const path = findPath(info.grid, info.spawn, standingSpots(item));
            expect(path, `${item.kind} at ${item.col},${item.row}`).not.toBeNull();
        }
    });

    it('opens every door onto the tile below it', () => {
        for (const door of info.interactables.filter((item) => item.kind === 'door')) {
            expect(isWalkable(info.grid, { col: door.col, row: door.row + 1 })).toBe(true);
        }
    });

    it('gives every walkable tile a street name', () => {
        for (let row = 0; row < info.height; row++) {
            for (let col = 0; col < info.width; col++) {
                if (isWalkable(info.grid, { col, row })) {
                    expect(zoneLabelAt(info, { col, row }), `${col},${row}`).not.toBe('');
                }
            }
        }
    });

    it('only uses NPC textures and dialogue lines that exist', () => {
        for (const item of info.interactables) {
            if (item.npc) {
                expect([...NPC_KEYS, JACK.key]).toContain(item.npc);
            }
            if (item.dialogueId) {
                expect(Object.keys(LINES)).toContain(item.dialogueId);
            }
        }
    });

    it('puts Jack and his side game at the east edge of the map', () => {
        const jack = info.interactables.find((item) => item.npc === JACK.key);

        expect(jack?.sideGameId).toBe('hedgeTrim');
        expect(jack?.col).toBeGreaterThanOrEqual(info.width - 2);
    });

    it('puts a name board on every building stop', () => {
        const boards = info.nameplates.map((plate) => plate.stopId);

        expect(boards.sort()).toEqual(['baba', 'coop', 'gbeats', 'mahaiwe', 'soco', 'townhall', 'triplex']);
    });
});
