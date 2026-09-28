// Checks how the game reads a Tiled map: blocked tiles, doors and NPCs, street zones, and the start point.
import { describe, expect, it } from 'vitest';
import { isWalkable } from '../src/logic/grid.ts';
import { interactableAt, readMap, zoneLabelAt, type TiledMap, type TiledProperty } from '../src/map/tiled.ts';

// A 4x3 map. Tile 1 blocks and tile 2 does not. The decor layer never blocks.
function tinyMap(): TiledMap {
    return {
        type: 'map', version: '1.10', tiledversion: '1.11.2', orientation: 'orthogonal', renderorder: 'right-down',
        infinite: false, compressionlevel: -1, width: 4, height: 3, tilewidth: 16, tileheight: 16,
        nextlayerid: 7, nextobjectid: 10,
        tilesets: [{
            firstgid: 1, name: 'tiles', image: 'tiles.png', imagewidth: 32, imageheight: 16,
            tilewidth: 16, tileheight: 16, columns: 2, tilecount: 2, margin: 0, spacing: 0,
            tiles: [
                { id: 0, properties: [{ name: 'blocks', type: 'bool', value: true }] },
                { id: 1, properties: [{ name: 'blocks', type: 'bool', value: false }] }
            ]
        }],
        layers: [
            tileLayer(1, 'ground', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]),
            tileLayer(2, 'buildings', [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
            tileLayer(3, 'decor', [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0]),
            {
                id: 4, name: 'interactables', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true,
                objects: [
                    object(1, 'door', 0, 0, 32, 16, [{ name: 'stopId', type: 'string', value: 'soco' }, { name: 'npc', type: 'string', value: 'npc-scooper' }]),
                    object(2, 'npc', 48, 32, 16, 16, [{ name: 'npc', type: 'string', value: 'npc-dog' }, { name: 'dialogueId', type: 'string', value: 'dog' }]),
                    object(3, 'spawn', 16, 16, 16, 16, [])
                ]
            },
            {
                id: 5, name: 'zones', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true,
                objects: [
                    { ...object(4, 'zone', 0, 0, 32, 48, []), name: 'RAILROAD ST' },
                    { ...object(5, 'zone', 0, 0, 64, 48, []), name: 'MAIN ST' }
                ]
            }
        ]
    };
}

function tileLayer(id: number, name: string, data: number[]) {
    return { id, name, type: 'tilelayer' as const, x: 0, y: 0, width: 4, height: 3, opacity: 1, visible: true, data };
}

function object(id: number, type: string, x: number, y: number, width: number, height: number, properties: TiledProperty[]) {
    return { id, name: '', type, x, y, width, height, rotation: 0, visible: true, properties };
}

describe('readMap', () => {
    const info = readMap(tinyMap());

    it('blocks tiles whose tileset entry says blocks, but not decor tiles', () => {
        expect(isWalkable(info.grid, { col: 0, row: 0 })).toBe(false);
        expect(isWalkable(info.grid, { col: 2, row: 0 })).toBe(true);
        expect(isWalkable(info.grid, { col: 3, row: 1 })).toBe(true);
    });

    it('blocks the tile an NPC stands on', () => {
        expect(isWalkable(info.grid, { col: 3, row: 2 })).toBe(false);
    });

    it('reads doors and NPCs with their properties, in tiles', () => {
        expect(interactableAt(info, { col: 1, row: 0 })).toMatchObject({
            kind: 'door', col: 0, row: 0, width: 2, height: 1, stopId: 'soco', npc: 'npc-scooper'
        });
        expect(interactableAt(info, { col: 3, row: 2 })).toMatchObject({ kind: 'npc', dialogueId: 'dog', npc: 'npc-dog' });
        expect(interactableAt(info, { col: 2, row: 2 })).toBeUndefined();
    });

    it('reads the start point', () => {
        expect(info.spawn).toEqual({ col: 1, row: 1 });
    });

    it('names the street zone, using the first zone that matches', () => {
        expect(zoneLabelAt(info, { col: 1, row: 2 })).toBe('RAILROAD ST');
        expect(zoneLabelAt(info, { col: 3, row: 0 })).toBe('MAIN ST');
    });
});
