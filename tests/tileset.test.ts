// Checks the overworld tileset: names, which tiles block movement, and that each tile paints only its own cell.
import { describe, expect, it } from 'vitest';
import { createPixelBuffer, pixelAt, pixelBufferTarget } from '../src/art/pixelBuffer.ts';
import { TILE_ART, TILE_NAMES, TILESET_COLUMNS, TILESET_HEIGHT, TILESET_WIDTH, drawTileset, tileGid, tilesetForMap } from '../src/map/tileset.ts';

describe('tile names', () => {
    it('fits in the 8-column sheet with no repeats', () => {
        expect(new Set(TILE_NAMES).size).toBe(TILE_NAMES.length);
        expect(TILESET_WIDTH).toBe(TILESET_COLUMNS * 16);
        expect(TILESET_HEIGHT).toBe(Math.ceil(TILE_NAMES.length / TILESET_COLUMNS) * 16);
    });

    it('numbers tiles from 1, the way Tiled does (0 means empty)', () => {
        expect(tileGid(TILE_NAMES[0])).toBe(1);
        expect(tileGid('road')).toBe(TILE_NAMES.indexOf('road') + 1);
    });
});

describe('blocking', () => {
    it('blocks water, walls, and roofs', () => {
        expect(TILE_ART.water.blocks).toBe(true);
        expect(TILE_ART.wallBrick.blocks).toBe(true);
        expect(TILE_ART.roofRed.blocks).toBe(true);
    });

    it('lets the player walk on grass, sidewalks, roads, and boardwalks', () => {
        for (const name of ['grass', 'paver', 'road', 'crosswalkWest', 'boardwalk'] as const) {
            expect(TILE_ART[name].blocks).toBe(false);
        }
    });

    it('puts the blocking flag in the Tiled tileset, so it survives edits in Tiled', () => {
        const tileset = tilesetForMap();
        const water = tileset.tiles.find((tile) => tile.id === tileGid('water') - 1);

        expect(water?.properties).toEqual([{ name: 'blocks', type: 'bool', value: true }]);
        expect(tileset.tilecount).toBe(TILE_NAMES.length);
    });
});

describe('drawTileset', () => {
    it('never paints across a cell border', () => {
        const rects: number[][] = [];
        drawTileset({ fillRect: (x, y, width, height) => rects.push([x, y, width, height]) });

        for (const [x, y, width, height] of rects) {
            expect(Math.floor(x / 16)).toBe(Math.floor((x + width - 1) / 16));
            expect(Math.floor(y / 16)).toBe(Math.floor((y + height - 1) / 16));
        }
    });

    it('paints the grass tile in the grass color', () => {
        const sheet = createPixelBuffer(TILESET_WIDTH, TILESET_HEIGHT);
        drawTileset(pixelBufferTarget(sheet));
        const index = tileGid('grass') - 1;
        const x = (index % TILESET_COLUMNS) * 16;
        const y = Math.floor(index / TILESET_COLUMNS) * 16;

        expect(pixelAt(sheet, x, y)).toEqual([0x7b, 0xb4, 0x54, 255]);
    });
});
