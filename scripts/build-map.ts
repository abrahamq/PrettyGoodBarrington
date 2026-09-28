// Writes the overworld map files. Run it with `npm run build:map` after changing src/map/downtown.ts
// or src/map/tileset.ts:
//   public/maps/downtown.json  the map, in Tiled's JSON format
//   public/maps/tiles.png      the tileset image, so Tiled can show the tiles
// It overwrites both files, so edits made in Tiled are lost.
import { writeFileSync } from 'node:fs';
import { createPixelBuffer, pixelBufferTarget } from '../src/art/pixelBuffer.ts';
import { MAP_HEIGHT, MAP_WIDTH, buildDowntownMap } from '../src/map/downtown.ts';
import { TILESET_HEIGHT, TILESET_WIDTH, drawTileset } from '../src/map/tileset.ts';
import { encodePng } from './png.ts';

const MAP_PATH = 'public/maps/downtown.json';
const TILESET_PATH = 'public/maps/tiles.png';

// Puts each tile-data array on one line, the way Tiled saves it, so git diffs stay short.
function collapseNumberArrays(json: string): string {
    return json.replace(/\[\s*([\d,\s]+?)\s*\]/g, (_match, numbers: string) => `[${numbers.replace(/\s+/g, '')}]`);
}

const map = buildDowntownMap();
writeFileSync(MAP_PATH, `${collapseNumberArrays(JSON.stringify(map, null, 2))}\n`);

const sheet = createPixelBuffer(TILESET_WIDTH, TILESET_HEIGHT);
drawTileset(pixelBufferTarget(sheet));
writeFileSync(TILESET_PATH, encodePng(sheet));

console.log(`Wrote ${MAP_PATH} (${MAP_WIDTH}x${MAP_HEIGHT} tiles) and ${TILESET_PATH} (${TILESET_WIDTH}x${TILESET_HEIGHT} pixels)`);
